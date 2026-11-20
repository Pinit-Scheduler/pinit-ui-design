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

const actionBar = (page) => page.getByRole('toolbar', { name: '가지 편집', exact: true })
const selectedLabel = (page) => page.locator('.mind-map-node.is-selected .mind-map-node__label').innerText()
const center = async (locator) => {
  const box = await locator.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}
/** 가지 상자 안에서 세로로 `fraction`(0 위 ~ 1 아래)인 점. */
const pointIn = async (locator, fraction) => {
  const box = await locator.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height * fraction }
}
const worldOffset = (page) =>
  page.evaluate(() => {
    const m = new DOMMatrix(getComputedStyle(document.querySelector('.mind-map-world')).transform)
    return { x: m.e, y: m.f, k: m.a }
  })

/**
 * 누르고 끈 뒤 놓는다. PC는 마우스, 폰은 터치(CDP의 터치 이벤트, Chromium이 pointerType touch로 바꾼다).
 * Playwright의 `page.touchscreen`은 `tap`만 있어 끌기는 CDP로 보낸다. `whileHeld`는 놓기 전에 부른다.
 */
const dragBetween = async (page, viewport, from, to, whileHeld = async () => {}) => {
  const steps = 10
  if (viewport === 'mobile') {
    const cdp = await page.context().newCDPSession(page)
    const touch = (type, p) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y, id: 1 }] })
    await touch('touchStart', from)
    for (let i = 1; i <= steps; i++)
      await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
    // 놓기 전에 잠깐 멈춘다. 빠르게 끈 채 놓으면 Chromium이 튕기기(fling)로 보고 바로 다음 탭의 click을 삼킨다.
    await page.waitForTimeout(120)
    await touch('touchMove', to)
    await whileHeld()
    await touch('touchEnd', to)
    await cdp.detach()
    return
  }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps })
  await whileHeld()
  await page.mouse.up()
}

/** 폰은 손가락으로, PC는 마우스로 누른다. */
const press = async (page, viewport, locator) => {
  if (viewport === 'mobile') await locator.tap()
  else await locator.click()
}

/** 끄는 동안의 화면을 밝은·어두운 테마로 찍는다. */
const captureHeld = async (page, viewport, name) => {
  await page.screenshot({ path: path.join(output, `${viewport}-${name}-held.png`) })
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark'
  })
  await page.screenshot({ path: path.join(output, `${viewport}-${name}-held-dark.png`) })
  await page.evaluate(() => {
    delete document.documentElement.dataset.theme
  })
}

