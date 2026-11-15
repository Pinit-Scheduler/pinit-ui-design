// 작업 쪼개기 시안용 상태. 서버가 없으므로 요청·보관함·동의·하루 횟수를 이 파일 안에서 흉내 낸다.
// 실제 구현에서는 전부 BE 응답으로 바뀐다(잠금은 Task의 allowedActions·unavailableReasons).
import dayjs from 'dayjs'
import { useSyncExternalStore } from 'react'

export type SplitStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'APPLIED' | 'DISCARDED' | 'CANCELLED'

export type SplitPiece = {
  key: string
  title: string
  description: string
  minutes: number
  difficulty: number
  dueDate: string
  /** 먼저 끝내야 하는 조각의 key */
  after: string[]
  /** LLM이 뺀 단계면 이유와 근거 작업 */
  excluded?: { kind: 'DONE' | 'OVERLAP'; evidence: string; note: string }
}

export type SplitProposal = {
  originMinutes: number
  originDue: string
  calibrationOn: boolean
  /** 난이도별 보정 계수 */
  coefficients: Record<number, number>
  inheritedBefore: string[]
  inheritedAfter: string[]
  pieces: SplitPiece[]
}

export type SplitRequest = {
  id: number
  taskId: number
  taskTitle: string
  status: SplitStatus
  requestedAt: number
  unread: boolean
  expiresAt?: number
  failure?: 'PROVIDER' | 'UNPARSEABLE' | 'TIMEOUT'
  proposal?: SplitProposal
  createdCount?: number
  /** 만들 때 화면에 있던 조각. 만들기를 되돌리면 고치던 그대로 다시 연다. */
  draft?: (SplitPiece & { selected: boolean })[]
  /** 만들기를 되돌릴 때 쓸 것: 만든 조각 작업과 휴지통으로 간 원본 */
  made?: { createdIds: number[]; originId: number }
}

/** 알림함에 쌓이는 알림 한 건. 요청(보관함)과 따로 읽음 상태를 가진다. */
export type SplitNotice = {
  id: number
  requestId: number
  taskTitle: string
  kind: 'READY' | 'FAILED'
  at: number
  read: boolean
}

type State = {
  notices: SplitNotice[]
  consented: boolean
  quota: { limit: number; used: number }
  requests: SplitRequest[]
}

const day = (offset: number) => dayjs().add(offset, 'day').format('YYYY-MM-DD')
const COEFFICIENTS = { 1: 1, 2: 1, 3: 1.1, 5: 1.2, 8: 1.3, 13: 1.4, 21: 1.5 }

const text = (purpose: string, reason: string, how: string[], done: string) =>
  `목적\n${purpose}\n\n이유\n${reason}\n\n진행 방법\n${how.map((line, i) => `${i + 1}. ${line}`).join('\n')}\n\n완료 기준\n${done}`

