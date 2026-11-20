import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { apiError, requireFrom } from './support/errors.mjs'
import { settle } from './support/hooks.mjs'
import { loadModules } from './support/mocks.mjs'

const models = loadModules()
const machine = models('src/features/mind-map/model/saveMachine.ts')
const tree = models('src/features/mind-map/model/tree.ts')

/** 훅 파일을 react 없이 불러 그 안의 저장기 생성 함수만 쓴다. */
const load = (relativePath, dependencies = {}) => {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} }
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: requireFrom({ react: {}, ...dependencies }),
    AbortController,
    JSON,
  })
  return module.exports
}

const api = load('../src/features/mind-map/api/mindMapApi.ts', {
  '@shared/api/config': { buildApiUrl: (path) => path },
  '@shared/api/httpClient': { httpClient: async () => ({}) },
})
const saverModule = load('../src/features/mind-map/hooks/useMindMapSaver.ts', {
  '../model/saveMachine': machine,
  '../model/tree': tree,
  '../api/mindMapApi': api,
  '../api/mindMapQuery': {},
  '@shared/contexts/ToastContext': {},
})
const cursorModule = load('../src/features/mind-map/hooks/useCursorSaver.ts', {
  '../model/saveMachine': machine,
  '../api/mindMapApi': {},
  '../api/mindMapQuery': {},
})

const node = (id, text, children = []) => ({ id, text, collapsed: false, check: 'NONE', children })
const LIMITS = { maxBranches: 500, maxTextLength: 100, maxDepth: 32 }
const map = (version, root = node('r', '내 계획')) => ({ version, root, cursorNodeId: 'r', limits: LIMITS })
const json = (root) => tree.treeJson(root)
const CONFLICT_FALLBACK = '다른 곳에서 마인드맵이 먼저 바뀌었어요. 최신 내용을 불러왔어요.'

/** 손으로 돌리는 시계. */
const clock = () => {
  let now = 0
  let timers = []
  return {
    setTimer: (run, ms) => {
      const handle = { at: now + ms, run }
      timers.push(handle)
      return handle
    },
    clearTimer: (handle) => {
      timers = timers.filter((t) => t !== handle)
    },
    tick(ms) {
      now += ms
      const due = timers.filter((t) => t.at <= now)
      timers = timers.filter((t) => t.at > now)
      due.forEach((t) => t.run())
    },
    pending: () => timers.map((t) => t.at - now),
  }
}

/** 저장 요청을 붙잡아 두고 테스트가 답한다. */
const harness = () => {
  const time = clock()
  const requests = []
  const remembered = []
  const orphaned = []
  let ids = 0
  const saver = saverModule.createMindMapSaver({
    save: (request, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
        )
        requests.push({ request, options, resolve, reject })
      }),
    remember: (update) => remembered.push(update),
    orphanConflict: (message) => orphaned.push(message),
    newSaveId: () => 's' + ++ids,
    setTimer: time.setTimer,
    clearTimer: time.clearTimer,
  })
  const view = {
    confirmed: node('r', '내 계획'),
    leave: null,
    editing: false,
    reloads: [],
    refetches: 0,
  }
  saver.attach({
    confirmedJson: () => json(view.confirmed),
    leaveJson: () => json(view.leave ?? view.confirmed),
    isEditing: () => view.editing,
    reload: (message) => view.reloads.push(message),
    refetch: () => view.refetches++,
  })
  return { saver, view, time, requests, remembered, orphaned }
}

const status = ({ saver, view }) => machine.saveStatus(saver.getState(), json(view.confirmed))

test('바로 저장은 확정된 나무를 보내고 성공하면 카드가 읽는 값을 바꾼다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  let notified = 0
  h.saver.subscribe(() => notified++)
  h.view.confirmed = node('r', '내 계획', [node('a', '이사')])
  h.saver.changed('now')
  assert.equal(h.requests.length, 1)
  const [{ request, options }] = h.requests
  assert.equal(JSON.stringify(request), JSON.stringify({ expectedVersion: 3, saveId: 's1', root: h.view.confirmed }))
  assert.equal(options.keepalive, false)
  assert.equal(status(h), 'saving')
  h.requests[0].resolve({ version: 4 })
  await settle()
  assert.equal(status(h), 'saved')
  assert.equal(h.saver.getState().version, 4)
  assert.ok(notified >= 2)
  const card = h.remembered.at(-1)(map(3))
  assert.equal(card.version, 4)
  assert.equal(JSON.stringify(card.root), json(h.view.confirmed))
  assert.equal(card.cursorNodeId, 'r')
})

test('나중 저장은 1초 뒤에 보낸다', () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.confirmed = node('r', '바꿈')
  h.saver.changed('later')
  assert.equal(h.requests.length, 0)
  assert.deepEqual(h.time.pending(), [1000])
  h.time.tick(1000)
  assert.equal(h.requests.length, 1)
})

