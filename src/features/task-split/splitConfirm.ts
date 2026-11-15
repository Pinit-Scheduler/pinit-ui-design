import { useToast } from '@contexts/ToastContext'
import { UNDO_TOAST_MS } from '@features/trash/hooks/useTrashUndo'
import { splitActions } from './store'

// 비용이 걸린 동작(쪼개기 맡기기, 요청 취소, 제안 버리기)은 확인 창으로 한 번 확인받는다.
// 그 밖의 동작은 확인 없이 바로 반영하고 되돌리기를 준다.

export type SplitAsk = { title: string; body: string; confirmLabel: string; cancelLabel: string }
let current: (SplitAsk & { resolve: (ok: boolean) => void }) | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export const subscribeSplitConfirm = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export const currentSplitConfirm = () => current
export const answerSplitConfirm = (ok: boolean) => {
  current?.resolve(ok)
  current = null
  emit()
}

/** 확인 창을 띄우고 답을 기다린다. 이미 떠 있는 창이 있으면 그 창은 "아니오"로 닫는다. */
export const askSplitConfirm = (ask: SplitAsk) =>
  new Promise<boolean>((resolve) => {
    current?.resolve(false)
    current = { ...ask, resolve }
    emit()
  })

/** 요청 취소와 제안 버리기. 보관함, 작업 상세, 제안 화면이 같은 동작을 쓴다. */
export const useSplitCommands = () => {
  const { addToast } = useToast()
  return {
    /** 쪼개는 중인 요청을 거둔다. 횟수가 돌아오지 않고, 되살리면 AI를 다시 부르므로 되돌리기가 없다. */
    cancel: async (requestId: number) => {
      const ok = await askSplitConfirm({
        title: '쪼개기 요청을 취소할까요?',
        body: '취소해도 오늘 횟수는 돌아오지 않아요.',
        confirmLabel: '요청 취소',
        cancelLabel: '그대로 두기',
      })
      if (!ok) return false
      splitActions.cancel(requestId)
      addToast('쪼개기 요청을 취소했어요.', 'success')
      return true
    },
    /** 준비된 제안을 버린다. 이미 쓴 횟수는 돌아오지 않는다. 버린 뒤에는 되돌릴 수 있다. */
    discard: async (requestId: number) => {
      const ok = await askSplitConfirm({
        title: '제안을 버릴까요?',
        body: '이미 쓴 횟수는 돌아오지 않아요. 원본 작업은 그대로 남아요.',
        confirmLabel: '제안 버리기',
        cancelLabel: '그대로 두기',
      })
      if (!ok) return false
      splitActions.discard(requestId)
      addToast('제안을 버렸어요.', 'success', {
        durationMs: UNDO_TOAST_MS,
        action: { label: '되돌리기', onAction: () => splitActions.revive(requestId, 'READY') },
      })
      return true
    },
  }
}
