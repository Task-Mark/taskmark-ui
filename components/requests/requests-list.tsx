import Link from "next/link"

import { cn } from "../../lib/utils"
import { boardViewHref } from "../../lib/board-model/request-nav"
import {
  forecastRequests,
  PACE_WEEKS,
  shippedPace,
  type RequestForecast,
} from "../../lib/board-model/request-forecast"
import {
  lastLogAt,
  linkedRequests,
  openQuestionCount,
  readForecast,
  relationLabel,
  REQUEST_GROUPS,
  type ForecastRead,
} from "../../lib/board-model/request-page"
import type {
  RequestBoardData,
  RequestDetail,
} from "../../lib/board-model/request-types"
import { RequestGroupFilter, type RequestGroupSection } from "./request-group-filter"
import {
  Chip,
  EmptyNote,
  formatDay,
  MonoLabel,
  Panel,
  PersonBadge,
  plural,
  RequestStatusChip,
  ScreenHeader,
  StageBar,
} from "./request-ui"

export type RequestsListProps = {
  data: RequestBoardData
  projectName: string
}

function requestHref(id: string): string {
  return boardViewHref({ view: "request", request: id, hasRequestBoard: true })
}

/** Makes a heading link cover its whole card; other links sit above it. */
const STRETCHED_LINK =
  "after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ring"

function progressLine(request: RequestDetail): string {
  const c = request.stageCounts
  const parts = [`${request.shippedLeafCount} of ${plural(request.leafCount, "task")} shipped`]
  if (c.testing > 0) parts.push(`${c.testing} in testing`)
  if (c.development > 0) parts.push(`${c.development} in development`)
  return parts.join(" · ")
}

