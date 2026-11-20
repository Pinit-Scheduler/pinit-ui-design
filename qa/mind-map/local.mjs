import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 마인드맵 화면 확인. 모든 응답은 개발 서버의 내장 mock(VITE_USE_MOCK_API, src/mocks/mindMap.ts)이 만든다.
// QA_ORIGIN을 주면(예: `npm start`의 http://127.0.0.1:4173) 서버를 띄우지 않고 그 주소를 쓴다.
process.env.VITE_USE_MOCK_API = 'true'
const { chromium } = createRequire(import.meta.url)('playwright')

const port = 5198
const origin = process.env.QA_ORIGIN ?? `http://127.0.0.1:${port}`
const root = fileURLToPath(new URL('../../', import.meta.url))
const output = process.env.QA_SCREENSHOT_DIR ?? fileURLToPath(new URL('./screenshots/', import.meta.url))
const viewports = {
  desktop: { width: 1280, height: 860 },
  mobile: { width: 390, height: 800 },
}

let server = null
if (!process.env.QA_ORIGIN) {
  const { createServer } = await import('vite')
  server = await createServer({
    root,
    clearScreen: false,
    server: { host: '127.0.0.1', port, strictPort: true },
  })
  await server.listen()
}

const errors = []
const counters = {}

/** 열리고 닫히는 움직임이 끝날 때까지 기다린다. 끝없는 움직임은 기다리지 않는다. */
const settle = (page) =>
  page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== 'running' || animation.effect?.getTiming().iterations === Infinity),
  )

/**
 * 한 단계를 걷고 캡처한다. 이름은 `{viewport}-{두 자리 번호}-{name}.png`이고 번호는 뷰포트마다 1부터 센다.
 * 페이지가 가로로 넘치지 않는지 본다. `dark: true`면 어두운 테마로도 찍는다(`…-dark.png`).
 */
const step = async (page, viewport, name, run, { dark = false } = {}) => {
  try {
    await run()
  } catch (error) {
    const failed = path.join(process.env.QA_FAILED_DIR ?? os.tmpdir(), `${viewport}-${name}-failed.png`)
    await page.screenshot({ path: failed }).catch(() => {})
    console.log(`failed ${viewport} ${name} (화면: ${failed})`)
    throw error
  }
  await settle(page)
  counters[viewport] = (counters[viewport] ?? 0) + 1
  const number = String(counters[viewport]).padStart(2, '0')
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  assert.ok(width <= viewports[viewport].width, `${name}: 가로로 넘친다(${width}px)`)
  const file = `${viewport}-${number}-${name}`
  await page.screenshot({ path: path.join(output, `${file}.png`) })
  if (dark) {
    // 테마는 src/shared/theme/theme.ts처럼 html의 data-theme으로 바꾼다. 이 탭에서만 바꾸고 저장하지 않는다.
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'dark'
    })
    await settle(page)
    await page.screenshot({ path: path.join(output, `${file}-dark.png`) })
    await page.evaluate(() => {
      delete document.documentElement.dataset.theme
    })
  }
  console.log(`ok ${viewport} ${number} ${name}`)
}

const button = (scope, name) => scope.getByRole('button', { name, exact: true }).filter({ visible: true }).first()
const canvas = (page) => page.locator('.mind-map-canvas')
const nodeByText = (page, text) =>
  page.locator('.mind-map-node').filter({ has: page.locator('.mind-map-node__label', { hasText: new RegExp(`^${text}$`) }) })
const counts = (page) => page.locator('.mind-map-page__counts')
const saveLabel = (page) => page.locator('.mind-map-save__label')
const editingLabel = (page) => page.locator('.mind-map-node.is-editing .mind-map-node__label')