/** 선택한 가지의 부모 글. `←`로 부모를 고르고 그 글을 읽는다(선택은 부모에 남는다). */
const parentOfSelected = async (page) => {
  await page.keyboard.press('ArrowLeft')
  return selectedLabel(page)
}

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

  await step(
    page,
    viewport,
    'action-bar',
    async () => {
      const bar = actionBar(page)
      const names = await bar.getByRole('button').evaluateAll((list) =>
        list.map((b) => b.querySelector('.mind-map-actions__label').textContent),
      )
      assert.deepEqual(names, ['하위 가지', '같은 단계', '글 고치기', '체크박스', '접기', '삭제', '되돌리기'])
      // 미니 플레이어(진행 중인 Deep Work 블록)가 있어도 단추 줄이 그 위에 보이고 눌린다.
      const player = page.locator('.mini-player-wrapper')
      assert.equal(await player.isVisible(), true, '데모의 미니 플레이어가 보이지 않는다')
      const barBox = await bar.boundingBox()
      const playerBox = await player.boundingBox()
      assert.ok(barBox.y + barBox.height <= playerBox.y, `단추 줄이 미니 플레이어에 가린다(${barBox.y + barBox.height} > ${playerBox.y})`)
      const covered = await bar.getByRole('button').evaluateAll((list) =>
        list
          .filter((b) => {
            const r = b.getBoundingClientRect()
            return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('button') !== b
          })
          .map((b) => b.textContent),
      )
      assert.deepEqual(covered, [], '가려진 단추')
      // 단축키는 PC에서만 보인다.
      const kbd = bar.locator('kbd').nth(3)
      assert.equal(await kbd.isVisible(), viewport === 'desktop')
      if (viewport === 'desktop') assert.equal(await kbd.innerText(), 'Ctrl ⇧ Enter')

      // 단추를 눌러도 초점은 캔버스에 남는다. 체크박스 붙이기·떼기와 되돌리기.
      await canvas(page).focus()
      const checkbox = button(bar, '체크박스')
      const pressed = await checkbox.getAttribute('aria-pressed')
      await press(page, viewport, checkbox)
      assert.notEqual(await checkbox.getAttribute('aria-pressed'), pressed)
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('mind-map-canvas')), true)
      await press(page, viewport, button(bar, '되돌리기'))
      assert.equal(await checkbox.getAttribute('aria-pressed'), pressed)
      // 하위 가지 단추는 글 쓰기를 시작하고, 쓰는 글에 초점이 간다. Esc로 취소한다.
      await press(page, viewport, button(bar, '하위 가지'))
      await editingLabel(page).waitFor()
      assert.equal(await page.evaluate(() => document.activeElement?.isContentEditable), true)
      await page.keyboard.press('Escape')
      await editingLabel(page).waitFor({ state: 'detached' })
      await waitSaved(page)
    },
    { dark: true },
  )

  if (viewport === 'mobile') {
    await step(page, viewport, 'actions-fit', async () => {
      const fit = await actionBar(page).evaluate((bar) => {
        const buttons = [...bar.querySelectorAll('button')]
        return {
          bar: { scrollWidth: bar.scrollWidth, clientWidth: bar.clientWidth },
          buttons: buttons.map((b) => {
            const label = b.querySelector('.mind-map-actions__label')
            const r = b.getBoundingClientRect()
            const l = label.getBoundingClientRect()
            const pad = parseFloat(getComputedStyle(b).paddingLeft)
            return {
              text: label.textContent,
              scrollWidth: b.scrollWidth,
              clientWidth: b.clientWidth,
              height: b.offsetHeight,
              lines: label.getClientRects().length,
              labelWidth: Math.round(l.width * 10) / 10,
              // 가운데 맞춤이라 넘치면 왼쪽으로도 넘친다. scrollWidth는 왼쪽 넘침을 세지 않아 따로 잰다.
              inside: l.left >= r.left + pad - 0.5 && l.right <= r.right - pad + 0.5,
            }
          }),
        }
      })
      console.log(`actions-fit 390px: ${JSON.stringify(fit)}`)
      assert.ok(fit.bar.scrollWidth <= fit.bar.clientWidth, '단추 줄이 넘친다')
      for (const b of fit.buttons) {
        assert.ok(b.scrollWidth <= b.clientWidth, `${b.text}: 단추가 넘친다`)
        assert.equal(b.lines, 1, `${b.text}: 글이 두 줄이다`)
        assert.ok(b.inside, `${b.text}: 글(${b.labelWidth}px)이 단추 안쪽(${b.clientWidth}px)을 넘는다`)
      }
      assert.equal(new Set(fit.buttons.map((b) => b.height)).size, 1, '단추 높이가 다르다')
    })
  }

  await step(page, viewport, 'drag-child', async () => {
    const toss = nodeByText(page, '버릴 것 고르기')
    const moveDay = nodeByText(page, '이사 당일')
    await dragBetween(page, viewport, await center(toss.locator('.mind-map-node__label')), await center(moveDay), async () => {
      await page.locator('.mind-map-node.is-drop').filter({ hasText: '이사 당일' }).waitFor()
      assert.equal(await page.locator('.mind-map-insert-line').count(), 0)
      assert.equal(await page.locator('.mind-map-ghost').innerText(), '버릴 것 고르기')
    })
    assert.equal(await page.locator('.mind-map-node.is-drop').count(), 0)
    assert.equal(await page.locator('.mind-map-ghost').count(), 0)
    assert.equal(await selectedLabel(page), '버릴 것 고르기')
    assert.equal(await toss.getAttribute('aria-level'), String(Number(await moveDay.getAttribute('aria-level')) + 1))
    assert.equal(await parentOfSelected(page), '이사 당일')
    await waitSaved(page)
  })

  await step(page, viewport, 'drag-between', async () => {
    const rooms = nodeByText(page, '방마다 포장하기')
    const boxes = nodeByText(page, '박스와 테이프 사기')
    assert.equal(await boxes.getAttribute('aria-posinset'), '1')
    await dragBetween(page, viewport, await center(rooms.locator('.mind-map-node__label')), await pointIn(boxes, 0.2), async () => {
      const line = page.locator('.mind-map-insert-line')
      await line.waitFor()
      const lineBox = await line.boundingBox()
      const target = await boxes.boundingBox()
      assert.equal(Math.round(lineBox.height), 3)
      assert.ok(Math.abs(lineBox.y - (target.y - 5)) <= 1, `선이 가지 위에 있지 않다(${lineBox.y}, ${target.y})`)
      assert.equal(await page.locator('.mind-map-node.is-drop').count(), 0)
      await captureHeld(page, viewport, 'drag-between')
    })
    assert.equal(await rooms.getAttribute('aria-posinset'), '1')
    assert.equal(await boxes.getAttribute('aria-posinset'), '2')
    assert.equal(await parentOfSelected(page), '짐 정리')
    await waitSaved(page)
  })

  await step(page, viewport, 'drag-self', async () => {
    const packing = nodeByText(page, '짐 정리')
    const child = nodeByText(page, '박스와 테이프 사기')
    const before = await packing.evaluate((el) => [el.getAttribute('aria-level'), el.getAttribute('aria-posinset')])
    const order = () => page.locator('.mind-map-node[aria-level="4"]').evaluateAll((list) => list.map((el) => el.textContent))
    const childrenBefore = await order()
    await recordSaveLabels(page)
    await dragBetween(page, viewport, await center(packing.locator('.mind-map-node__label')), await center(child), async () => {
      assert.equal(await page.locator('.mind-map-ghost').innerText(), '짐 정리')
      await page.waitForTimeout(100)
      assert.equal(await page.locator('.mind-map-node.is-drop').count(), 0, '자기 아래에 놓는 표시가 있다')
      assert.equal(await page.locator('.mind-map-insert-line').count(), 0, '자기 아래에 끼우는 선이 있다')
    })
    assert.deepEqual(await packing.evaluate((el) => [el.getAttribute('aria-level'), el.getAttribute('aria-posinset')]), before)
    assert.deepEqual(await order(), childrenBefore)
    if (viewport === 'desktop') {
      // 이미 주제의 자식인 가지는 주제 위에 놓을 수 없다(폰은 주제가 화면 왼쪽 끝에 걸쳐 PC에서만 본다).
      const workshop = nodeByText(page, '팀 워크숍')
      const topic = page.locator('.mind-map-node[data-depth="0"]')
      const posinset = await workshop.getAttribute('aria-posinset')
      await dragBetween(page, viewport, await center(workshop), await center(topic), async () => {
        assert.equal(await page.locator('.mind-map-ghost').innerText(), '팀 워크숍')
        await page.waitForTimeout(100)
        assert.equal(await page.locator('.mind-map-node.is-drop').count(), 0, '주제에 놓는 표시가 있다')
      })
      assert.equal(await workshop.getAttribute('aria-posinset'), posinset)
    }
    await page.waitForTimeout(1200)
    assert.deepEqual(await savedLabels(page), ['저장됨'], '바뀌지 않았는데 저장했다')
  })

  await step(
    page,
    viewport,
    'pan-zoom',
    async () => {
      // 빈 곳을 끌면 화면이 같은 만큼 움직인다.
      const frame = await canvas(page).boundingBox()
      const from = { x: frame.x + 24, y: frame.y + 90 }
      const empty = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y)
        return !!el?.closest('.mind-map-canvas') && !el.closest('.mind-map-node')
      }, from)
      assert.ok(empty, '빈 곳이 아니다')
      const start = await worldOffset(page)
      await dragBetween(page, viewport, from, { x: from.x + 60, y: from.y + 40 })
      const moved = await worldOffset(page)
      assert.ok(Math.abs(moved.x - start.x - 60) <= 1 && Math.abs(moved.y - start.y - 40) <= 1, JSON.stringify({ start, moved }))
      // + 두 번이면 1.2 × 1.2배(PC 100% → 144%, 폰 85% → 122%).
      const expected = `${Math.round(moved.k * 144)}%`
      await press(page, viewport, button(page, '확대'))
      await press(page, viewport, button(page, '확대'))
      await page.waitForFunction((text) => document.querySelector('.mind-map-zoom output')?.textContent === text, expected)
      if (viewport === 'desktop') {
        assert.equal(expected, '144%')
        // 휠은 이동, Ctrl+휠은 확대(exp(0.2)배 → 176%), 축소 단추는 1.2로 나눈다(147%).
        const before = await worldOffset(page)
        await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2)
        await page.mouse.wheel(0, 100)
        await page.waitForFunction((y) => {
          const m = new DOMMatrix(getComputedStyle(document.querySelector('.mind-map-world')).transform)
          return Math.abs(m.f - (y - 100)) <= 1
        }, before.y)
        await page.keyboard.down('Control')
        await page.mouse.wheel(0, -20)
        await page.keyboard.up('Control')
        await page.waitForFunction(() => document.querySelector('.mind-map-zoom output')?.textContent === '176%')
        await button(page, '축소').click()
        await page.waitForFunction(() => document.querySelector('.mind-map-zoom output')?.textContent === '147%')
      }
      // 전체 보기 뒤 주제와 맨 아래 가지가 캔버스 안에 있다.
      await press(page, viewport, button(page, '전체 보기'))
      await page.waitForTimeout(100)
      const inside = await page.evaluate(() => {
        const frame = document.querySelector('.mind-map-canvas').getBoundingClientRect()
        const nodes = [...document.querySelectorAll('.mind-map-canvas .mind-map-node')].map((el) => ({
          text: el.textContent,
          depth: el.dataset.depth,
          r: el.getBoundingClientRect(),
        }))
        const topic = nodes.find((n) => n.depth === '0')
        const lowest = nodes.reduce((a, b) => (b.r.bottom > a.r.bottom ? b : a))
        const within = (r) => r.left >= frame.left && r.right <= frame.right && r.top >= frame.top && r.bottom <= frame.bottom
        return { topic: within(topic.r), lowest: lowest.text, lowestInside: within(lowest.r), all: nodes.every((n) => within(n.r)) }
      })
      assert.ok(inside.topic && inside.lowestInside && inside.all, JSON.stringify(inside))
      if (viewport === 'mobile') {
        // 두 손가락을 100px에서 200px로 벌리면 배율이 두 배다(CDP 터치 두 점. 실제 기기는 확인하지 못했다).
        const fitK = (await worldOffset(page)).k
        const cdp = await page.context().newCDPSession(page)
        const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
        const y = frame.y + 120
        await send('touchStart', [{ x: 145, y, id: 1 }])
        await send('touchStart', [{ x: 145, y, id: 1 }, { x: 245, y, id: 2 }])
        for (let i = 1; i <= 10; i++) await send('touchMove', [{ x: 145 - 5 * i, y, id: 1 }, { x: 245 + 5 * i, y, id: 2 }])
        await page.waitForTimeout(120)
        await send('touchEnd', [])
        await cdp.detach()
        const pinched = `${Math.round(Math.min(2, fitK * 2) * 100)}%`
        await page.waitForFunction((text) => document.querySelector('.mind-map-zoom output')?.textContent === text, pinched)
        await press(page, viewport, button(page, '전체 보기'))
      }
    },
    { dark: true },
  )

  await step(
    page,
    viewport,
    'double-click-edit',
    async () => {
      const boxes = nodeByText(page, '박스와 테이프 사기')
      if (viewport === 'mobile') {
        const at = await center(boxes.locator('.mind-map-node__label'))
        await page.touchscreen.tap(at.x, at.y)
        await page.touchscreen.tap(at.x, at.y)
      } else {
        await boxes.locator('.mind-map-node__label').dblclick()
      }
      await editingLabel(page).waitFor()
      assert.equal(await page.evaluate(() => window.getSelection()?.toString()), '박스와 테이프 사기')
      // 쓰는 글 상자 안을 누르면 고르기·확정을 하지 않고 계속 쓴다.
      const label = editingLabel(page)
      if (viewport === 'mobile') await label.tap()
      else await label.click()
      assert.equal(await editingLabel(page).count(), 1)
      assert.equal(await selectedLabel(page), '박스와 테이프 사기')
      await page.keyboard.press('Escape')
      await editingLabel(page).waitFor({ state: 'detached' })
      assert.equal(await page.evaluate(() => document.activeElement?.classList.contains('mind-map-canvas')), true)
    },
    { dark: true },
  )
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
      hasTouch: viewport === 'mobile',
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