test('15초 안에 답이 없으면 잃은 저장이고, 다시 시도는 새 저장 번호로 보낸다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.confirmed = node('r', '바꿈')
  h.saver.changed('now')
  h.time.tick(15000)
  await settle()
  assert.equal(h.requests[0].options.signal.aborted, true)
  assert.equal(status(h), 'failed')
  assert.match(h.saver.getState().failure, /저장하지 못했어요/)
  h.saver.retry()
  assert.equal(h.requests.length, 2)
  assert.equal(h.requests[1].request.saveId, 's2')
  assert.equal(h.requests[1].request.expectedVersion, 3)
})

test('거부되면 이유를 남기고 자동으로 다시 보내지 않는다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.confirmed = node('r', '바꿈')
  h.saver.changed('now')
  h.requests[0].reject(apiError('가지 글을 적어 주세요.', 400, { errors: [] }))
  await settle()
  assert.equal(status(h), 'failed')
  assert.equal(h.saver.getState().failure, '가지 글을 적어 주세요.')
  h.time.tick(60000)
  assert.equal(h.requests.length, 1)
})

test('남의 충돌은 다시 불러오게 하고, 문구가 비면 기본 문구로 안내한다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.confirmed = node('r', '바꿈')
  h.saver.changed('now')
  h.requests[0].reject(apiError('', 409, { code: 'VERSION_CONFLICT', latestVersion: 5, lastSaveId: null }))
  await settle()
  assert.deepEqual(h.view.reloads, [CONFLICT_FALLBACK])
  assert.equal(h.saver.isBlocked(), true)
  // 다시 불러오는 동안은 보내지 않는다. 받아들이면 풀린다.
  h.saver.changed('now')
  assert.equal(h.requests.length, 1)
  h.view.confirmed = node('r', '다른 기기')
  h.saver.adopt(map(5, node('r', '다른 기기')))
  assert.equal(h.saver.isBlocked(), false)
  assert.equal(status(h), 'saved')
})

test('페이지가 사라지면 쓰던 글을 확정한 나무를 바로 보내고 응답까지 마친다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.leave = node('r', '쓰던 글')
  h.saver.changed('later')
  h.saver.detach()
  assert.equal(h.requests.length, 1)
  assert.equal(JSON.stringify(h.requests[0].request.root), json(h.view.leave))
  assert.deepEqual(h.time.pending(), [15000])
  h.requests[0].resolve({ version: 4 })
  await settle()
  assert.equal(h.remembered.at(-1)(undefined).version, 4)
})

test('페이지가 사라진 뒤의 충돌은 안내하고 카드가 다시 읽게 한다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.leave = node('r', '쓰던 글')
  h.saver.detach()
  h.requests[0].reject(apiError('먼저 바뀌었어요.', 409, { code: 'VERSION_CONFLICT', latestVersion: 4, lastSaveId: null }))
  await settle()
  assert.deepEqual(h.orphaned, ['먼저 바뀌었어요.'])
  assert.deepEqual(h.view.reloads, [])
})

test('탭을 닫으면 keepalive로 보낸다. 보내는 중이면 보내지 않는다', () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.leave = node('r', '쓰던 글')
  h.saver.leave()
  assert.equal(h.requests.length, 1)
  assert.equal(h.requests[0].options.keepalive, true)
  assert.equal(JSON.stringify(h.requests[0].request.root), json(h.view.leave))

  const busy = harness()
  busy.saver.adopt(map(3))
  busy.view.confirmed = node('r', '바꿈')
  busy.saver.changed('now')
  busy.view.leave = node('r', '더 바꿈')
  busy.saver.leave()
  assert.equal(busy.requests.length, 1)
})

test('창이 다시 활성화되면: 쓰는 중이면 그대로, 바뀐 것이 있으면 저장, 아니면 다시 읽기', () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.editing = true
  h.view.confirmed = node('r', '바꿈')
  h.saver.activate()
  assert.equal(h.requests.length, 0)
  h.view.editing = false
  h.saver.activate()
  assert.equal(h.requests.length, 1)
  h.saver.activate()
  assert.equal(h.view.refetches, 0)
  h.requests[0].resolve({ version: 4 })
  return settle().then(() => {
    assert.equal(h.saver.isIdle(), true)
    h.saver.activate()
    assert.equal(h.view.refetches, 1)
  })
})

/** 기억한 가지 저장기. */
const cursorHarness = ({ fail = false } = {}) => {
  const time = clock()
  const sent = []
  const remembered = []
  const saver = cursorModule.createCursorSaver({
    send: (nodeId, options) => {
      sent.push({ nodeId, keepalive: options.keepalive })
      return fail ? Promise.reject(new Error('offline')) : Promise.resolve()
    },
    remember: (update) => remembered.push(update),
    setTimer: time.setTimer,
    clearTimer: time.clearTimer,
  })
  return { saver, time, sent, remembered }
}

