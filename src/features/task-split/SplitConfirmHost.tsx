import { useId, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Modal from '@shared/components/common/Modal'
import { answerSplitConfirm, currentSplitConfirm, subscribeSplitConfirm } from './splitConfirm'
import './task-split.css'

/** 확인 창이 그려지는 자리. 앱 셸에 한 번만 둔다. */
export function SplitConfirmHost() {
  const ask = useSyncExternalStore(subscribeSplitConfirm, currentSplitConfirm)
  const titleId = useId()
  const bodyId = useId()
  if (!ask) return null
  return createPortal(
    <Modal
      backdropClassName="split-dialog__backdrop"
      className="split-dialog split-dialog--confirm"
      labelledBy={titleId}
      describedBy={bodyId}
      onClose={() => answerSplitConfirm(false)}
    >
      <h2 id={titleId}>{ask.title}</h2>
      <p id={bodyId} className="split-dialog__lead">
        {ask.body}
      </p>
      <div className="split-dialog__actions">
        <button className="workspace-button" onClick={() => answerSplitConfirm(false)}>
          {ask.cancelLabel}
        </button>
        <button
          className="workspace-button workspace-button--primary"
          onClick={() => answerSplitConfirm(true)}
        >
          {ask.confirmLabel}
        </button>
      </div>
    </Modal>,
    document.querySelector('.workspace-theme') ?? document.body,
  )
}
