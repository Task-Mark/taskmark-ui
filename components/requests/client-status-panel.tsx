import type * as React from "react"
import Link from "next/link"

import { cn } from "../../lib/utils"
import type { RequestBoardData } from "../../lib/board-model/request-types"
import { PACE_WEEKS } from "../../lib/board-model/request-forecast"
import { boardViewHref } from "../../lib/board-model/request-nav"
import {
  STATUS_PERIODS,
  STATUS_PERIOD_LABELS,
  buildClientStatus,
  type ClientStatus,
  type ShippedEntry,
} from "../../lib/board-model/client-status"
import { BurnupLegend, ClientStatusBurnup } from "./client-status-burnup"
import {
  Chip,
  EmptyNote,
  MonoLabel,
  Panel,
  RequestStatusChip,
  ScreenHeader,
  StageBar,
  formatDay,
  plural,
} from "./request-ui"

export type ClientStatusPanelProps = {
  data: RequestBoardData
  projectName: string
  /** `?period=`: `4w`, `12w` (default), `all`. */
  period: string | null
}

const MAX_NEXT = 5
const MAX_SHIPPED = 6

function pts(n: number): string {
  return `${Number(n.toFixed(1))} pts`
}

function requestHref(id: string): string {
  return boardViewHref({ view: "request", request: id, hasRequestBoard: true })
}

export function ClientStatusPanel({ data, projectName, period }: ClientStatusPanelProps) {
  const status = buildClientStatus(data, period)
  const { today } = status

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
      <ScreenHeader
        eyebrow={`${projectName} · as of ${formatDay(today)}`}
        title="What's happening"
        description="What the team is building now, what already shipped, and when the rest of what you asked for is likely to land. Only work that reached main counts as shipped."
        actions={<PeriodPicker current={status.period} />}
      />

      <KpiRow status={status} />

      <BurnupSection status={status} />

      <section className="flex flex-col gap-4" aria-labelledby="client-status-columns">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="client-status-columns" className="font-head text-2xl leading-tight">
            Now, next, shipped
          </h2>
          <Link
            href={boardViewHref({ view: "roadmap", hasRequestBoard: true })}
            className="inline-flex min-h-11 items-center text-sm font-bold underline-offset-4 hover:underline"
          >
            Open the roadmap
          </Link>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-3">
          <NowColumn status={status} />
          <NextColumn status={status} />
          <ShippedColumn status={status} />
        </div>
      </section>

      {data.legacyLeafCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {plural(data.legacyLeafCount, "task")} still sit outside any request and are not
          counted here.
        </p>
      ) : null}
    </div>
  )
}

function PeriodPicker({ current }: { current: ClientStatus["period"] }) {
  return (
    <nav
      aria-label="Period"
      className="flex flex-wrap gap-1 border-2 border-black bg-card p-1 shadow-[3px_3px_0_0_var(--shadow-color)]"
    >
      {STATUS_PERIODS.map((p) => {
        const active = p === current
        return (
          <Link
            key={p}
            href={boardViewHref({ view: "status", period: p, hasRequestBoard: true })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center border-2 px-3.5 text-sm font-semibold",
              active
                ? "border-black bg-primary text-primary-foreground shadow-[2px_2px_0_0_#000]"
                : "border-transparent hover:border-black"
            )}
          >
            {STATUS_PERIOD_LABELS[p]}
          </Link>
        )
      })}
    </nav>
  )
}

function periodPhrase(status: ClientStatus): string {
  return `since ${formatDay(status.start, status.today)}`
}

function Kpi({
  title,
  value,
  detail,
  icon,
  accent,
  highlight,
  compact,
}: {
  title: React.ReactNode
  value: React.ReactNode
  detail: React.ReactNode
  icon: React.ReactNode
  accent: string
  highlight?: boolean
  /** Smaller value text, for dates. */
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-h-40 flex-col gap-4 border-2 border-black p-5 shadow-[4px_4px_0_0_var(--shadow-color)]",
        highlight ? "bg-chart-2 text-black" : "bg-card text-card-foreground"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("text-[15px] leading-snug", highlight ? "font-bold" : "font-semibold")}>
          {title}
        </span>
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center border-2 border-black text-black shadow-[2px_2px_0_0_#000]",
            accent
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-auto">
        <div
          className={cn(
            "font-head leading-none tabular-nums",
            compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-[44px]"
          )}
        >
          {value}
        </div>
        <div
          className={cn(
            "mt-2 text-[13px]",
            highlight ? "font-semibold" : "text-muted-foreground"
          )}
        >
          {detail}
        </div>
      </div>
    </div>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      {children}
    </svg>
  )
}

