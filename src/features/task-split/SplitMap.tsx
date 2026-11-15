import dayjs from 'dayjs'
import { useEffect, useId, useMemo, useState } from 'react'
import WorkspaceIcon from '@shared/components/common/WorkspaceIcon'
import useMediaQuery from '@shared/hooks/useMediaQuery'
import { formatMinutesLabel } from '@shared/utils/isoDuration'
import '@features/task-map/TaskMapPage.css'

export type MapPiece = {
  key: string
  title: string
  minutes: number
  /** 보정 후 시간 */
  shownMinutes: number
  over: boolean
  /** 몇 번째 단계인지(0부터). 서버가 준 값 */
  stage: number
  difficulty: number
  dueDate: string
  /** 지도에 있는 조각 중 바로 앞에 오는 조각 */
  after: string[]
  problem: boolean
}

const PAD = 16

/**
 * 만들 조각만 그리는 작은 지도. 선과 카드 모양은 작업 맵의 것을 쓰고, 카드만 작게 배치한다.
 * 넓은 화면은 왼쪽에서 오른쪽으로, 좁은 화면은 위에서 아래로 흐른다(작업 맵과 같다).
 * 단계와 이어진 순서는 서버가 준 값을 그대로 놓기만 한다.
 */
export default function SplitMap({
  pieces,
  activeKey,
  onActivate,
  onRemove,
}: {
  pieces: MapPiece[]
  activeKey: string | null
  onActivate: (key: string) => void
  onRemove: (key: string) => void
}) {
  const mobile = useMediaQuery('(max-width:760px)')
  const markerId = useId().replace(/:/g, '')
  // 지도 상자의 안쪽 너비. 카드를 이 너비에 맞춰 줄여 가로 스크롤을 피한다.
  const [box, setBox] = useState<HTMLDivElement | null>(null)
  const [room, setRoom] = useState(0)
  useEffect(() => {
    if (!box) return
    const observer = new ResizeObserver(() => setRoom(box.clientWidth))
    observer.observe(box)
    return () => observer.disconnect()
  }, [box])
  const layout = useMemo(() => {
    const layers: MapPiece[][] = []
    pieces.forEach((piece) => (layers[piece.stage] ??= []).push(piece))
    const across = Math.max(1, ...layers.map((layer) => layer.length))
    const height = 92,
      gapAcross = 12
    /** count개가 room에 들어가는 카드 너비. min보다 작아지면 줄이지 않고 스크롤에 맡긴다. */
    const fit = (count: number, gap: number, min: number, max: number) =>
      room
        ? Math.max(min, Math.min(max, Math.floor((room - PAD * 2 - (count - 1) * gap) / count)))
        : max
    const roomy = !room || layers.length * 184 + (layers.length - 1) * 44 + PAD * 2 <= room
    const gapAlong = mobile ? 30 : roomy ? 44 : 28
    const width = mobile ? fit(across, gapAcross, 120, 150) : fit(layers.length, gapAlong, 148, 184)
    const span = (count: number, size: number, gap: number) => count * size + (count - 1) * gap
    const nodes = layers.flatMap((layer, along) =>
      layer.map((piece, index) => {
        // 한 단계의 조각 수가 적으면 가운데로 모은다.
        const lead =
          (span(across, mobile ? width : height, gapAcross) -
            span(layer.length, mobile ? width : height, gapAcross)) /
          2
        const a = PAD + along * ((mobile ? height : width) + gapAlong)
        const b = PAD + lead + index * ((mobile ? width : height) + gapAcross)
        return { piece, rank: along, x: mobile ? b : a, y: mobile ? a : b }
      }),
    )
    const at = new Map(nodes.map((node) => [node.piece.key, node]))
    const edges = nodes.flatMap((to) =>
      to.piece.after.flatMap((key) => {
        const from = at.get(key)
        if (!from) return []
        const x1 = mobile ? from.x + width / 2 : from.x + width,
          y1 = mobile ? from.y + height : from.y + height / 2,
          x2 = mobile ? to.x + width / 2 : to.x,
          y2 = mobile ? to.y : to.y + height / 2
        const d = mobile
          ? `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2 - 2}`
          : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2 - 2},${y2}`
        return [{ key: `${key}:${to.piece.key}`, from: key, to: to.piece.key, d }]
      }),
    )
    const alongSize = span(layers.length, mobile ? height : width, gapAlong) + PAD * 2
    const acrossSize = span(across, mobile ? width : height, gapAcross) + PAD * 2
    return {
      nodes,
      edges,
      width,
      height,
      worldWidth: mobile ? acrossSize : alongSize,
      worldHeight: mobile ? alongSize : acrossSize,
    }
  }, [pieces, mobile, room])

  if (pieces.length === 0)
    return (
      <div className="split-map split-map--empty">
        만들 조각이 없어요. 아래에서 조각을 다시 넣어 주세요.
      </div>
    )
  return (
    <div className="split-map" ref={setBox}>
      <div
        className="split-map__canvas"
        style={{ width: layout.worldWidth, height: layout.worldHeight }}
      >
        <svg
          className="tm-edges"
          width={layout.worldWidth}
          height={layout.worldHeight}
          aria-hidden="true"
        >
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 Z" />
            </marker>
          </defs>
          {layout.edges.map((edge) => (
            <path
              key={edge.key}
              className={
                edge.from === activeKey || edge.to === activeKey ? 'tm-edge--active' : undefined
              }
              d={edge.d}
              markerEnd={`url(#${markerId})`}
            />
          ))}
        </svg>
        {layout.nodes.map(({ piece, x, y }) => {
          const over = piece.over
          const active = piece.key === activeKey
          return (
            <div
              key={piece.key}
              className="tm-node-slot"
              data-selected={active || undefined}
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${x}px,${y}px)`,
              }}
            >
              <article
                className={`tm-node split-map__node${active ? ' tm-node--selected' : ''}`}
                data-problem={piece.problem || undefined}
                onClick={() => onActivate(piece.key)}
              >
                <button type="button" className="split-map__title" aria-pressed={active}>
                  {piece.title || '제목 없음'}
                </button>
                <button
                  type="button"
                  className="split-map__remove"
                  aria-label={`${piece.title} 빼기`}
                  title="빼기"
                  onClick={(event) => {
                    event.stopPropagation()
                    onRemove(piece.key)
                  }}
                >
                  <WorkspaceIcon name="close" />
                </button>
                <span className="split-map__meta" data-warn={over || undefined}>
                  {over && <WorkspaceIcon name="warning" />}
                  {formatMinutesLabel(piece.shownMinutes)}
                  <time dateTime={piece.dueDate}>{dayjs(piece.dueDate).format('M/D')}</time>
                </span>
              </article>
            </div>
          )
        })}
      </div>
    </div>
  )
}
