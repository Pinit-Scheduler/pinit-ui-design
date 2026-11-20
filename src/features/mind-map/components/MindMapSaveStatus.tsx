import { SAVE_LABELS } from '../model/saveMachine'
import type { SaveStatus } from '../model/saveMachine'

type Props = {
  status: SaveStatus
  failure: string | null
  onRetry: () => void
}

/** 저장 상태. 저장하지 못했으면 이유 한 줄과 `다시 시도`. */
export default function MindMapSaveStatus({ status, failure, onRetry }: Props) {
  const failed = status === 'failed'
  return (
    <div className={`mind-map-save mind-map-save--${status}`} role="status">
      <span className="mind-map-save__label">{SAVE_LABELS[status]}</span>
      {failed && failure && (
        <span className="mind-map-save__reason" title={failure}>
          {failure}
        </span>
      )}
      {failed && (
        <button type="button" className="mind-map-save__retry" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}