function KpiRow({ status }: { status: ClientStatus }) {
  const inProgress = status.inDevelopment + status.inTesting
  const landing = status.nextLanding
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        title={`Shipped, ${STATUS_PERIOD_LABELS[status.period].toLowerCase()}`}
        value={status.shippedItems}
        detail={`${status.shippedItems === 1 ? "item" : "items"} · ${pts(status.shippedPoints)} on main ${periodPhrase(status)}`}
        accent="bg-chart-1"
        icon={
          <Icon>
            <path d="M5 12l5 5L20 7" />
          </Icon>
        }
      />
      <Kpi
        title="In progress"
        value={inProgress}
        detail={
          inProgress > 0
            ? `${inProgress === 1 ? "task" : "tasks"} · ${status.inTesting} in testing, ${status.inDevelopment} in development`
            : "tasks · nothing on a branch right now"
        }
        accent="bg-chart-3"
        icon={
          <Icon>
            <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
          </Icon>
        }
      />
      <Kpi
        title="Left to build"
        value={Number(status.leftPoints.toFixed(1))}
        detail={`pts · ${plural(status.leftItems, "item")} · ${plural(status.openRequests, "open request")}`}
        accent="bg-chart-4"
        icon={
          <Icon>
            <rect x="4" y="4" width="16" height="16" />
            <path d="M9 12h6" />
          </Icon>
        }
      />
      {landing ? (
        <Kpi
          highlight
          compact
          title={
            <Link href={requestHref(landing.request.id)} className="underline-offset-4 hover:underline">
              {landing.request.title} lands
            </Link>
          }
          value={formatDay(landing.forecast.likely, status.today)}
          detail={
            landing.forecast.late && landing.forecast.late !== landing.forecast.likely
              ? `likely · by ${formatDay(landing.forecast.late, status.today)} at a slower pace`
              : "likely, at the current pace"
          }
          accent="bg-white"
          icon={<CalendarIcon />}
        />
      ) : (
        <Kpi
          title="Next delivery"
          value="No date"
          detail={
            status.pace.pointsPerWeek > 0
              ? "nothing in progress has a size yet"
              : "not enough shipped work yet to forecast"
          }
          accent="bg-chart-2"
          icon={<CalendarIcon />}
        />
      )}
    </div>
  )
}

function CalendarIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  )
}

function BurnupSection({ status }: { status: ClientStatus }) {
  const { burnup, pace } = status
  const hasPace = pace.pointsPerWeek > 0
  const done = burnup.remaining <= 0
  const range =
    hasPace && !done
      ? `Remaining work likely lands around ${formatDay(burnup.likely, burnup.today)}` +
        (burnup.early && burnup.late
          ? `, between ${formatDay(burnup.early, burnup.today)} and ${formatDay(burnup.late, burnup.today)}.`
          : ".")
      : done
        ? "Everything asked for has shipped."
        : "Not enough shipped work yet to forecast."
  const label = `Burn-up chart. ${Number(burnup.shippedTotal.toFixed(1))} of ${Number(burnup.scope.toFixed(1))} points shipped to main. ${range}`

  return (
    <Panel className="flex flex-col gap-5 p-4 sm:p-6" aria-labelledby="client-status-burnup">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-xl flex-col gap-1.5">
          <h2 id="client-status-burnup" className="font-head text-2xl leading-tight">
            Done vs asked
          </h2>
          <p className="text-sm text-muted-foreground">
            Purple is what reached main. Pink is everything asked for today; scope history is not
            tracked, so it is drawn flat. The shaded cone is where the rest likely lands.
          </p>
        </div>
        <BurnupLegend />
      </div>
      <div className="flex flex-wrap items-stretch gap-6">
        <div className="min-w-0 flex-[999_1_560px]">
          <ClientStatusBurnup burnup={burnup} pace={pace} label={label} />
        </div>
        <ForecastAside status={status} />
      </div>
    </Panel>
  )
}