function StatTile({
  value,
  label,
  swatch,
}: {
  value: number
  label: string
  swatch: string
}) {
  return (
    <div className="flex items-center gap-3 border-2 border-black bg-card p-3 sm:p-4 shadow-[4px_4px_0_0_var(--shadow-color)]">
      <span aria-hidden className={cn("w-3 self-stretch border-2 border-black", swatch)} />
      <div className="flex flex-col gap-1">
        <span className="font-head text-3xl leading-none">{value}</span>
        <span className="text-[13px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function People({ request }: { request: RequestDetail }) {
  const people = [...request.requestedBy, ...request.owners].filter(
    (p, i, all) => all.findIndex((q) => q.name === p.name) === i
  )
  if (people.length === 0) return null
  return (
    <span className="flex items-center gap-1">
      {people.slice(0, 4).map((p) => (
        <PersonBadge key={p.email || p.name} name={p.name} className="size-6 text-[9px]" />
      ))}
    </span>
  )
}

function RequestLinks({
  data,
  request,
}: {
  data: RequestBoardData
  request: RequestDetail
}) {
  const links = linkedRequests(data, request)
  if (links.length === 0) return null
  return (
    <ul aria-label="Linked requests" className="relative z-10 flex flex-wrap gap-1.5">
      {links.map((link, i) => (
        <li key={`${link.ref}-${link.relation}-${i}`}>
          {link.request ? (
            <Link
              href={requestHref(link.request.id)}
              className="inline-flex min-h-8 items-center gap-1 border-2 border-black bg-background px-2 text-xs hover:bg-muted"
            >
              <span className="text-muted-foreground">{relationLabel(link.relation, link.direction)}</span>
              <span className="font-mono font-semibold">{link.request.id}</span>
            </Link>
          ) : (
            <span className="inline-flex min-h-8 items-center gap-1 border-2 border-dashed border-muted-foreground/50 px-2 text-xs">
              <span className="text-muted-foreground">{relationLabel(link.relation, link.direction)}</span>
              <span className="font-mono">{link.ref}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function DateBlock({ read, asOf }: { read: ForecastRead; asOf: string }) {
  if (read.kind === "dated") {
    return (
      <div className="flex flex-col gap-0.5">
        <MonoLabel>Likely done</MonoLabel>
        <span className="font-head text-xl leading-tight whitespace-nowrap">{formatDay(read.likely, asOf)}</span>
        {read.early && read.late && read.early !== read.late ? (
          <span className="text-xs text-muted-foreground">
            Between {formatDay(read.early, asOf)} and {formatDay(read.late, asOf)}
          </span>
        ) : null}
        {read.committed ? (
          <span className={cn("text-xs", read.atRisk ? "font-bold text-destructive" : "text-muted-foreground")}>
            {read.atRisk ? "At risk: promised " : "Promised "}
            {formatDay(read.committed, asOf)}
          </span>
        ) : null}
      </div>
    )
  }
  const label =
    read.kind === "unsized"
      ? "Not sized yet"
      : read.kind === "no-pace"
        ? "No date yet"
        : read.kind === "done-remaining"
          ? "Nothing left"
          : ""
  const hint =
    read.kind === "unsized"
      ? "A date appears once it has tasks"
      : read.kind === "no-pace"
        ? `Nothing shipped in the last ${PACE_WEEKS} weeks to set a pace`
        : read.kind === "done-remaining"
          ? "Every task is in production"
          : ""
  const committed = "committed" in read ? read.committed : ""
  return (
    <div className="flex flex-col gap-0.5">
      <MonoLabel>Likely done</MonoLabel>
      <span className="font-head text-lg leading-tight">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      {committed ? (
        <span className="text-xs text-muted-foreground">Promised {formatDay(committed, asOf)}</span>
      ) : null}
    </div>
  )
}

function ActiveCard({
  data,
  request,
  forecast,
}: {
  data: RequestBoardData
  request: RequestDetail
  forecast: RequestForecast | undefined
}) {
  const read = readForecast(request, forecast)
  const questions = openQuestionCount(request)
  const lastAt = lastLogAt(request)
  return (
    <Panel className="relative flex flex-wrap items-center gap-x-7 gap-y-5 p-5 transition-transform hover:-translate-y-px">
      <div className="flex min-w-0 flex-[3_1_320px] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <RequestStatusChip status={request.status} />
          <span className="font-mono text-[11px] text-muted-foreground">{request.id}</span>
          {lastAt ? (
            <span className="text-xs text-muted-foreground">Last log {formatDay(lastAt, data.asOf)}</span>
          ) : null}
        </div>
        <h3 className="font-head text-xl leading-snug">
          <Link href={requestHref(request.id)} className={STRETCHED_LINK}>
            {request.title}
          </Link>
        </h3>
        {request.goal ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{request.goal}</p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-[2_1_220px] flex-col gap-1.5">
        {request.leafCount > 0 ? (
          <>
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>{progressLine(request)}</span>
              <span className="font-mono">
                {request.shippedPoints} of {request.points} pts
              </span>
            </div>
            <StageBar counts={request.stageCounts} className="h-4" />
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Not split into tasks yet</span>
        )}
        <RequestLinks data={data} request={request} />
      </div>
      <div className="flex-[1_1_140px]">
        <DateBlock read={read} asOf={data.asOf} />
      </div>
      <div className="flex flex-[1_1_120px] flex-col items-start gap-2">
        {questions > 0 ? (
          <Chip className="bg-chart-3 text-black">{plural(questions, "open question")}</Chip>
        ) : null}
        <People request={request} />
      </div>
    </Panel>
  )
}

function ProposedCard({
  data,
  request,
}: {
  data: RequestBoardData
  request: RequestDetail
}) {
  const questions = openQuestionCount(request)
  const askedBy = request.requestedBy.map((p) => p.name).join(", ")
  return (
    <Panel className="relative flex flex-col gap-3 p-4.5">
      <div className="flex flex-wrap items-center gap-2">
        <RequestStatusChip status={request.status} />
        <span className="font-mono text-[11px] text-muted-foreground">{request.id}</span>
      </div>
      <h3 className="font-head text-lg leading-snug">
        <Link href={requestHref(request.id)} className={STRETCHED_LINK}>
          {request.title}
        </Link>
      </h3>
      {request.goal ? <p className="text-sm text-muted-foreground">{request.goal}</p> : null}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {askedBy ? (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Asked by</dt>
            <dd>{askedBy}</dd>
          </div>
        ) : null}
        {request.created ? (
          <div className="flex gap-1">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDay(request.created, data.asOf)}</dd>
          </div>
        ) : null}
        <div className="flex gap-1">
          <dt className="text-muted-foreground">Size</dt>
          <dd className={request.leafCount > 0 ? "font-mono" : ""}>
            {request.leafCount > 0
              ? `${request.points} pts · ${plural(request.leafCount, "task")}`
              : "not split into tasks yet"}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-col gap-2">
        {questions > 0 ? (
          <Chip className="self-start bg-chart-3 text-black">{plural(questions, "open question")}</Chip>
        ) : null}
        <RequestLinks data={data} request={request} />
      </div>
    </Panel>
  )
}

function ShippedRows({
  data,
  requests,
  forecasts,
}: {
  data: RequestBoardData
  requests: RequestDetail[]
  forecasts: Map<string, RequestForecast>
}) {
  const rows = requests
    .map((request) => ({ request, read: readForecast(request, forecasts.get(request.id)) }))
    .sort((a, b) => {
      const da = a.read.kind === "shipped" ? a.read.day : ""
      const db = b.read.kind === "shipped" ? b.read.day : ""
      return db.localeCompare(da) || a.request.title.localeCompare(b.request.title)
    })
  const cols = "sm:grid sm:grid-cols-[minmax(0,3fr)_100px_110px_80px_110px] sm:gap-4"
  return (
    <Panel>
      <div
        aria-hidden
        className={cn(
          "hidden bg-background px-5 py-2.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase",
          cols
        )}
      >
        <span>Request</span>
        <span>Shipped</span>
        <span>Tasks</span>
        <span>Size</span>
        <span>vs promised</span>
      </div>
      <ul>
        {rows.map(({ request, read }) => {
          const day = read.kind === "shipped" ? read.day : ""
          const late = read.kind === "shipped" ? read.daysLate : null
          return (
            <li key={request.id} className="border-t-2 border-black first:border-t-0 sm:first:border-t-2">
              <Link
                href={requestHref(request.id)}
                className={cn(
                  "flex min-h-11 flex-col gap-1 px-5 py-3 hover:bg-muted sm:items-center",
                  cols
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{request.title}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{request.id}</span>
                </span>
                <span className="text-[13px]">
                  <span className="text-muted-foreground sm:hidden">Shipped </span>
                  {day ? formatDay(day, data.asOf) : "No date"}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs">
                  <span aria-hidden className="size-3 border-2 border-black bg-shipped" />
                  {request.shippedLeafCount} of {request.leafCount}
                  <span className="text-muted-foreground sm:hidden">tasks</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">{request.points} pts</span>
                <span
                  className={cn(
                    "font-mono text-xs font-semibold",
                    late == null ? "text-muted-foreground" : late > 0 ? "text-destructive" : ""
                  )}
                >
                  {late == null
                    ? "No promise"
                    : late === 0
                      ? "On the day"
                      : late > 0
                        ? `${plural(late, "day")} late`
                        : `${plural(-late, "day")} early`}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function ClosedRows({ requests }: { requests: RequestDetail[] }) {
  return (
    <Panel>
      <ul>
        {requests.map((request) => (
          <li key={request.id} className="border-t-2 border-black first:border-t-0">
            <Link
              href={requestHref(request.id)}
              className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-muted"
            >
              <RequestStatusChip status={request.status} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{request.title}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{request.id}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function GroupSection({
  title,
  hint,
  count,
  children,
}: {
  title: string
  hint?: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3.5">
      <h2 className="flex flex-wrap items-baseline gap-2.5 font-head text-xl">
        {title}
        <span className="font-sans text-sm font-semibold text-muted-foreground">
          {count}
          {hint ? ` · ${hint}` : ""}
        </span>
      </h2>
      {children}
    </section>
  )
}

/** All requests of the board, grouped by status. */
export function RequestsList({ data, projectName }: RequestsListProps) {
  const forecasts = forecastRequests(data, shippedPace(data))
  const byStatus = (statuses: string[]) =>
    data.requests.filter((r) => statuses.includes(r.status))
  const byLikely = (a: RequestDetail, b: RequestDetail) => {
    const da = forecasts.get(a.id)?.likely || a.forecast || "9999"
    const db = forecasts.get(b.id)?.likely || b.forecast || "9999"
    return da.localeCompare(db) || a.title.localeCompare(b.title)
  }

  const building = byStatus(["building"]).sort(byLikely)
  const proposed = byStatus(["proposed"])
  const shipped = byStatus(["shipped"])
  const openQuestions = data.requests
    .filter((r) => ["building", "ready", "proposed"].includes(r.status))
    .reduce((n, r) => n + openQuestionCount(r), 0)
  const nextLikely = building
    .map((r) => forecasts.get(r.id)?.likely ?? "")
    .filter(Boolean)
    .sort()[0]

  const sections: RequestGroupSection[] = REQUEST_GROUPS.map((group) => {
    const requests = byStatus(group.statuses)
    let content: React.ReactNode = null
    if (group.key === "building" || group.key === "ready") {
      content = (
        <GroupSection title={group.title} count={requests.length}>
          {requests.sort(byLikely).map((r) => (
            <ActiveCard key={r.id} data={data} request={r} forecast={forecasts.get(r.id)} />
          ))}
        </GroupSection>
      )
    } else if (group.key === "proposed") {
      content = (
        <GroupSection title={group.title} count={requests.length} hint="waiting for a go">
          <div className="grid gap-4 md:grid-cols-2">
            {requests
              .sort((a, b) => b.created.localeCompare(a.created))
              .map((r) => (
                <ProposedCard key={r.id} data={data} request={r} />
              ))}
          </div>
        </GroupSection>
      )
    } else if (group.key === "shipped") {
      content = (
        <GroupSection title={group.title} count={requests.length} hint="newest first">
          <ShippedRows data={data} requests={requests} forecasts={forecasts} />
        </GroupSection>
      )
    } else {
      content = (
        <GroupSection title={group.title} count={requests.length}>
          <ClosedRows requests={requests} />
        </GroupSection>
      )
    }
    return {
      key: group.key,
      label: group.key === "closed" ? "Closed" : group.title,
      count: requests.length,
      open: group.key === "building" || group.key === "ready" || group.key === "proposed",
      content,
    }
  })

  return (
    <div className="flex flex-col gap-7">
      <ScreenHeader
        eyebrow={`${projectName} · ${plural(data.requests.length, "request")}`}
        title="Requests"
        description="Everything asked for on this project. One brief each, with the work that delivers it and a log of what was done."
      />

      {data.errors.length > 0 ? (
        <p role="status" className="border-2 border-black bg-chart-3 px-4 py-2.5 text-sm text-black">
          {plural(data.errors.length, "board file")} could not be read and{" "}
          {data.errors.length === 1 ? "is" : "are"} left out.
        </p>
      ) : null}

      {data.requests.length === 0 ? (
        <EmptyNote>
          No requests on this board yet. Each request lives in{" "}
          <code className="font-mono">requests/&lt;slug&gt;/brief.md</code>.
        </EmptyNote>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatTile
              value={building.length}
              swatch="bg-chart-3"
              label={
                nextLikely
                  ? `being built · next likely ${formatDay(nextLikely, data.asOf)}`
                  : "being built"
              }
            />
            <StatTile value={proposed.length} swatch="bg-accent" label="proposed" />
            <StatTile value={shipped.length} swatch="bg-shipped" label="shipped" />
            <StatTile
              value={openQuestions}
              swatch="bg-chart-2"
              label={openQuestions === 1 ? "open question to answer" : "open questions to answer"}
            />
          </div>
          <RequestGroupFilter sections={sections} />
        </>
      )}

      {data.legacyLeafCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {plural(data.legacyLeafCount, "task")} still under the old <code className="font-mono">epics/</code>{" "}
          folder, outside any request. See All epics.
        </p>
      ) : null}
    </div>
  )
}