const onboardingProposal = (): SplitProposal => ({
  originMinutes: 480,
  originDue: day(6),
  calibrationOn: true,
  coefficients: COEFFICIENTS,
  inheritedBefore: [],
  inheritedAfter: [],
  pieces: [
    {
      key: 'a',
      title: '현재 온보딩 흐름 정리',
      description: text(
        '지금 온보딩의 화면과 단계를 한 장으로 그린다.',
        '개편안이 무엇을 바꾸는지 비교할 기준이 필요하다.',
        [
          '가입부터 첫 일정 등록까지 화면을 순서대로 캡처한다',
          '단계마다 사용자가 해야 하는 입력을 적는다',
          '한 장짜리 흐름도로 묶는다',
        ],
        '흐름도 한 장과 단계별 입력 목록이 있다.',
      ),
      minutes: 60,
      difficulty: 3,
      dueDate: day(1),
      after: [],
    },
    {
      key: 'b',
      title: '이탈 구간 데이터 뽑기',
      description: text(
        '첫 주에 어느 단계에서 사람들이 떠나는지 숫자로 확인한다.',
        '감이 아니라 가장 많이 떠나는 단계부터 고치기 위해서다.',
        [
          '최근 4주 가입자의 단계별 도달률을 뽑는다',
          '도달률이 가장 크게 떨어지는 두 구간을 표시한다',
        ],
        '단계별 도달률 표와 이탈이 큰 두 구간이 정리돼 있다.',
      ),
      minutes: 90,
      difficulty: 5,
      dueDate: day(2),
      after: [],
    },
    {
      key: 'c',
      title: '개편안 스케치 3종',
      description: text(
        '이탈이 큰 두 구간을 줄이는 서로 다른 안 세 가지를 그린다.',
        '한 가지 안만 그리면 비교 없이 결정하게 된다.',
        [
          '구간마다 줄일 입력과 미룰 입력을 정한다',
          '안마다 화면 흐름을 손으로 그린다',
          '안마다 장단점을 세 줄로 적는다',
        ],
        '세 안의 화면 흐름과 장단점이 한 문서에 있다.',
      ),
      minutes: 150,
      difficulty: 8,
      dueDate: day(3),
      after: ['a', 'b'],
    },
    {
      key: 'd',
      title: '팀 리뷰 받기',
      description: text(
        '세 안을 팀에 보여 주고 하나를 고른다.',
        '구현 비용과 일정은 혼자 판단하기 어렵다.',
        ['30분 리뷰 자리를 잡는다', '안마다 구현 비용 의견을 받는다', '고른 안과 이유를 적는다'],
        '고른 안 하나와 고른 이유가 기록돼 있다.',
      ),
      minutes: 60,
      difficulty: 2,
      dueDate: day(4),
      after: ['c'],
    },
    {
      key: 'e',
      title: '최종안 문서화',
      description: text(
        '고른 안을 구현할 수 있는 설계 문서로 정리한다.',
        '원래 작업의 결과물이 이 문서다.',
        ['화면별 요구사항을 적는다', '측정할 지표와 목표값을 정한다', '리뷰 의견을 반영한다'],
        '화면별 요구사항과 목표 지표가 담긴 문서가 공유돼 있다.',
      ),
      minutes: 120,
      difficulty: 5,
      dueDate: day(6),
      after: ['d'],
    },
    {
      key: 'x1',
      title: '경쟁 앱 온보딩 조사',
      description: text(
        '비슷한 앱 세 곳의 온보딩을 비교한다.',
        '참고할 패턴을 찾기 위해서다.',
        ['앱 세 곳의 가입 흐름을 캡처한다', '공통 패턴을 정리한다'],
        '비교 표가 있다.',
      ),
      minutes: 90,
      difficulty: 3,
      dueDate: day(1),
      after: [],
      excluded: {
        kind: 'DONE',
        evidence: '경쟁 앱 온보딩 벤치마크',
        note: `${dayjs().subtract(12, 'day').format('M/D')}에 완료`,
      },
    },
    {
      key: 'x2',
      title: '온보딩 문구 초안',
      description: text(
        '새 흐름의 안내 문구를 쓴다.',
        '화면 설계와 문구를 같이 봐야 한다.',
        ['단계별 제목과 설명을 쓴다'],
        '단계별 문구 초안이 있다.',
      ),
      minutes: 60,
      difficulty: 3,
      dueDate: day(5),
      after: ['d'],
      excluded: {
        kind: 'OVERLAP',
        evidence: '온보딩 문구 다듬기',
        note: '아직 끝나지 않은 작업',
      },
    },
  ],
})

/** 예시 제안이 없는 작업은 예상 시간을 고르게 나눈 제안을 만든다. */
const genericProposal = (title: string, minutes: number, due: string): SplitProposal => {
  const steps = ['자료 모으기', '뼈대 잡기', '본문 채우기', '검토하고 다듬기']
  const count = Math.min(steps.length, Math.max(2, Math.ceil(minutes / 120)))
  const each = Math.ceil(minutes / count / 5) * 5
  const span = Math.max(0, dayjs(due).diff(dayjs().startOf('day'), 'day'))
  return {
    originMinutes: minutes,
    originDue: due,
    calibrationOn: true,
    coefficients: COEFFICIENTS,
    inheritedBefore: [],
    inheritedAfter: [],
    pieces: steps.slice(0, count).map((step, index) => ({
      key: `g${index}`,
      title: step,
      description: text(
        `"${title}" 중 ${step} 단계를 끝낸다.`,
        '다음 단계가 이 결과를 받아서 시작한다.',
        ['필요한 것을 확인한다', '결과를 한곳에 정리한다'],
        '다음 단계를 바로 시작할 수 있다.',
      ),
      minutes: each,
      difficulty: 5,
      dueDate: day(Math.round((span * (index + 1)) / count)),
      after: index === 0 ? [] : [`g${index - 1}`],
    })),
  }
}

