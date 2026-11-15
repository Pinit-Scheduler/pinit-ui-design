import { useId, useState, type ReactNode } from 'react'

/** 화면에 쓰는 말. 코드와 문서에서는 사이클이라고 부른다(2026-11-15 결정). */
export const CYCLE = '순환'

/**
 * 용어 옆의 "?" 표시. 마우스를 올리거나, 키보드로 초점을 주거나, 누르면(모바일) 설명이 뜬다.
 * Esc나 바깥을 누르면 닫힌다.
 */
export function TermHelp({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  const [pinned, setPinned] = useState(false)
  return (
    <span className="term-help" data-open={pinned || undefined}>
      <button
        type="button"
        className="term-help__mark"
        aria-label={`${label} 설명`}
        aria-describedby={id}
        aria-expanded={pinned}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setPinned((open) => !open)
        }}
        onBlur={() => setPinned(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !pinned) return
          event.stopPropagation()
          setPinned(false)
        }}
      >
        ?
      </button>
      <span role="tooltip" id={id} className="term-help__tip">
        {children}
      </span>
    </span>
  )
}

/** 순환(사이클)이 무엇이고 왜 막는지. 쪼개기 화면 어디서든 같은 설명을 쓴다. */
export function CycleHelp() {
  return (
    <TermHelp label={CYCLE}>
      <strong>{CYCLE}이란?</strong>
      선후관계가 한 바퀴 돌아 처음으로 돌아오는 것이에요.
      <span className="term-help__example">A → B → C → A</span>
      이러면 서로 앞 작업이 끝나기를 기다리기만 해서 어느 것도 시작할 수 없어요. 그래서{' '}
      {CYCLE}이 생기는 연결은 고를 수 없어요.
    </TermHelp>
  )
}
