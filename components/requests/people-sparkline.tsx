import { formatPoints } from "../../lib/board-model/people"
import { formatDay } from "./request-ui"

/**
 * Weekly shipped points as small bars. `max` is shared by every card so the
 * bars compare across people.
 */
export function PeopleSparkline({
  weeks,
  values,
  max,
  fill,
  name,
  today,
}: {
  /** Mondays, oldest first. */
  weeks: string[]
  values: number[]
  max: number
  fill: string
  name: string
  today: string
}) {
  const barW = 8
  const gap = 3
  const height = 48
  const width = Math.max(1, weeks.length * (barW + gap) - gap)
  const nonZero = values
    .map((v, i) => (v > 0 ? `${formatDay(weeks[i], today)} ${formatPoints(v)}` : ""))
    .filter(Boolean)
  const label =
    nonZero.length > 0
      ? `${name}, shipped points per week: ${nonZero.join(", ")}. Other weeks 0.`
      : `${name} shipped nothing in these weeks.`

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block h-12 w-full"
    >
      <line
        x1={0}
        x2={width}
        y1={height - 0.5}
        y2={height - 0.5}
        stroke="var(--muted-foreground)"
        strokeOpacity={0.4}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {values.map((v, i) => {
        const h = v > 0 && max > 0 ? Math.max(3, (v / max) * (height - 2)) : 0
        return h > 0 ? (
          <rect
            key={weeks[i]}
            x={i * (barW + gap)}
            y={height - h}
            width={barW}
            height={h}
            fill={fill}
            stroke="#000"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`Week of ${formatDay(weeks[i], today)}: ${formatPoints(v)} pts`}</title>
          </rect>
        ) : null
      })}
    </svg>
  )
}
