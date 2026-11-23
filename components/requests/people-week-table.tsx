import { cn } from "../../lib/utils"
import { formatPoints } from "../../lib/board-model/people"
import type { PersonColor } from "./people-colors"
import { formatDay } from "./request-ui"

export type WeekColumn = {
  key: string
  name: string
  color: PersonColor
  /** Shipped points per week, aligned with `weeks`. */
  weekly: number[]
}

/** Week by week shipped points: rows are weeks (newest first), columns people. */
export function PeopleWeekTable({
  weeks,
  columns,
  today,
}: {
  /** Mondays, oldest first. */
  weeks: string[]
  columns: WeekColumn[]
  today: string
}) {
  const totals = weeks.map((_, i) => columns.reduce((s, c) => s + c.weekly[i], 0))
  const max = Math.max(0, ...columns.flatMap((c) => c.weekly))
  const currentWeek = weeks.at(-1)
  const order = weeks.map((_, i) => i).reverse()

  return (
    <div className="max-h-[560px] overflow-auto border-2 border-black bg-background">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <caption className="sr-only">
          Points shipped to main each week, per person. Newest week first.
        </caption>
        <thead className="sticky top-0 z-10 bg-muted">
          <tr className="border-b-2 border-black">
            <th scope="col" className="px-3 py-2.5 text-left">
              <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Week of
              </span>
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" className="px-3 py-2.5 text-left">
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  <span aria-hidden className={cn("size-2.5 shrink-0 border border-black", c.color.bg)} />
                  <span className="whitespace-nowrap">{c.name}</span>
                </span>
              </th>
            ))}
            <th scope="col" className="px-3 py-2.5 text-right">
              <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Total
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {order.map((i) => (
            <tr key={weeks[i]} className="border-b border-black/30 last:border-b-0 dark:border-white/10">
              <th scope="row" className="px-3 py-2 text-left font-mono text-xs font-semibold whitespace-nowrap">
                {formatDay(weeks[i], today)}
                {weeks[i] === currentWeek ? (
                  <span className="ml-1.5 font-normal text-muted-foreground">now</span>
                ) : null}
              </th>
              {columns.map((c) => {
                const v = c.weekly[i]
                return (
                  <td key={c.key} className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-2.5 w-full max-w-24 min-w-10 bg-muted">
                        {v > 0 ? (
                          <span
                            className={cn("block h-full border border-black", c.color.bg)}
                            style={{ width: `${Math.max(6, (v / max) * 100)}%` }}
                          />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "w-8 shrink-0 text-right font-mono text-xs tabular-nums",
                          v > 0 ? "font-semibold" : "text-muted-foreground"
                        )}
                      >
                        {formatPoints(v)}
                      </span>
                    </span>
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-mono text-xs font-bold whitespace-nowrap tabular-nums">
                {formatPoints(totals[i])} pts
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
