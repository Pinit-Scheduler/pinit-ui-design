import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import WorkspaceIcon from '@shared/components/common/WorkspaceIcon'
import Modal from '@shared/components/common/Modal'
import { FIBONACCI_DIFFICULTIES } from '@constants/difficulty'
import { useToast } from '@contexts/ToastContext'
import { useTaskCache } from '@contexts/TaskCacheContext'
import { createTask, deleteTask, fetchTaskDetail } from '@features/tasks/api/tasks'
import { getRequestFailureMessage } from '@shared/api/errorMessage'
import { toApiDateWithOffset } from '@shared/utils/datetime'
import { dispatchTaskChanged } from '@shared/utils/events'
import { formatMinutesLabel, minutesToIsoDuration } from '@shared/utils/isoDuration'
import { splitActions, useSplit } from './store'
import {
  checkSplitDraft,
  type CheckedPiece,
  type DraftPiece,
  type SplitCheck,
  type SplitField,
  type SplitFieldError,
} from './mockSplitCheck'
import SplitMap from './SplitMap'
import { useSplitCommands } from './splitConfirm'
import { CYCLE, CycleHelp, TermHelp } from './TermHelp'
import { restoreTask } from '@features/trash/api/trash'
import { UNDO_TOAST_MS } from '@features/trash/hooks/useTrashUndo'
import './task-split.css'

// 이 화면은 규칙을 계산하지 않는다. 고치는 중인 조각을 통째로 보내고(checkSplitDraft),
// 받은 결과(보정 후 시간, 단계, 이어진 순서, 칸별 오류, 만들 수 있는지)만 그린다.

type Rejection = 'UNEXPECTED' | 'FORBIDDEN' | 'EXPIRED'

/** 만들기를 되돌린다. 만든 조각을 지우고 원본을 휴지통에서 꺼낸 뒤 제안을 다시 준비됨으로 돌린다. */
const undoSplitApply = async (
  requestId: number,
  made: { createdIds: number[]; originId: number },
) => {
  for (const taskId of [...made.createdIds].reverse()) await deleteTask(taskId)
  await restoreTask(made.originId)
  dispatchTaskChanged({ reason: 'split-undone' })
  splitActions.revive(requestId, 'READY')
}

const excludedNote = (piece: DraftPiece) =>
  piece.excluded &&
  (piece.excluded.kind === 'OVERLAP'
    ? `"${piece.excluded.evidence}" 작업과 겹칠 수 있어요.`
    : `"${piece.excluded.evidence}"에서 이미 끝냈을 수 있어요.`)

function PieceSummary({
  piece,
  info,
  titleOf,
}: {
  piece: DraftPiece
  info: CheckedPiece
  titleOf: (key: string) => string
}) {
  return (
    <>
      <div className="split-piece__meta">
        <span data-warn={info.over || undefined}>
          {info.over && <WorkspaceIcon name="warning" />}
          {formatMinutesLabel(info.shownMinutes)}
          {info.shownMinutes !== piece.minutes && (
            <small> 입력 {formatMinutesLabel(piece.minutes)}</small>
          )}
        </span>
        <span>난이도 {piece.difficulty}</span>
        <span>{dayjs(piece.dueDate).format('M/D')} 마감</span>
      </div>
      {info.before.length > 0 && (
        <p className="split-piece__before">이전 조각: {info.before.map(titleOf).join(', ')}</p>
      )}
      {piece.excluded && <p className="split-piece__note">{excludedNote(piece)}</p>}
      {info.over && (
        <p className="split-piece__note" data-warn>
          4시간 이상이에요. 그대로 만들 수 있지만 더 나누면 계획에 넣기 쉬워요.
        </p>
      )}
      {info.errors.map((error) => (
        <p key={error.field} className="split-piece__problem" role="alert">
          {error.message}
        </p>
      ))}
    </>
  )
}

