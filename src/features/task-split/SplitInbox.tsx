import dayjs from 'dayjs'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Modal from '@shared/components/common/Modal'
import { Link, useNavigate } from 'react-router-dom'
import WorkspaceIcon from '@shared/components/common/WorkspaceIcon'
import { useToast } from '@contexts/ToastContext'
import { inInbox, splitActions, useNoticeUnread, useSplit, type SplitRequest } from './store'
import { useSplitCommands } from './splitConfirm'
import './task-split.css'

const ago = (at: number) => {
  const minutes = Math.max(1, Math.round((Date.now() - at) / 60_000))
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}시간 전`
  return `${Math.round(minutes / 60 / 24)}일 전`
}
const FAILURE: Record<NonNullable<SplitRequest['failure']>, string> = {
  PROVIDER: 'AI 제공자가 응답하지 않았어요.',
  UNPARSEABLE: '받은 제안을 읽을 수 없었어요.',
  TIMEOUT: '처리 시간이 너무 오래 걸렸어요.',
}

/** 제안이 준비되면 알린다. 실제로는 푸시 알림이 하는 일이다. */
export const SplitNotifier = () => {
  const { requests } = useSplit()
  const { addToast } = useToast()
  const seen = useRef(new Map(requests.map((r) => [r.id, r.status])))
  useEffect(() => {
    requests.forEach((request) => {
      const before = seen.current.get(request.id)
      if (before === 'PROCESSING' && request.status === 'READY')
        addToast(`"${request.taskTitle}" 쪼개기 제안이 준비됐어요.`, 'success')
      seen.current.set(request.id, request.status)
    })
  }, [requests, addToast])
  return null
}

/**
 * 상단 바의 알림함. 알림은 "무슨 일이 있었다"만 알리고, 누르면 그 일이 있는 화면으로 보낸다.
 * 요청을 취소하거나 버리는 일은 쪼개기 보관함 화면의 몫이다.
 */
export const NoticeButton = () => {
  const unread = useNoticeUnread()
  const { notices } = useSplit()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }
  return (
    <>
      <button
        className="top-bar__icon-button split-topbar"
        aria-label={`알림${unread ? `, 새 알림 ${unread}개` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="알림"
        onClick={() => setOpen(!open)}
      >
        <WorkspaceIcon name="bell" />
        {unread > 0 && <span className="split-badge">{unread}</span>}
      </button>
      {open &&
        createPortal(
          <Modal
            backdropClassName="split-panel__backdrop"
            className="split-panel"
            ariaLabel="알림"
            sheet
            onClose={() => setOpen(false)}
          >
            <header className="split-panel__head">
              <h2>알림</h2>
              <span />
              {unread > 0 && (
                <button className="split-panel__link" onClick={splitActions.readAllNotices}>
                  모두 읽음
                </button>
              )}
              <button aria-label="닫기" onClick={() => setOpen(false)}>
                <WorkspaceIcon name="close" />
              </button>
            </header>
            {notices.length === 0 ? (
              <p className="split-panel__empty">새 알림이 없어요.</p>
            ) : (
              <ul className="notice-list">
                {notices.map((notice) => (
                  <li key={notice.id}>
                    <button
                      className="notice"
                      data-unread={!notice.read || undefined}
                      onClick={() => {
                        splitActions.readNotice(notice.id)
                        go(
                          notice.kind === 'READY'
                            ? `/app/tasks/splits/${notice.requestId}`
                            : '/app/tasks/splits',
                        )
                      }}
                    >
                      <span className="notice__icon" data-kind={notice.kind}>
                        <WorkspaceIcon name={notice.kind === 'READY' ? 'split' : 'warning'} />
                      </span>
                      <span className="notice__body">
                        <strong>
                          {notice.kind === 'READY'
                            ? '쪼개기 제안이 준비됐어요'
                            : '쪼개기를 끝내지 못했어요'}
                        </strong>
                        <span>{notice.taskTitle}</span>
                        <small>{ago(notice.at)}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button className="split-panel__foot" onClick={() => go('/app/tasks/splits')}>
              쪼개기 보관함 열기
            </button>
          </Modal>,
          document.querySelector('.workspace-theme') ?? document.body,
        )}
    </>
  )
}

/** 작업 목록 머리의 고정 입구. 진행 중이거나 준비된 요청 수를 함께 보여 준다. */
export const SplitInboxLink = () => {
  const count = useSplit().requests.filter(inInbox).length
  return (
    <Link className="workspace-button split-inbox-link" to="/app/tasks/splits">
      <WorkspaceIcon name="split" />
      쪼개기 보관함
      {count > 0 && <span className="split-inbox-link__count">{count}</span>}
    </Link>
  )
}

const Row = ({ request, onGo }: { request: SplitRequest; onGo?: () => void }) => {
  const navigate = useNavigate()
  const commands = useSplitCommands()
  const pieces = request.proposal?.pieces ?? []
  const kept = pieces.filter((p) => !p.excluded).length
  const dropped = pieces.length - kept
  return (
    <li
      className="split-row"
      data-status={request.status}
      data-unread={request.unread || undefined}
    >
      <div className="split-row__main">
        <span className="split-row__state">
          {request.status === 'READY' && '준비됨'}
          {request.status === 'PROCESSING' && (
            <>
              <span className="split-spinner" aria-hidden /> 쪼개는 중
            </>
          )}
          {request.status === 'FAILED' && '실패'}
        </span>
        <strong className="split-row__title">{request.taskTitle}</strong>
        <p className="split-row__note">
          {request.status === 'READY' &&
            `조각 ${kept}개${dropped ? ` · 뺀 조각 ${dropped}개` : ''} · ${dayjs(request.expiresAt).format('M/D')}까지 보관`}
          {request.status === 'PROCESSING' && `${ago(request.requestedAt)} 요청`}
          {request.status === 'FAILED' &&
            `${FAILURE[request.failure ?? 'PROVIDER']} 오늘 횟수는 돌려 드렸어요.`}
        </p>
      </div>
      <div className="split-row__actions">
        {request.status === 'READY' && (
          <button
            className="workspace-button workspace-button--primary"
            onClick={() => {
              onGo?.()
              navigate(`/app/tasks/splits/${request.id}`)
            }}
          >
            제안 보기
          </button>
        )}
        {request.status === 'PROCESSING' && (
          <button className="workspace-button" onClick={() => void commands.cancel(request.id)}>
            취소
          </button>
        )}
        {request.status !== 'PROCESSING' && (
          <button
            className="workspace-button"
            onClick={() =>
              // 실패 항목은 잃을 것이 없으므로 묻지 않고 치운다.
              request.status === 'READY'
                ? void commands.discard(request.id)
                : splitActions.discard(request.id)
            }
          >
            버리기
          </button>
        )}
      </div>
    </li>
  )
}

export default function SplitInboxPage() {
  const { requests, quota } = useSplit()
  const shown = requests.filter(inInbox)
  useEffect(() => {
    // 보관함을 열면 실패 알림도 읽음이 된다.
    splitActions.readFailedNotices()
    // 실패 항목은 목록에서 읽은 것으로 본다. 준비된 제안은 열어야 읽음이 된다.
    shown.filter((r) => r.status === 'FAILED').forEach((r) => splitActions.read(r.id))
  })
  return (
    <section className="split-page">
      <header className="split-page__header">
        <div>
          <p className="task-page__eyebrow">작업</p>
          <h1 className="task-page__title">쪼개기 보관함</h1>
        </div>
        <p className="split-page__quota">
          오늘 {quota.limit}번 중 {quota.limit - quota.used}번 남음
        </p>
      </header>
      {shown.length === 0 ? (
        <div className="split-empty">
          <p>보관함이 비어 있어요.</p>
          <p>4시간이 넘는 큰 작업을 열고 "쪼개기"를 눌러 보세요.</p>
          <Link className="workspace-button" to="/app/tasks">
            작업 목록으로
          </Link>
        </div>
      ) : (
        <ul className="split-list">
          {shown.map((request) => (
            <Row key={request.id} request={request} />
          ))}
        </ul>
      )}
    </section>
  )
}
