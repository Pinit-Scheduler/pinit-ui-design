// 시안용 "서버 검사" 흉내. 실제로는 BE가 이 계산을 하고 같은 모양의 응답을 준다.
// 화면은 고치는 중인 조각 전체를 통째로 보내고, 계산·판정 결과는 여기서 받은 것만 그린다.
import dayjs from 'dayjs'
import type { SplitPiece, SplitProposal } from './store'

export type DraftPiece = SplitPiece & { selected: boolean }
export type SplitField = 'title' | 'description' | 'minutes' | 'dueDate' | 'after'
export type SplitFieldError = { field: SplitField; message: string }

export type CheckedPiece = {
  key: string
  /** 보정 후 시간(분) */
  shownMinutes: number
  over: boolean
  /** 만들 조각이면 몇 번째 단계인지(0부터). 뺀 조각은 null */
  stage: number | null
  /** 만들 조각 중 바로 앞에 오는 조각. 뺀 조각은 건너뛰어 이은 결과 */
  before: string[]
  errors: SplitFieldError[]
  /** "이전 조각"으로 고를 수 있는 후보. blocked면 사이클이 생겨 고를 수 없다 */
  orderChoices: { key: string; title: string; blocked: boolean }[]
}

export type SplitCheck = {
  pieces: CheckedPiece[]
  selectedCount: number
  totalMinutes: number
  overCount: number
  problemCount: number
  canApply: boolean
  limits: {
    titleMax: number
    descriptionMax: number
    minutesMin: number
    minutesMax: number
    dueMin: string
    dueMax: string
  }
}

const LIMIT_MINUTES = 240

const selectedBefore = (pieces: DraftPiece[], piece: DraftPiece) => {
  const byKey = new Map(pieces.map((p) => [p.key, p]))
  const found = new Set<string>()
  const walk = (keys: string[], seen = new Set<string>()) =>
    keys.forEach((key) => {
      const before = byKey.get(key)
      if (!before || seen.has(key)) return
      seen.add(key)
      if (before.selected) found.add(key)
      else walk(before.after, seen)
    })
  walk(piece.after)
  return [...found]
}

const wouldLoop = (pieces: DraftPiece[], piece: string, candidate: string) => {
  const byKey = new Map(pieces.map((p) => [p.key, p]))
  const reaches = (from: string, seen = new Set<string>()): boolean =>
    from === piece ||
    (!seen.has(from) &&
      (seen.add(from), (byKey.get(from)?.after ?? []).some((k) => reaches(k, seen))))
  return reaches(candidate)
}

const compute = (proposal: SplitProposal, pieces: DraftPiece[]): SplitCheck => {
  const today = dayjs().format('YYYY-MM-DD')
  const selected = pieces.filter((p) => p.selected)
  const byKey = new Map(pieces.map((p) => [p.key, p]))
  const rank = new Map<string, number>()
  const rankOf = (key: string, trail = new Set<string>()): number => {
    const known = rank.get(key)
    if (known !== undefined) return known
    if (trail.has(key)) return 0
    trail.add(key)
    const before = selectedBefore(pieces, byKey.get(key)!)
    const value = before.length ? Math.max(...before.map((k) => rankOf(k, trail))) + 1 : 0
    rank.set(key, value)
    return value
  }
  const checked = pieces.map((piece): CheckedPiece => {
    const shownMinutes =
      Math.ceil((piece.minutes * (proposal.coefficients[piece.difficulty] ?? 1)) / 5) * 5
    const before = piece.selected ? selectedBefore(pieces, piece) : []
    const errors: SplitFieldError[] = []
    if (piece.selected) {
      const title = piece.title.trim()
      if (title.length < 1 || title.length > 20)
        errors.push({ field: 'title', message: '제목은 1~20자로 써 주세요.' })
      if (!piece.description.trim())
        errors.push({ field: 'description', message: '설명을 써 주세요.' })
      else if (piece.description.length > 2000)
        errors.push({ field: 'description', message: '설명은 2,000자까지 쓸 수 있어요.' })
      if (!(piece.minutes >= 5 && piece.minutes <= 1440))
        errors.push({ field: 'minutes', message: '예상 시간은 5분~24시간으로 넣어 주세요.' })
      const late = before.map((key) => byKey.get(key)!).find((b) => b.dueDate > piece.dueDate)
      if (piece.dueDate > proposal.originDue)
        errors.push({
          field: 'dueDate',
          message: `원본 마감(${dayjs(proposal.originDue).format('M/D')})보다 늦을 수 없어요.`,
        })
      else if (piece.dueDate < today)
        errors.push({ field: 'dueDate', message: '이미 지난 날짜예요. 오늘 이후로 넣어 주세요.' })
      else if (late)
        errors.push({
          field: 'dueDate',
          message: `이전 조각 "${late.title}"(${dayjs(late.dueDate).format('M/D')})보다 빨라요.`,
        })
    }
    return {
      key: piece.key,
      shownMinutes,
      over: shownMinutes >= LIMIT_MINUTES,
      stage: piece.selected ? rankOf(piece.key) : null,
      before,
      errors,
      orderChoices: selected
        .filter((other) => other.key !== piece.key)
        .map((other) => ({
          key: other.key,
          title: other.title,
          blocked: !piece.after.includes(other.key) && wouldLoop(pieces, piece.key, other.key),
        })),
    }
  })
  const made = checked.filter((p) => p.stage !== null)
  const problemCount = made.filter((p) => p.errors.length > 0).length
  return {
    pieces: checked,
    selectedCount: made.length,
    totalMinutes: made.reduce((sum, p) => sum + p.shownMinutes, 0),
    overCount: made.filter((p) => p.over).length,
    problemCount,
    canApply: made.length > 0 && problemCount === 0,
    limits: {
      titleMax: 20,
      descriptionMax: 2000,
      minutesMin: 5,
      minutesMax: 1440,
      dueMin: today,
      dueMax: proposal.originDue,
    },
  }
}

/** 응답이 오는 데 걸리는 시간을 흉내 낸다. */
export const checkSplitDraft = (proposal: SplitProposal, pieces: DraftPiece[]) =>
  new Promise<SplitCheck>((resolve) =>
    window.setTimeout(() => resolve(compute(proposal, pieces)), 350),
  )