/** 조각 내용 창. 보기에서 "고치기"를 누르면 폼이 되고, "확인"을 누를 때 서버 검사를 받는다. */
function PieceDialog({
  piece,
  info,
  limits,
  titleOf,
  startEditing,
  busy,
  onClose,
  onRemove,
  onSave,
}: {
  piece: DraftPiece
  info: CheckedPiece
  limits: SplitCheck['limits']
  titleOf: (key: string) => string
  startEditing: boolean
  busy: boolean
  onClose: () => void
  onRemove: () => void
  /** 통과하면 null, 아니면 서버가 준 칸별 오류 */
  onSave: (next: DraftPiece) => Promise<SplitFieldError[] | null>
}) {
  const [form, setForm] = useState<DraftPiece | null>(startEditing ? piece : null)
  const [errors, setErrors] = useState<SplitFieldError[]>(startEditing ? info.errors : [])
  const errorOf = (field: SplitField) => {
    const error = errors.find((item) => item.field === field)
    return error ? (
      <small className="split-form__error" role="alert">
        {error.message}
      </small>
    ) : null
  }
  const set = (next: Partial<DraftPiece>) => setForm((prev) => (prev ? { ...prev, ...next } : prev))
  return createPortal(
    <Modal
      backdropClassName="split-dialog__backdrop split-dialog__backdrop--sheet"
      className="split-dialog split-dialog--piece"
      ariaLabel="조각 내용"
      sheet
      closeOnBackdrop={!form}
      onClose={busy ? undefined : onClose}
    >
      <header className="split-dialog__head">
        <h2>{form ? '조각 고치기' : '조각 내용'}</h2>
        <button aria-label="닫기" disabled={busy} onClick={onClose}>
          <WorkspaceIcon name="close" />
        </button>
      </header>
      {form ? (
        <form
          className="split-form"
          onSubmit={(event) => {
            event.preventDefault()
            void onSave(form).then((failed) => {
              if (failed) setErrors(failed)
              else {
                setForm(null)
                setErrors([])
              }
            })
          }}
        >
          <label>
            제목
            <input
              value={form.title}
              maxLength={limits.titleMax}
              onChange={(event) => set({ title: event.target.value })}
            />
            {errorOf('title')}
          </label>
          <div className="split-form__row">
            <label>
              예상 시간(분)
              <input
                type="number"
                step={5}
                inputMode="numeric"
                value={form.minutes || ''}
                onChange={(event) => set({ minutes: Number(event.target.value) })}
              />
            </label>
            <label>
              난이도
              <select
                value={form.difficulty}
                onChange={(event) => set({ difficulty: Number(event.target.value) })}
              >
                {FIBONACCI_DIFFICULTIES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              마감
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => set({ dueDate: event.target.value })}
              />
            </label>
          </div>
          {errorOf('minutes')}
          {errorOf('dueDate')}
          {info.orderChoices.length > 0 && (
            <fieldset>
              <legend>
                이전 조각
                <TermHelp label="이전 조각">
                  <strong>이전 조각이란?</strong>이 조각을 시작하기 전에 끝내야 하는 조각이에요.
                  고른 조각을 모두 끝내야 이 조각을 시작할 수 있어요.
                </TermHelp>
              </legend>
              {info.orderChoices.map((choice) => (
                <label key={choice.key} className="split-form__check">
                  <input
                    type="checkbox"
                    checked={form.after.includes(choice.key)}
                    disabled={choice.blocked}
                    onChange={(event) =>
                      set({
                        after: event.target.checked
                          ? [...form.after, choice.key]
                          : form.after.filter((key) => key !== choice.key),
                      })
                    }
                  />
                  {choice.title}
                  {choice.blocked && (
                    <small>
                      {' '}
                      {CYCLE}이 생겨요 <CycleHelp />
                    </small>
                  )}
                </label>
              ))}
              {errorOf('after')}
            </fieldset>
          )}
          <label>
            설명
            <textarea
              rows={9}
              maxLength={limits.descriptionMax}
              value={form.description}
              onChange={(event) => set({ description: event.target.value })}
            />
            <small>
              {form.description.length} / {limits.descriptionMax.toLocaleString()}
            </small>
            {errorOf('description')}
          </label>
          <div className="split-dialog__actions">
            <button
              type="button"
              className="workspace-button"
              disabled={busy}
              onClick={() => {
                setForm(null)
                setErrors([])
              }}
            >
              취소
            </button>
            <button className="workspace-button workspace-button--primary" disabled={busy}>
              {busy ? '확인하는 중…' : '확인'}
            </button>
          </div>
        </form>
      ) : (
        <div className="split-piece split-piece--plain">
          <div className="split-piece__body">
            <div className="split-piece__head">
              <strong>{piece.title || '제목 없음'}</strong>
            </div>
            <PieceSummary piece={piece} info={info} titleOf={titleOf} />
            <p className="split-piece__text">{piece.description}</p>
            <div className="split-dialog__actions">
              <button className="workspace-button" disabled={busy} onClick={onRemove}>
                빼기
              </button>
              <button
                className="workspace-button workspace-button--primary"
                disabled={busy}
                onClick={() => {
                  setForm(piece)
                  setErrors(info.errors)
                }}
              >
                고치기
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>,
    // 페이지 영역 밖에 그려야 미니 플레이어와 하단 탭 위로 올라온다.
    document.querySelector('.workspace-theme') ?? document.body,
  )
}

export default function SplitProposalPage() {
  const id = Number(useParams().requestId)
  const request = useSplit().requests.find((r) => r.id === id)
  const proposal = request?.proposal
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { removeTask, setTask } = useTaskCache()
  const commands = useSplitCommands()
  const [pieces, setPieces] = useState<DraftPiece[]>(
    () =>
      // 만들기를 되돌리고 돌아온 제안은 고치던 그대로 연다.
      request?.draft ?? (proposal?.pieces ?? []).map((p) => ({ ...p, selected: !p.excluded })),
  )
  // 지금 화면에 있는 조각(pieces)에 대한 서버 검사 결과. 둘은 항상 같이 바뀐다.
  const [check, setCheck] = useState<SplitCheck | null>(null)
  // 되돌리기용 기록. 조각을 바꿀 때마다 바꾸기 전 모습(조각과 그 검사 결과)을 쌓는다.
  const [history, setHistory] = useState<{ pieces: DraftPiece[]; check: SplitCheck }[]>([])
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [dialog, setDialog] = useState<{ key: string; editing: boolean } | null>(null)
  const [applying, setApplying] = useState(false)
  // 시안 전용: "만들기"를 서버가 어떻게 답할지 고른다. 실제로는 서버가 정한다.
  const [outcome, setOutcome] = useState<'OK' | Rejection>('OK')
  const [rejected, setRejected] = useState<Rejection | null>(null)
  // 거부 안내는 지도 위에 생긴다. 아래쪽 "만들기"를 누른 사람에게 보이도록 그 자리로 올린다.
  const rejectRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (rejected) rejectRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [rejected])
  useEffect(() => {
    if (request?.status === 'READY') {
      splitActions.read(id)
      // 어느 길로 들어왔든 제안을 열면 그 알림은 읽은 것이다.
      splitActions.readNoticesOf(id)
    }
  }, [id, request?.status])
  useEffect(() => {
    // 실제로는 제안을 여는 응답에 첫 검사 결과가 같이 온다.
    let alive = true
    if (proposal && !check)
      void checkSplitDraft(proposal, pieces).then((result) => alive && setCheck(result))
    return () => {
      alive = false
    }
  }, [proposal, check, pieces])

  if (!request || !proposal || (request.status !== 'READY' && request.status !== 'APPLIED'))
    return (
      <section className="split-page">
        <div className="split-empty">
          <p>이 제안은 더 이상 볼 수 없어요.</p>
          <Link className="workspace-button" to="/app/tasks/splits">
            보관함으로
          </Link>
        </div>
      </section>
    )

  // 만든 뒤에는 결과를 따로 알리는 화면을 두지 않는다. 조각이 있는 작업 맵으로 바로 보낸다.
  if (request.status === 'APPLIED') return <Navigate to="/app/task-map" replace />

  if (rejected === 'EXPIRED')
    return (
      <section className="split-page">
        <div className="split-done">
          <span className="split-done__mark split-done__mark--muted">
            <WorkspaceIcon name="clock" />
          </span>
          <h1>보관 기간이 끝난 제안이에요</h1>
          <p>
            제안은 7일 동안만 보관해요. 아무것도 만들어지지 않았고, 원본 "{request.taskTitle}"은
            그대로 있으며 다시 고칠 수 있어요.
          </p>
          <div className="split-done__actions">
            <Link
              className="workspace-button workspace-button--primary"
              to={`/app/tasks/${request.taskId}`}
            >
              원본 열어 다시 쪼개기
            </Link>
            <Link className="workspace-button" to="/app/tasks/splits">
              보관함으로
            </Link>
          </div>
        </div>
      </section>
    )

  if (!check)
    return (
      <section className="split-page">
        <div className="split-empty" role="status">
          <p>제안을 불러오는 중이에요.</p>
        </div>
      </section>
    )

  const info = (key: string) => check.pieces.find((p) => p.key === key)!
  const titleOf = (key: string) => pieces.find((p) => p.key === key)?.title ?? ''
  const made = pieces
    .filter((p) => p.selected)
    .sort((a, b) => (info(a.key).stage ?? 0) - (info(b.key).stage ?? 0))
  const dropped = pieces.filter((p) => !p.selected)
  const stages: DraftPiece[][] = []
  made.forEach((p) => (stages[info(p.key).stage ?? 0] ??= []).push(p))
  const shownDialog = dialog && made.find((p) => p.key === dialog.key)

  /** 바뀐 조각 전체를 보내 검사받는다. accept가 false를 주면 화면에 반영하지 않는다. */
  // 토스트의 되돌리기는 나중에 눌린다. 그때의 기록을 보도록 최신 backTo를 가리키게 한다.
  const send = async (next: DraftPiece[], accept: (result: SplitCheck) => boolean = () => true) => {
    setBusy(true)
    try {
      const result = await checkSplitDraft(proposal, next)
      if (accept(result)) {
        setHistory((prev) => [...prev, { pieces, check }])
        setPieces(next)
        setCheck(result)
      }
      return result
    } finally {
      setBusy(false)
    }
  }
  const replace = (key: string, next: Partial<DraftPiece>) =>
    pieces.map((p) => (p.key === key ? { ...p, ...next } : p))
  /** 기록의 depth번째 모습으로 돌아간다. 검사 결과를 함께 쌓아 두어 서버를 다시 부르지 않는다. */
  const backTo = (depth: number) => {
    const snapshot = history[depth]
    if (!snapshot) return
    setDialog(null)
    setPieces(snapshot.pieces)
    setCheck(snapshot.check)
    setHistory(history.slice(0, depth))
  }
  /** 바꾼 직후 "되돌리기"를 띄운다. 설명 대신, 해 보고 아니면 되돌리게 한다. */
  const offerUndo = (message: string) => {
    // 토스트의 되돌리기는 나중에 눌린다. 바꾸기 전 모습을 지금 잡아 둔다.
    const snapshot = { pieces, check }
    const depth = history.length
    addToast(message, 'success', {
      durationMs: UNDO_TOAST_MS,
      action: {
        label: '되돌리기',
        onAction: () => {
          setDialog(null)
          setPieces(snapshot.pieces)
          setCheck(snapshot.check)
          setHistory((prev) => prev.slice(0, depth))
        },
      },
    })
  }
  const remove = (key: string) => {
    setDialog(null)
    offerUndo(`"${titleOf(key)}" 조각을 뺐어요.`)
    void send(replace(key, { selected: false }))
  }
  const restore = (key: string) => {
    offerUndo(`"${titleOf(key)}" 조각을 다시 넣었어요.`)
    void send(replace(key, { selected: true }))
  }
  const save = async (next: DraftPiece) => {
    const errorsOf = (result: SplitCheck) =>
      result.pieces.find((p) => p.key === next.key)?.errors ?? []
    const result = await send(replace(next.key, next), (r) => errorsOf(r).length === 0)
    if (errorsOf(result).length) return errorsOf(result)
    offerUndo('조각을 고쳤어요.')
    return null
  }

  const apply = async () => {
    setApplying(true)
    if (outcome !== 'OK') {
      // 서버가 거부했다. 아무것도 만들어지지 않았다.
      await new Promise((resolve) => window.setTimeout(resolve, 400))
      // 예상 밖 거부(선후관계 순환 등)는 전용 안내 없이 일반 오류로 알린다.
      if (outcome === 'UNEXPECTED')
        addToast('만들지 못했어요. 아무것도 바뀌지 않았어요. 잠시 뒤 다시 시도해 주세요.', 'error')
      else setRejected(outcome)
      setApplying(false)
      return
    }
    setRejected(null)
    try {
      const origin = await fetchTaskDetail(request.taskId)
      const created = new Map<string, number>()
      // 앞 조각부터 만든다. 단계 순서가 곧 만드는 순서다.
      for (const piece of made) {
        const task = await createTask({
          title: piece.title.trim(),
          description: piece.description.trim(),
          dueDate: toApiDateWithOffset(piece.dueDate),
          importance: origin.importance,
          difficulty: piece.difficulty,
          expectedDuration: minutesToIsoDuration(piece.minutes),
          spaceId: origin.spaceId,
          projectId: origin.projectId,
          addDependencies: info(piece.key).before.map((key) => ({
            fromId: created.get(key)!,
            toId: 0,
          })),
        })
        created.set(piece.key, task.id)
        setTask(task)
      }
      await deleteTask(origin.id, false, origin.version)
      removeTask(origin.id)
      dispatchTaskChanged({ reason: 'split-applied' })
      const done = { createdIds: [...created.values()], originId: origin.id }
      splitActions.applied(id, done, pieces)
      // 결과는 작업 맵에서 바로 본다. 마음에 안 들면 되돌려 제안으로 돌아온다.
      navigate('/app/task-map')
      addToast(`조각 ${done.createdIds.length}개를 만들었어요.`, 'success', {
        durationMs: UNDO_TOAST_MS,
        action: {
          label: '되돌리기',
          onAction: () => {
            void undoSplitApply(id, done)
              .then(() => navigate(`/app/tasks/splits/${id}`))
              .catch((err) =>
                addToast(getRequestFailureMessage(err, '되돌리지 못했어요.'), 'error'),
              )
          },
        },
      })
    } catch (err) {
      addToast(
        getRequestFailureMessage(err, '적용하지 못했어요. 아무것도 바뀌지 않았어요.'),
        'error',
      )
    } finally {
      setApplying(false)
    }
  }

  const card = (piece: DraftPiece) => (
    <article
      key={piece.key}
      className="split-piece"
      data-problem={info(piece.key).errors.length > 0 || undefined}
    >
      <div className="split-piece__body">
        <div className="split-piece__head">
          <strong>{piece.title || '제목 없음'}</strong>
          <span className="split-piece__tools">
            <button
              className="split-piece__edit"
              disabled={busy}
              onClick={() => setDialog({ key: piece.key, editing: true })}
            >
              고치기
            </button>
            <button
              className="split-piece__edit split-piece__edit--quiet"
              disabled={busy}
              onClick={() => remove(piece.key)}
            >
              빼기
            </button>
          </span>
        </div>
        <PieceSummary piece={piece} info={info(piece.key)} titleOf={titleOf} />
        <details className="split-piece__desc">
          <summary>목적·진행 방법·완료 기준</summary>
          <p>{piece.description}</p>
        </details>
      </div>
    </article>
  )

  return (
    <section className="split-page split-page--proposal" aria-busy={busy || undefined}>
      <header className="split-page__header">
        <div>
          <p className="task-page__eyebrow">쪼개기 제안</p>
          <h1 className="task-page__title">{request.taskTitle}</h1>
          <p className="split-page__origin">
            원본 {formatMinutesLabel(proposal.originMinutes)} ·{' '}
            {dayjs(proposal.originDue).format('M/D')} 마감 ·{' '}
            {dayjs(request.expiresAt).format('M/D')}까지 보관
          </p>
          <p className="split-page__compare">
            원본 {formatMinutesLabel(proposal.originMinutes)} → 조각 합계{' '}
            <strong>{formatMinutesLabel(check.totalMinutes)}</strong>
          </p>
        </div>
        <button
          className="workspace-button split-page__discard"
          disabled={applying}
          onClick={() =>
            void commands.discard(id).then((done) => done && navigate('/app/tasks/splits'))
          }
        >
          제안 버리기
        </button>
      </header>
      {rejected === 'FORBIDDEN' && (
        <div className="split-reject" role="alert" ref={rejectRef}>
          <WorkspaceIcon name="warning" />
          <div>
            <strong>만들지 못했어요. 이제 관리자만 할 수 있어요</strong>
            <p>
              쪼개면 원본이 휴지통으로 가는데, 이 스페이스에서 삭제는 관리자만 할 수 있어요. 그사이
              내 권한이 바뀌었어요. 관리자 Pinit 팀님에게 부탁하거나 제안을 버려 주세요. 버리면 원본
              잠금이 풀려요.
            </p>
          </div>
        </div>
      )}

      <div className="split-toolbar">
        <div className="split-view" role="group" aria-label="보기 방식">
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}>
            지도
          </button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
            목록
          </button>
        </div>
        <button
          className="split-view__undo"
          disabled={history.length === 0 || busy}
          onClick={() => backTo(history.length - 1)}
        >
          되돌리기
        </button>
        <button
          className="split-view__undo"
          disabled={history.length === 0 || busy}
          onClick={() => backTo(0)}
        >
          처음 제안으로
        </button>
        {busy && (
          <span className="split-view__busy" role="status">
            <span className="split-spinner" aria-hidden /> 확인하는 중
          </span>
        )}
      </div>

      {view === 'map' ? (
        <>
          <SplitMap
            pieces={made.map((piece) => ({
              key: piece.key,
              title: piece.title,
              minutes: piece.minutes,
              shownMinutes: info(piece.key).shownMinutes,
              over: info(piece.key).over,
              stage: info(piece.key).stage ?? 0,
              difficulty: piece.difficulty,
              dueDate: piece.dueDate,
              after: info(piece.key).before,
              problem: info(piece.key).errors.length > 0,
            }))}
            activeKey={shownDialog?.key ?? null}
            onActivate={(key) => setDialog({ key, editing: false })}
            onRemove={remove}
          />
        </>
      ) : (
        <ol className="split-stages">
          {stages.filter(Boolean).map((stage, index) => (
            <li key={stage.map((p) => p.key).join()} className="split-stage">
              <div className="split-stage__label">
                <span>{index + 1}</span>
              </div>
              <div className="split-stage__pieces">{stage.map(card)}</div>
            </li>
          ))}
        </ol>
      )}

      {shownDialog && (
        <PieceDialog
          key={shownDialog.key}
          piece={shownDialog}
          info={info(shownDialog.key)}
          limits={check.limits}
          titleOf={titleOf}
          startEditing={dialog!.editing}
          busy={busy}
          onClose={() => setDialog(null)}
          onRemove={() => remove(shownDialog.key)}
          onSave={save}
        />
      )}

      {dropped.length > 0 && (
        <section className="split-dropped">
          <h2>뺀 조각 {dropped.length}개</h2>
          <ul>
            {dropped.map((piece) => (
              <li key={piece.key}>
                <div>
                  <strong>{piece.title}</strong>
                  <span>
                    {piece.excluded
                      ? `${piece.excluded.kind === 'DONE' ? '이미 끝낸 것 같아요' : '겹치는 작업이 있어요'} · ${piece.excluded.evidence} (${piece.excluded.note})`
                      : `내가 뺌 · ${formatMinutesLabel(info(piece.key).shownMinutes)}`}
                  </span>
                </div>
                <button
                  className="workspace-button"
                  disabled={busy}
                  onClick={() => restore(piece.key)}
                >
                  다시 넣기
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="split-apply">
        <div className="split-apply__summary" aria-live="polite">
          <strong>
            {check.selectedCount}개 · {formatMinutesLabel(check.totalMinutes)}
          </strong>
          <span data-warn={check.problemCount > 0 || check.overCount > 0 || undefined}>
            {check.problemCount > 0
              ? `고칠 곳 ${check.problemCount}개`
              : check.overCount > 0
                ? `4시간 이상 ${check.overCount}개`
                : ''}
          </span>
        </div>
        <button
          className="workspace-button workspace-button--primary"
          disabled={!check.canApply || busy || applying || rejected === 'FORBIDDEN'}
          onClick={() => void apply()}
        >
          {applying ? '만드는 중…' : '만들기'}
        </button>
      </footer>

      <label className="split-demo">
        시안 전용 · "만들기"를 누르면 서버가
        <select
          value={outcome}
          onChange={(event) => {
            setOutcome(event.target.value as 'OK' | Rejection)
            setRejected(null)
          }}
        >
          <option value="OK">만들어 줌</option>
          <option value="UNEXPECTED">거부: 예상 밖 오류(순환 등)</option>
          <option value="FORBIDDEN">거부: 권한이 바뀜</option>
          <option value="EXPIRED">거부: 제안 만료</option>
        </select>
      </label>
    </section>
  )
}