let state: State = {
  notices: [
    {
      id: 2,
      requestId: 3,
      taskTitle: '온보딩 개편 설계',
      kind: 'READY',
      at: dayjs().subtract(35, 'minute').valueOf(),
      read: false,
    },
    {
      id: 1,
      requestId: 1,
      taskTitle: '연말 회고 자료',
      kind: 'FAILED',
      at: dayjs().subtract(23, 'hour').valueOf(),
      read: false,
    },
  ],
  consented: false,
  quota: { limit: 3, used: 1 },
  requests: [
    {
      id: 3,
      taskId: 7,
      taskTitle: '온보딩 개편 설계',
      status: 'READY',
      requestedAt: dayjs().subtract(40, 'minute').valueOf(),
      unread: true,
      expiresAt: dayjs().add(7, 'day').valueOf(),
      proposal: onboardingProposal(),
    },
    {
      id: 2,
      taskId: 8,
      taskTitle: '결제 모듈 이관',
      status: 'PROCESSING',
      requestedAt: dayjs().subtract(3, 'minute').valueOf(),
      unread: false,
    },
    {
      id: 1,
      taskId: 9,
      taskTitle: '연말 회고 자료',
      status: 'FAILED',
      requestedAt: dayjs().subtract(1, 'day').valueOf(),
      unread: true,
      failure: 'PROVIDER',
    },
  ],
}
let seq = 3
let noticeSeq = 2
const listeners = new Set<() => void>()
const set = (next: State) => {
  state = next
  listeners.forEach((listener) => listener())
}
const patch = (id: number, change: Partial<SplitRequest>) =>
  set({
    ...state,
    requests: state.requests.map((request) =>
      request.id === id ? { ...request, ...change } : request,
    ),
  })

export const isOpen = (request: SplitRequest) =>
  request.status === 'PROCESSING' || request.status === 'READY'
/** 보관함에 남아 보이는 요청 */
export const inInbox = (request: SplitRequest) => isOpen(request) || request.status === 'FAILED'

export const splitActions = {
  readNotice: (id: number) =>
    set({ ...state, notices: state.notices.map((n) => (n.id === id ? { ...n, read: true } : n)) }),
  readAllNotices: () =>
    set({ ...state, notices: state.notices.map((n) => ({ ...n, read: true })) }),
  consent: () => set({ ...state, consented: true }),
  request: (task: { id: number; title: string; minutes: number; due: string }) => {
    const id = ++seq
    set({
      ...state,
      quota: { ...state.quota, used: state.quota.used + 1 },
      requests: [
        {
          id,
          taskId: task.id,
          taskTitle: task.title,
          status: 'PROCESSING',
          requestedAt: Date.now(),
          unread: false,
        },
        ...state.requests,
      ],
    })
    // 시안에서는 12초 뒤 준비된다. 실제로는 워커가 처리하고 푸시가 온다.
    window.setTimeout(() => {
      if (state.requests.find((r) => r.id === id)?.status !== 'PROCESSING') return
      patch(id, {
        status: 'READY',
        unread: true,
        expiresAt: dayjs().add(7, 'day').valueOf(),
        proposal: genericProposal(task.title, task.minutes, task.due),
      })
      set({
        ...state,
        notices: [
          {
            id: ++noticeSeq,
            requestId: id,
            taskTitle: task.title,
            kind: 'READY',
            at: Date.now(),
            read: false,
          },
          ...state.notices,
        ],
      })
    }, 12_000)
    return id
  },
  read: (id: number) => {
    if (state.requests.find((r) => r.id === id)?.unread) patch(id, { unread: false })
  },
  cancel: (id: number) => patch(id, { status: 'CANCELLED' }),
  discard: (id: number) => patch(id, { status: 'DISCARDED' }),
  /** 취소·버리기·만들기를 되돌린다. 요청이 그 전 상태로 돌아가고 원본이 다시 잠긴다. */
  revive: (id: number, status: 'PROCESSING' | 'READY') =>
    patch(id, { status, made: undefined, createdCount: undefined }),
  applied: (
    id: number,
    made: { createdIds: number[]; originId: number },
    draft: (SplitPiece & { selected: boolean })[],
  ) =>
    patch(id, {
      status: 'APPLIED',
      createdCount: made.createdIds.length,
      made,
      draft,
      unread: false,
    }),
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const useSplit = () => useSyncExternalStore(subscribe, () => state)
export const useSplitLock = (taskId: number | undefined) =>
  useSplit().requests.find((r) => r.taskId === taskId && isOpen(r)) ?? null
export const useNoticeUnread = () => useSplit().notices.filter((n) => !n.read).length