function ForecastAside({ status }: { status: ClientStatus }) {
  const { burnup, pace, today } = status
  const hasPace = pace.pointsPerWeek > 0
  const rows: [string, string, string, number][] = [
    ["Early", "bg-chart-4", burnup.early, pace.fastPointsPerWeek],
    ["Likely", "bg-chart-1", burnup.likely, pace.pointsPerWeek],
    ["Late", "bg-chart-2", burnup.late, pace.slowPointsPerWeek],
  ]
  return (
    <aside className="flex flex-[1_1_280px] flex-col gap-4 border-2 border-black bg-background p-5">
      <MonoLabel>Forecast · all open requests</MonoLabel>
      {burnup.remaining <= 0 ? (
        <>
          <div className="font-head text-4xl leading-none">Done</div>
          <p className="text-[13px] text-muted-foreground">
            Everything asked for so far has reached main.
          </p>
        </>
      ) : !hasPace ? (
        <>
          <div className="font-head text-3xl leading-tight">No date yet</div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Not enough shipped work yet to forecast. Dates appear once tasks reach main in a full
            week. {pts(burnup.remaining)} left to build.
          </p>
        </>
      ) : (
        <>
          <div className="font-head text-3xl leading-none">{formatDay(burnup.likely, today)}</div>
          <dl className="flex flex-col gap-2.5">
            {rows.map(([name, color, day, perWeek]) => (
              <div key={name} className="flex items-center justify-between gap-3 text-[13px]">
                <dt className="inline-flex items-center gap-2">
                  <span aria-hidden className={cn("size-3 border-2 border-black", color)} />
                  {name}
                </dt>
                <dd className="flex flex-col items-end font-mono">
                  <span>{day ? formatDay(day, today) : "no date"}</span>
                  <span className="text-[11px] text-muted-foreground">{pts(perWeek)} a week</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Based on {pts(pace.pointsPerWeek)} a week, the middle of the last{" "}
            {plural(pace.weeks.length || PACE_WEEKS, "full week")} on main. Early and late use the
            faster and slower weeks. {pts(burnup.remaining)} left in total.
          </p>
        </>
      )}
    </aside>
  )
}

function ColumnShell({
  title,
  count,
  headerClass,
  children,
  labelId,
}: {
  title: string
  count: string
  headerClass: string
  children: React.ReactNode
  labelId: string
}) {
  return (
    <Panel aria-labelledby={labelId} className="min-w-0">
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b-2 border-black px-4 py-3.5 text-black",
          headerClass
        )}
      >
        <h3 id={labelId} className="font-head text-[17px]">
          {title}
        </h3>
        <span className="font-mono text-xs">{count}</span>
      </div>
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </Panel>
  )
}

function IdChip({ id }: { id: string }) {
  return <Chip className="bg-muted font-normal text-foreground">{id}</Chip>
}

function NowColumn({ status }: { status: ClientStatus }) {
  return (
    <ColumnShell
      title="Now"
      count={`${status.now.length} in progress`}
      headerClass="bg-chart-3"
      labelId="client-status-now"
    >
      {status.now.length === 0 ? (
        <EmptyNote>Nothing is being built right now.</EmptyNote>
      ) : (
        status.now.map(({ request, forecast, activeToday }) => {
          const pct = request.points > 0 ? Math.round((request.shippedPoints / request.points) * 100) : 0
          return (
            <Link
              key={request.id}
              href={requestHref(request.id)}
              className="group flex flex-col gap-2.5 border-2 border-black bg-background p-3.5 hover:shadow-[3px_3px_0_0_var(--shadow-color)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <IdChip id={request.id} />
                {activeToday ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span aria-hidden className="size-2 border-2 border-black bg-chart-3" />
                    Activity today
                  </span>
                ) : null}
              </div>
              <div className="text-[15px] leading-snug font-semibold group-hover:underline">
                {request.title}
              </div>
              <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {request.shippedLeafCount} of {plural(request.leafCount, "task")} on main
                  {forecast?.likely ? ` · likely ${formatDay(forecast.likely, status.today)}` : ""}
                </span>
                <span className="font-mono">{pct}%</span>
              </div>
              <StageBar counts={request.stageCounts} />
            </Link>
          )
        })
      )}
    </ColumnShell>
  )
}

