import { cn } from "../../lib/utils"
import {
  addDays,
  daysBetween,
  type Pace,
} from "../../lib/board-model/request-forecast"
import { niceCeil, type Burnup } from "../../lib/board-model/client-status"
import { formatDay } from "./request-ui"

/**
 * Burn-up chart as inline SVG: cumulative points that reached `main` per
 * week, the current total scope as a flat line, and a forecast cone from
 * today at the fast, median and slow pace. Server-component friendly.
 */

type Size = {
  width: number
  height: number
  left: number
  right: number
  top: number
  bottom: number
  maxTicks: number
  font: number
}

const WIDE: Size = { width: 760, height: 300, left: 44, right: 16, top: 30, bottom: 28, maxTicks: 10, font: 11 }
const NARROW: Size = { width: 360, height: 260, left: 38, right: 10, top: 30, bottom: 26, maxTicks: 5, font: 11 }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function xTicks(start: string, end: string, max: number): { day: string; label: string }[] {
  const months: string[] = []
  const [y0, m0] = start.split("-").map(Number)
  for (let y = y0, m = m0 + 1; ; m += 1) {
    if (m > 12) {
      m = 1
      y += 1
    }
    const day = `${y}-${String(m).padStart(2, "0")}-01`
    if (day > end) break
    months.push(day)
  }
  if (months.length >= 3) {
    const step = Math.ceil(months.length / max)
    return months
      .filter((_, i) => i % step === 0)
      .map((day) => {
        const [y, m] = day.split("-").map(Number)
        return { day, label: m === 1 ? `${MONTHS[0]} ${y}` : MONTHS[m - 1] }
      })
  }
  const weeks = Math.max(1, Math.floor(daysBetween(start, end) / 7))
  const step = Math.max(1, Math.ceil(weeks / max))
  const out: { day: string; label: string }[] = []
  for (let day = start; day <= end; day = addDays(day, 7 * step)) {
    out.push({ day, label: formatDay(day) })
  }
  return out
}

