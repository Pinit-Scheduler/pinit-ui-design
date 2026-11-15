import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import Modal from '@shared/components/common/Modal'
import { useToast } from '@contexts/ToastContext'
import { parseIsoDurationMinutes } from '@shared/utils/isoDuration'
import type { Task } from '@features/tasks/types/task'
import { isOpen, splitActions, useSplit } from './store'
import './task-split.css'

export const SPLIT_RECOMMEND_MINUTES = 240
export const taskMinutes = (task: Task) =>
  parseIsoDurationMinutes(task.effectiveExpectedDuration) ?? 0

/** 쪼개기를 시작한다. 처음이면 외부 전송 동의를 먼저 받는다(UC-01, UC-02). */
export const useSplitStart = () => {
  const { consented, quota, requests } = useSplit()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [pending, setPending] = useState<Task | null>(null)
  const titleId = useId()

  const send = (task: Task) => {
    if (quota.used >= quota.limit) {
      addToast('오늘 쪼개기 횟수를 다 썼어요. 자정에 다시 채워져요.', 'error')
      return
    }
    splitActions.request({
      id: task.id,
      title: task.title,
      minutes: taskMinutes(task),
      due: task.dueDate.date,
    })
    // 맡기는 순간 오늘 횟수를 쓴다. 실패하면 서버가 돌려준다. 되돌리기로 횟수가 돌아오지는 않으므로 여기에는 두지 않는다.
    addToast('쪼개기를 맡겼어요. 준비되면 알려 드릴게요.', 'success')
  }
  const start = (task: Task) => {
    const open = requests.find((r) => r.taskId === task.id && isOpen(r))
    if (open) {
      navigate(open.status === 'READY' ? `/app/tasks/splits/${open.id}` : '/app/tasks/splits')
      return
    }
    if (!consented) setPending(task)
    else send(task)
  }

  // 작업 상세(route-surface)는 안쪽을 잘라 낸다. 그 밖에 그려야 창이 잘리지 않는다.
  const dialog =
    pending &&
    createPortal(
      <Modal
        backdropClassName="split-dialog__backdrop"
        className="split-dialog"
        labelledBy={titleId}
        onClose={() => setPending(null)}
      >
        <h2 id={titleId}>쪼개기에 AI를 써요</h2>
        <p className="split-dialog__lead">
          작업을 나누려면 아래 내용을 외부 AI 제공자에게 보내야 해요. 처음 한 번만 물어봐요.
        </p>
        <dl className="split-dialog__list">
          <div>
            <dt>보내는 것</dt>
            <dd>
              이 작업의 제목·설명·마감·예상 시간, 스페이스 목적, 같은 프로젝트에서 최근 90일 동안
              내가 끝냈거나 아직 하고 있는 작업의 제목과 설명, 내 난이도별 시간 보정 값
            </dd>
          </div>
          <div>
            <dt>보내지 않는 것</dt>
            <dd>다른 참여자가 맡은 작업, 닉네임, 핀잇 안의 작업 번호</dd>
          </div>
          <div>
            <dt>결과</dt>
            <dd>제안은 보관함에 7일 동안 있어요. 하루 {quota.limit}번까지 요청할 수 있어요.</dd>
          </div>
        </dl>
        <div className="split-dialog__actions">
          <button className="workspace-button" onClick={() => setPending(null)}>
            나중에
          </button>
          <button
            className="workspace-button workspace-button--primary"
            onClick={() => {
              splitActions.consent()
              send(pending)
              setPending(null)
            }}
          >
            동의하고 쪼개기
          </button>
        </div>
      </Modal>,
      document.querySelector('.workspace-theme') ?? document.body,
    )
  return { start, dialog }
}