function NextColumn({ status }: { status: ClientStatus }) {
  const shown = status.next.slice(0, MAX_NEXT)
  const hidden = status.next.slice(MAX_NEXT)
  const lastHidden = hidden
    .map((q) => q.forecast?.likely ?? "")
    .filter(Boolean)
    .sort()
    .at(-1)
  return (
    <ColumnShell
      title="Next"
      count={`${status.next.length} queued`}
      headerClass="bg-chart-1"
      labelId="client-status-next"
    >
      {shown.length === 0 ? (
        <EmptyNote>Nothing queued after the current work.</EmptyNote>
      ) : (
        shown.map(({ request, forecast }) => (
          <Link
            key={request.id}
            href={requestHref(request.id)}
            className="group flex flex-col gap-2 border-2 border-black bg-background p-3.5 hover:shadow-[3px_3px_0_0_var(--shadow-color)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <IdChip id={request.id} />
              <RequestStatusChip status={request.status} />
            </div>
            <div className="text-[15px] leading-snug font-semibold group-hover:underline">
              {request.title}
            </div>
            <div className="text-xs text-muted-foreground">
              {request.leafCount === 0
                ? "Not sized yet"
                : `${pts(forecast?.remainingPoints ?? request.points)} · ${
                    forecast?.likely
                      ? `likely ${formatDay(forecast.likely, status.today)}`
                      : "no date yet"
                  }`}
            </div>
          </Link>
        ))
      )}
      {hidden.length > 0 ? (
        <p className="px-0.5 text-[13px] text-muted-foreground">
          + {plural(hidden.length, "more request")}
          {lastHidden ? `, the last one likely ${formatDay(lastHidden, status.today)}` : ""}
        </p>
      ) : null}
    </ColumnShell>
  )
}

function ShippedColumn({ status }: { status: ClientStatus }) {
  const shown = status.shipped.slice(0, MAX_SHIPPED)
  const more = status.shipped.length - shown.length
  return (
    <ColumnShell
      title="Shipped"
      count={`${status.shippedItems} on main ${status.period === "all" ? "so far" : `in ${STATUS_PERIOD_LABELS[status.period]}`}`}
      headerClass="bg-chart-4"
      labelId="client-status-shipped"
    >
      {shown.length === 0 ? (
        <EmptyNote>Nothing reached main in this period.</EmptyNote>
      ) : (
        <ol className="flex flex-col gap-3">
          {shown.map((entry) => (
            <li key={`${entry.kind}-${entry.id}`}>
              <ShippedRow entry={entry} today={status.today} />
            </li>
          ))}
        </ol>
      )}
      {more > 0 ? (
        <p className="px-0.5 text-[13px] text-muted-foreground">
          + {more} more in this period
        </p>
      ) : null}
    </ColumnShell>
  )
}

function ShippedRow({ entry, today }: { entry: ShippedEntry; today: string }) {
  const href = requestHref(entry.kind === "request" ? entry.id : entry.requestId)
  const meta =
    entry.kind === "request"
      ? `${entry.shippedLeaves} of ${plural(entry.leafCount, "task")} · ${formatDay(entry.day, today)}`
      : `${entry.requestTitle} · ${formatDay(entry.day, today)}`
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 border-2 border-black bg-background p-3.5 hover:shadow-[3px_3px_0_0_var(--shadow-color)]"
    >
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center border-2 border-black bg-chart-4 text-black"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[15px] leading-snug font-semibold group-hover:underline">
          {entry.title}
          {entry.kind === "request" ? (
            <span className="ml-2 align-middle">
              <Chip className="bg-chart-4 text-black">Request</Chip>
            </span>
          ) : null}
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono">{entry.id}</span> · {meta}
        </span>
      </span>
    </Link>
  )
}