test('기억한 가지: 처음 값은 보내지 않고, 바뀐 뒤 800ms에 마지막으로 보낸 값과 다를 때만 보낸다', async () => {
  const h = cursorHarness()
  h.saver.update('a')
  h.time.tick(5000)
  assert.deepEqual(h.sent, [])
  h.saver.update('b')
  h.time.tick(799)
  assert.deepEqual(h.sent, [])
  h.time.tick(1)
  assert.deepEqual(h.sent, [{ nodeId: 'b', keepalive: false }])
  await settle()
  assert.equal(h.remembered.at(-1)(map(3)).cursorNodeId, 'b')
  assert.equal(h.remembered.at(-1)(undefined), undefined)
  h.saver.update('c')
  h.saver.update('b')
  h.time.tick(800)
  assert.equal(h.sent.length, 1)
})

test('기억한 가지: 떠날 때 남은 값을 keepalive로 보내고 실패는 알리지 않는다', async () => {
  const h = cursorHarness({ fail: true })
  h.saver.update('a')
  h.saver.update('b')
  h.saver.flush(true)
  assert.deepEqual(h.sent, [{ nodeId: 'b', keepalive: true }])
  await settle()
  assert.deepEqual(h.remembered, [])
  h.saver.flush(true)
  assert.equal(h.sent.length, 1)
})

test('창 활성화가 겹쳐 와도(visibilitychange와 focus) 다시 읽기는 한 번만 보낸다', async () => {
  const h = harness()
  let finish
  h.saver.attach({
    confirmedJson: () => json(h.view.confirmed),
    leaveJson: () => json(h.view.confirmed),
    isEditing: () => false,
    reload: () => {},
    refetch: () => {
      h.view.refetches++
      return new Promise((resolve) => {
        finish = resolve
      })
    },
  })
  h.saver.adopt(map(3))
  h.saver.activate()
  h.saver.activate()
  assert.equal(h.view.refetches, 1)
  finish()
  await settle()
  h.saver.activate()
  assert.equal(h.view.refetches, 2)
})

test('저장이 가는 중에 나갔다 돌아와도 충돌로 안내하지 않는다', async () => {
  // 서버 하나를 두 페이지(저장기 둘)가 차례로 쓴다.
  const server = { version: 3, root: node('r', '내 계획'), lastSaveId: null }
  const time = clock()
  let ids = 0
  const page = () => {
    const requests = []
    const reloads = []
    const saver = saverModule.createMindMapSaver({
      save: (request) =>
        new Promise((resolve, reject) => {
          requests.push(() => {
            if (request.expectedVersion !== server.version)
              return reject(apiError('', 409, { code: 'VERSION_CONFLICT', latestVersion: server.version, lastSaveId: server.lastSaveId }))
            Object.assign(server, { version: server.version + 1, root: request.root, lastSaveId: request.saveId })
            resolve({ version: server.version })
          })
        }),
      remember: () => {},
      orphanConflict: (message) => reloads.push(message),
      newSaveId: () => 's' + ++ids,
      setTimer: time.setTimer,
      clearTimer: time.clearTimer,
    })
    const view = { confirmed: null }
    saver.attach({
      confirmedJson: () => json(view.confirmed),
      leaveJson: () => json(view.confirmed),
      isEditing: () => false,
      reload: (message) => reloads.push(message),
      refetch: () => {},
    })
    return { saver, view, requests, reloads }
  }

  const first = page()
  first.saver.adopt(map(server.version, server.root))
  first.view.confirmed = node('r', '내 계획', [node('a', '이사')])
  saverModule.leaveSaver(first.saver)
  assert.equal(first.requests.length, 1)

  // 새 페이지는 떠난 페이지의 저장이 끝난 뒤에 읽는다.
  let read = null
  saverModule.afterLeavingSaves().then(() => {
    read = map(server.version, server.root)
  })
  await settle()
  assert.equal(read, null)
  first.requests[0]()
  await settle()
  assert.equal(read.version, 4)

  const second = page()
  second.saver.adopt(read)
  second.view.confirmed = node('r', '내 계획', [node('a', '이사'), node('b', '건강')])
  second.saver.changed('now')
  second.requests[0]()
  await settle()
  assert.deepEqual(second.reloads, [])
  assert.equal(server.version, 5)
})

test('떠난 페이지의 저장을 기다리는 것은 15초까지다', async () => {
  const h = harness()
  h.saver.adopt(map(3))
  h.view.confirmed = node('r', '바꿈')
  saverModule.leaveSaver(h.saver)
  let done = false
  saverModule.afterLeavingSaves().then(() => {
    done = true
  })
  h.time.tick(14999)
  await settle()
  assert.equal(done, false)
  h.time.tick(1)
  await settle()
  assert.equal(done, true)
})