function BurnupSvg({
  burnup,
  pace,
  size,
  label,
  className,
}: {
  burnup: Burnup
  pace: Pace
  size: Size
  label: string
  className?: string
}) {
  const { width, height, left, right, top, bottom, font } = size
  const plotW = width - left - right
  const plotH = height - top - bottom
  const span = Math.max(1, daysBetween(burnup.start, burnup.end))
  const yStep = Math.max(1, niceCeil((Math.max(burnup.scope, burnup.shippedTotal) * 1.08) / 4))
  const yMax = yStep * 4
  const x = (day: string) => left + (daysBetween(burnup.start, day) / span) * plotW
  const y = (points: number) => top + plotH * (1 - points / yMax)
  const fmt = (n: number) => Number(n.toFixed(1)).toString()

  const yTicks = [0, 1, 2, 3, 4].map((i) => yStep * i)
  const ticks = xTicks(burnup.start, burnup.end, size.maxTicks)

  const todayX = x(burnup.today)
  const shippedY = y(burnup.shippedTotal)
  const scopeY = y(burnup.scope)
  const line = burnup.shipped.map((p) => `${fmt(x(p.day))},${fmt(y(p.points))}`).join(" ")
  const area = `${fmt(x(burnup.start))},${fmt(y(0))} ${line} ${fmt(todayX)},${fmt(y(0))}`

  const forecastable = pace.pointsPerWeek > 0 && burnup.remaining > 0
  const ahead = daysBetween(burnup.today, burnup.end)
  /** Where a pace meets the scope, or where it leaves the chart. */
  const reach = (perWeek: number, date: string) => {
    if (perWeek > 0 && date && date <= burnup.end) {
      return { x: x(date), y: scopeY, inside: true }
    }
    const points = burnup.shippedTotal + (perWeek * ahead) / 7
    return { x: x(burnup.end), y: y(Math.min(points, burnup.scope)), inside: false }
  }
  const fast = reach(pace.fastPointsPerWeek, burnup.early)
  const median = reach(pace.pointsPerWeek, burnup.likely)
  const slow = reach(pace.slowPointsPerWeek, burnup.late)
  const cone: string[] = [`${fmt(todayX)},${fmt(shippedY)}`, `${fmt(fast.x)},${fmt(fast.y)}`]
  if (fast.inside && !slow.inside) cone.push(`${fmt(x(burnup.end))},${fmt(scopeY)}`)
  cone.push(`${fmt(slow.x)},${fmt(slow.y)}`)

  const tagW = 54
  const tagX = Math.min(Math.max(todayX - tagW / 2, left), width - right - tagW)
  const shippedLabelLeft = todayX - left > 120
  const likelyLabel = formatDay(burnup.likely, burnup.today)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={cn("block h-auto w-full", className)}
    >
      <g stroke="var(--muted-foreground)" strokeOpacity={0.25} strokeWidth={1} shapeRendering="crispEdges">
        {yTicks.map((t) => (
          <line key={t} x1={left} x2={width - right} y1={y(t)} y2={y(t)} />
        ))}
      </g>
      <g fontFamily="var(--font-mono, monospace)" fontSize={font} fill="var(--muted-foreground)" textAnchor="end">
        {yTicks.map((t) => (
          <text key={t} x={left - 6} y={y(t) + 4}>
            {fmt(t)}
          </text>
        ))}
      </g>
      <g fontFamily="var(--font-mono, monospace)" fontSize={font} fill="var(--muted-foreground)" textAnchor="middle">
        {ticks.map((t) => (
          <text key={t.day} x={x(t.day)} y={height - 8}>
            {t.label}
          </text>
        ))}
      </g>

      <polygon points={area} fill="var(--chart-1)" fillOpacity={0.16} />
      {forecastable ? (
        <polygon points={cone.join(" ")} fill="var(--chart-1)" fillOpacity={0.3} />
      ) : null}

      <line
        x1={left}
        x2={width - right}
        y1={scopeY}
        y2={scopeY}
        stroke="var(--chart-2)"
        strokeWidth={3}
      />
      <polyline
        points={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={3}
        strokeLinejoin="miter"
      />

      {forecastable ? (
        <line
          x1={todayX}
          y1={shippedY}
          x2={median.x}
          y2={median.y}
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeDasharray="6 5"
        />
      ) : null}

      <line
        x1={todayX}
        x2={todayX}
        y1={top - 4}
        y2={y(0)}
        stroke="var(--chart-3)"
        strokeWidth={2}
        strokeDasharray="4 4"
      />
      <rect x={tagX} y={2} width={tagW} height={18} fill="var(--chart-3)" stroke="#000" strokeWidth={2} />
      <text
        x={tagX + tagW / 2}
        y={15}
        fontFamily="var(--font-mono, monospace)"
        fontSize={10}
        fontWeight={600}
        fill="#000"
        textAnchor="middle"
      >
        TODAY
      </text>

      {forecastable && median.inside ? (
        <>
          <rect
            x={median.x - 6}
            y={median.y - 6}
            width={12}
            height={12}
            transform={`rotate(45 ${fmt(median.x)} ${fmt(median.y)})`}
            fill="var(--chart-3)"
            stroke="#000"
            strokeWidth={2}
          />
          <text
            x={Math.min(median.x, width - right - 24)}
            y={median.y + 24}
            fontFamily="var(--font-mono, monospace)"
            fontSize={font + 1}
            fill="var(--foreground)"
            textAnchor="middle"
          >
            {likelyLabel}
          </text>
        </>
      ) : null}

      <text
        x={left + 6}
        y={scopeY - 7}
        fontFamily="var(--font-mono, monospace)"
        fontSize={font}
        fill="var(--chart-2)"
        textAnchor="start"
      >
        {`${fmt(burnup.scope)} pts asked`}
      </text>
      <text
        x={shippedLabelLeft ? todayX - 10 : todayX + 10}
        y={Math.max(shippedY + (shippedY - scopeY < 30 ? 18 : -8), top + 30)}
        fontFamily="var(--font-mono, monospace)"
        fontSize={font}
        fill="var(--chart-1)"
        textAnchor={shippedLabelLeft ? "end" : "start"}
      >
        {`${fmt(burnup.shippedTotal)} shipped`}
      </text>
    </svg>
  )
}

export function ClientStatusBurnup({
  burnup,
  pace,
  label,
}: {
  burnup: Burnup
  pace: Pace
  label: string
}) {
  return (
    <div className="min-w-0 border-2 border-black bg-background px-2 pt-3 pb-1">
      <BurnupSvg burnup={burnup} pace={pace} size={WIDE} label={label} className="hidden sm:block" />
      <BurnupSvg burnup={burnup} pace={pace} size={NARROW} label={label} className="sm:hidden" />
    </div>
  )
}

export function BurnupLegend() {
  const items: [string, string][] = [
    ["bg-chart-1", "Shipped"],
    ["bg-chart-2", "Asked for"],
    ["bg-chart-1/30", "Forecast range"],
    ["bg-chart-3", "Today"],
  ]
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {items.map(([color, text]) => (
        <li key={text} className="inline-flex items-center gap-2">
          <span aria-hidden className={cn("size-3.5 border-2 border-black", color)} />
          {text}
        </li>
      ))}
    </ul>
  )
}