const login = async (page) => {
  await page.goto(`${origin}/login`)
  await page.getByPlaceholder('아이디를 입력하세요').fill('demo')
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('demo1234')
  await button(page, '로그인').click()
  await page.waitForURL(/\/app\//)
  // 처음 들어오면 뜨는 둘러보기를 닫는다.
  const skip = page.getByRole('button', { name: '건너뛰기', exact: true })
  await skip.waitFor({ timeout: 5000 }).then(() => skip.click(), () => {})
  await skip.waitFor({ state: 'detached' })
}

/**
 * 앱 안에서 주소를 바꾼다. 새로 읽으면 mock의 로그인과 상태가 처음으로 돌아가므로 `page.goto`를 쓰지 않는다.
 * Task 13 전에는 메뉴에 마인드맵이 없어 `history.pushState`와 `popstate`로 옮긴다.
 */
const openInApp = async (page, pathname) => {
  await page.evaluate((to) => {
    window.history.pushState({}, '', to)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, pathname)
  await page.waitForURL(new RegExp(`${pathname}$`))
}

/** 화면에 보이는 저장 상태 글을 차례로 모은다(`저장 중…`은 잠깐만 보인다). */
const recordSaveLabels = (page) =>
  page.evaluate(() => {
    const seen = []
    const read = () => {
      const text = document.querySelector('.mind-map-save__label')?.textContent ?? null
      if (text && seen.at(-1) !== text) seen.push(text)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.querySelector('.mind-map-page__bar'), { subtree: true, childList: true, characterData: true })
    window.__mindMapSaveLabels = seen
  })
const savedLabels = (page) => page.evaluate(() => [...window.__mindMapSaveLabels])
const waitSaved = (page) => page.waitForFunction(() => document.querySelector('.mind-map-save__label')?.textContent === '저장됨')

const walk = async (page, viewport) => {
  await step(
    page,
    viewport,
    'page-open',
    async () => {
      await openInApp(page, '/app/mind-map')
      await canvas(page).waitFor()
      await page.waitForFunction(() => document.querySelector('.mind-map-world')?.style.visibility !== 'hidden')
      assert.equal((await counts(page).innerText()).trim(), '가지 27개 · 맨 끝 가지 17개 · 할 일 2/4')
      const selected = page.locator('.mind-map-node.is-selected')
      assert.equal(await selected.count(), 1)
      assert.equal(await selected.locator('.mind-map-node__label').innerText(), '짐 정리')
      assert.equal(await canvas(page).getAttribute('aria-activedescendant'), await selected.getAttribute('id'))
      // 고른 가지가 캔버스 가운데(가로 가운데, 세로는 위 64·아래 96을 뺀 칸의 가운데)에 있다.
      const frame = await canvas(page).boundingBox()
      const box = await selected.boundingBox()
      const dx = box.x + box.width / 2 - (frame.x + frame.width / 2)
      const dy = box.y + box.height / 2 - (frame.y + 64 + (frame.height - 160) / 2)
      assert.ok(Math.abs(dx) <= 1 && Math.abs(dy) <= 1, `짐 정리가 가운데가 아니다(${dx}, ${dy})`)
      // 배율: PC 100%, 폰 85%.
      const scale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.mind-map-world')).transform).a)
      assert.equal(scale, viewport === 'mobile' ? 0.85 : 1)
      const look = await page.evaluate(() => {
        const style = (el) => getComputedStyle(el)
        const topic = document.querySelector('.mind-map-node[data-depth="0"]')
        const first = document.querySelector('.mind-map-node[data-depth="1"]')
        const label = (text) =>
          [...document.querySelectorAll('.mind-map-node__label')].find((el) => el.textContent === text)
        const toss = label('버릴 것 고르기')
        const place = label('장소').closest('.mind-map-node')
        return {
          topicBackground: style(topic).backgroundColor,
          blue: style(document.querySelector('.workspace-theme')).getPropertyValue('--workspace-blue').trim(),
          firstBorder: style(first).borderTopWidth,
          firstBorderStyle: style(first).borderTopStyle,
          tossDecoration: style(toss).textDecorationLine,
          tossOpacity: style(toss).opacity,
          tossHasCheck: !!toss.closest('.mind-map-node').querySelector('.mind-map-node__check svg'),
          placeToggle: place.querySelector('.mind-map-node__toggle')?.textContent,
          placeToggleLabel: place.querySelector('.mind-map-node__toggle')?.getAttribute('aria-label'),
          scopeText: (document.querySelector('.top-bar')?.textContent ?? '') + (document.querySelector('main')?.textContent ?? ''),
        }
      })
      assert.equal(look.topicBackground, 'rgb(52, 92, 229)')
      // 1.5px 선. Chromium은 기기 픽셀 배율 1에서 테두리를 1px로 내림해 계산 값을 준다.
      assert.ok(['1px', '1.5px'].includes(look.firstBorder), look.firstBorder)
      assert.equal(look.firstBorderStyle, 'solid')
      assert.equal(look.tossDecoration, 'line-through')
      assert.equal(look.tossOpacity, '0.55')
      assert.equal(look.tossHasCheck, true)
      assert.equal(look.placeToggle, '2')
      assert.equal(look.placeToggleLabel, '가지 펴기')
      assert.ok(!look.scopeText.includes('모든 스페이스'), '범위 표시가 보인다')
      const home = page.getByRole('link', { name: '← 홈', exact: true })
      assert.equal(await home.isVisible(), viewport === 'mobile')
      assert.equal((await saveLabel(page).innerText()).trim(), '저장됨')
    },
    { dark: true },
  )

  await step(page, viewport, 'keyboard', async () => {
    const branches = async () => Number((await counts(page).locator('strong').first().innerText()).trim())
    await canvas(page).focus()
    // Tab: 짐 정리 아래 새 가지를 만들고 바로 쓴다.
    await page.keyboard.press('Tab')
    await editingLabel(page).waitFor()
    await page.keyboard.type('이사 짐 목록')
    await recordSaveLabels(page)
    await page.keyboard.press('Enter')
    await editingLabel(page).waitFor({ state: 'detached' })
    await waitSaved(page)
    assert.deepEqual(await savedLabels(page), ['저장됨', '저장 중…', '저장됨'])
    assert.equal(await branches(), 28)
    const added = nodeByText(page, '이사 짐 목록')
    assert.equal(await added.count(), 1)
    assert.match(await added.getAttribute('class'), /is-selected/)
    const addedId = await added.getAttribute('id')
    // 초점은 캔버스로 돌아온다.
    assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('mind-map-canvas')), true)

    // Enter로 같은 단계 새 가지를 만들고 Esc로 취소하면 사라진다.
    await page.keyboard.press('Enter')
    await editingLabel(page).waitFor()
    assert.equal(await page.locator('.mind-map-node').count(), 28)
    await page.keyboard.press('Escape')
    await editingLabel(page).waitFor({ state: 'detached' })
    assert.equal(await page.locator('.mind-map-node').count(), 27)
    assert.equal(await branches(), 28)
    assert.match(await added.getAttribute('class'), /is-selected/)

    // Delete로 지우고 Ctrl+Z로 같은 가지가 돌아온다.
    await page.keyboard.press('Delete')
    await nodeByText(page, '이사 짐 목록').waitFor({ state: 'detached' })
    assert.equal(await branches(), 27)
    await page.keyboard.press('Control+z')
    await nodeByText(page, '이사 짐 목록').waitFor()
    assert.equal(await nodeByText(page, '이사 짐 목록').getAttribute('id'), addedId)
    assert.equal(await branches(), 28)
    assert.match(await nodeByText(page, '이사 짐 목록').getAttribute('class'), /is-selected/)

    // Ctrl+Enter로 체크박스가 생긴다(체크되지 않은 채). 바로 저장한다.
    await recordSaveLabels(page)
    await page.keyboard.press('Control+Enter')
    await nodeByText(page, '이사 짐 목록').locator('.mind-map-node__check').waitFor()
    assert.equal(await nodeByText(page, '이사 짐 목록').getAttribute('aria-checked'), 'false')
    assert.match(await counts(page).innerText(), /할 일 2\/5$/)
    await waitSaved(page)
    assert.ok((await savedLabels(page)).includes('저장 중…'), '체크박스 저장 상태가 보이지 않았다')
  }, { dark: true })
}

let browser
try {
  await mkdir(output, { recursive: true })
  browser = await chromium.launch()
  const only = process.env.QA_VIEWPORT
  for (const [viewport, size] of Object.entries(viewports)) {
    if (only && only !== viewport) continue
    const context = await browser.newContext({
      viewport: size,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      timezoneId: 'Asia/Seoul',
      serviceWorkers: 'block',
    })
    context.setDefaultTimeout(10_000)
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(`${viewport} pageerror: ${error.message}`))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${viewport} console: ${message.text()}`)
    })
    await login(page)
    await walk(page, viewport)
    await context.close()
  }
  assert.deepEqual(errors, [], `브라우저 오류:\n${errors.join('\n')}`)
  console.log('mind-map local check passed')
} finally {
  await browser?.close()
  await server?.close()
}
