import Link from "next/link"

import { cn } from "../../lib/utils"
import { boardViewHref } from "../../lib/board-model/request-nav"
import {
  allLeaves,
  firstActivityDay,
  forecastRequests,
  lastShippedDay,
  PACE_WEEKS,
  shippedPace,
  type Pace,
} from "../../lib/board-model/request-forecast"
import {
  findRequest,
  linkedRequests,
  missingSourceMeetings,
  openQuestionCount,
  pointsOf,
  readForecast,
  relatedMeetings,
  relationLabel,
  requestRepos,
  sortedLog,
  stageCountsOf,
  treeItemIds,
  type ForecastRead,
} from "../../lib/board-model/request-page"
import type {
  RequestBoardData,
  RequestDetail,
  RequestEpic,
  RequestLeaf,
  RequestLogEntry,
  RequestLogKind,
  RequestStory,
} from "../../lib/board-model/request-types"
import type { ContributorIdentity } from "../../lib/board-model/identity"
import {
  Chip,
  EmptyNote,
  formatDateTime,
  formatDay,
  KindMark,
  MonoLabel,
  Panel,
  PanelHeader,
  PersonBadge,
  plural,
  RequestStatusChip,
  StageBar,
  StageChip,
} from "./request-ui"

export type RequestPageProps = {
  data: RequestBoardData
  /** Request id, alias or slug from `?request=`. */
  requestId: string
}

const LINK_CLASS =
  "underline decoration-2 underline-offset-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

function requestHref(id: string): string {
  return boardViewHref({ view: "request", request: id, hasRequestBoard: true })
}

function itemHref(requestId: string, itemId: string): string {
  return boardViewHref({
    view: "request",
    request: requestId,
    item: itemId,
    hasRequestBoard: true,
  })
}

function meetingHref(meetingId: string): string {
  return boardViewHref({ view: "work", meeting: meetingId, hasRequestBoard: true })
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link
            href={boardViewHref({ view: "requests", hasRequestBoard: true })}
            className={cn("inline-flex min-h-11 items-center", LINK_CLASS)}
          >
            Requests
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page" className="text-foreground">
          {current}
        </li>
      </ol>
    </nav>
  )
}

function NotFound({ requestId }: { requestId: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb current="Not found" />
      <Panel className="flex flex-col items-start gap-3 p-6">
        <MonoLabel>Request</MonoLabel>
        <h1 className="font-head text-3xl leading-tight">Request not found</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          {requestId.trim() ? (
            <>
              No request on this board has the id, alias or slug{" "}
              <code className="border-2 border-black bg-background px-1 font-mono text-foreground">
                {requestId}
              </code>
              . It may have been renamed or removed.
            </>
          ) : (
            "No request was given."
          )}
        </p>
        <Link
          href={boardViewHref({ view: "requests", hasRequestBoard: true })}
          className="inline-flex min-h-11 items-center border-2 border-black bg-primary px-4 text-sm font-bold text-primary-foreground shadow-[3px_3px_0_0_#000] hover:-translate-y-px"
        >
          Back to Requests
        </Link>
      </Panel>
    </div>
  )
}

function PeopleLine({
  label,
  people,
}: {
  label: string
  people: ContributorIdentity[]
}) {
  if (people.length === 0) return null
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      {people.map((p) => (
        <span key={p.email || p.name} className="inline-flex items-center gap-1.5">
          <PersonBadge name={p.name} className="size-6 text-[9px]" />
          <span className="font-semibold">{p.name}</span>
        </span>
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ header */

function ForecastBlock({
  read,
  asOf,
  pace,
}: {
  read: ForecastRead
  asOf: string
  pace: Pace
}) {
  const box = "flex flex-col gap-1 border-2 border-black bg-background p-4"
  if (read.kind === "shipped") {
    return (
      <div className={box}>
        <MonoLabel>Shipped</MonoLabel>
        <span className="font-head text-3xl leading-none">
          {read.day ? formatDay(read.day, asOf) : "Shipped"}
        </span>
        {read.committed ? (
          <span className="text-xs text-muted-foreground">
            Promised {formatDay(read.committed, asOf)}
            {read.daysLate != null && read.daysLate !== 0
              ? ` · ${plural(Math.abs(read.daysLate), "day")} ${read.daysLate > 0 ? "late" : "early"}`
              : read.daysLate === 0
                ? " · on the day"
                : ""}
          </span>
        ) : null}
      </div>
    )
  }
  if (read.kind === "closed") {
    return (
      <div className={box}>
        <MonoLabel>Forecast</MonoLabel>
        <span className="font-head text-xl leading-tight">No date</span>
        <span className="text-xs text-muted-foreground">This request is closed.</span>
      </div>
    )
  }
  if (read.kind !== "dated") {
    const title =
      read.kind === "unsized"
        ? "Not sized yet"
        : read.kind === "no-pace"
          ? "No date yet"
          : "Nothing left"
    const hint =
      read.kind === "unsized"
        ? "A likely date appears once the request has tasks with points."
        : read.kind === "no-pace"
          ? `${read.remaining} pts left, but nothing shipped in the last ${PACE_WEEKS} weeks to set a pace.`
          : "Every task is in production or closed."
    return (
      <div className={box}>
        <MonoLabel>Likely done</MonoLabel>
        <span className="font-head text-xl leading-tight">{title}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
        {read.committed ? (
          <span className="text-xs">
            <span className="text-muted-foreground">Promised </span>
            <span className="font-semibold">{formatDay(read.committed, asOf)}</span>
          </span>
        ) : null}
      </div>
    )
  }
  return (
    <div className={cn(box, read.atRisk && "border-destructive")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MonoLabel>Likely done</MonoLabel>
        {read.atRisk ? (
          <Chip className="bg-destructive text-white">At risk</Chip>
        ) : read.committed ? (
          <Chip className="bg-chart-4 text-black">On track</Chip>
        ) : null}
      </div>
      <span className="font-head text-3xl leading-none">{formatDay(read.likely, asOf)}</span>
      {read.early && read.late && read.early !== read.late ? (
        <span className="text-xs text-muted-foreground">
          Range {formatDay(read.early, asOf)} to {formatDay(read.late, asOf)}
        </span>
      ) : null}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-muted-foreground">Promised</dt>
        <dd className={cn("font-semibold", read.atRisk && "text-destructive")}>
          {read.committed ? formatDay(read.committed, asOf) : "No date in the brief"}
          {read.atRisk && read.daysLate ? ` · ${plural(read.daysLate, "day")} behind` : ""}
        </dd>
        <dt className="text-muted-foreground">Left</dt>
        <dd className="font-mono">{read.remaining} pts</dd>
        <dt className="text-muted-foreground">Pace</dt>
        <dd className="font-mono">
          {Math.round(pace.pointsPerWeek * 10) / 10} pts/week
        </dd>
      </dl>
      <span className="mt-1 text-[11px] text-muted-foreground">
        From work shipped to main in the last {PACE_WEEKS} weeks, with the open requests ahead of this one.
      </span>
    </div>
  )
}

function Header({
  request,
  read,
  asOf,
  pace,
}: {
  request: RequestDetail
  read: ForecastRead
  asOf: string
  pace: Pace
}) {
  const repos = requestRepos(request)
  const leaves = allLeaves(request)
  const shipped = leaves.filter((l) => l.stage === "production").length
  const pct = leaves.length ? Math.round((shipped / leaves.length) * 100) : 0
  return (
    <Panel className="flex flex-wrap gap-7 p-5 sm:p-7">
      <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <MonoLabel>Request</MonoLabel>
          <RequestStatusChip status={request.status} />
          <span className="font-mono text-xs text-muted-foreground">
            {request.id}
            {request.aliases.length > 0 ? ` · was ${request.aliases.join(", ")}` : ""}
          </span>
        </div>
        <h1 className="font-head text-3xl leading-tight tracking-tight sm:text-4xl">
          {request.title}
        </h1>
        {request.goal ? (
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {request.goal}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
          <PeopleLine label="Asked by" people={request.requestedBy} />
          <PeopleLine
            label={request.owners.length === 1 ? "Owner" : "Owners"}
            people={request.owners}
          />
        </div>
        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          {request.created ? (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDay(request.created, asOf)}</dd>
            </div>
          ) : null}
          {request.updated ? (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{formatDay(request.updated, asOf)}</dd>
            </div>
          ) : null}
          {repos.length > 0 ? (
            <div className="flex gap-1.5">
              <dt className="text-muted-foreground">{repos.length === 1 ? "Repo" : "Repos"}</dt>
              <dd className="font-mono">{repos.join(", ")}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <ForecastBlock read={read} asOf={asOf} pace={pace} />
        {leaves.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {shipped} of {plural(leaves.length, "task")} in production
              </span>
              <span className="font-mono">{pct}%</span>
            </div>
            <StageBar counts={request.stageCounts} className="h-4" />
            <StageLegend />
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

function StageLegend() {
  const items: [string, string][] = [
    ["bg-chart-4", "Production (main)"],
    ["bg-chart-3", "Testing (quality)"],
    ["bg-primary", "Development"],
    ["bg-muted", "No commits"],
  ]
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {items.map(([fill, label]) => (
        <li key={label} className="inline-flex items-center gap-1">
          <span aria-hidden className={cn("size-2.5 border-2 border-black", fill)} />
          {label}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------- brief */

function Checklist({ items, doneLabel }: { items: { text: string; checked: boolean }[]; doneLabel: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={`${item.text}-${i}`} className="flex items-start gap-2.5 text-sm leading-relaxed">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center border-2 border-black text-[11px] font-bold",
              item.checked ? "bg-chart-4 text-black" : "bg-background"
            )}
          >
            {item.checked ? "✓" : ""}
          </span>
          <span className={cn(item.checked && "text-muted-foreground")}>
            <span className="sr-only">{item.checked ? `${doneLabel}: ` : "Open: "}</span>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BriefHeading({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <h3 className="flex flex-wrap items-baseline gap-2 font-head text-base">
      {children}
      {hint ? <span className="font-sans text-xs font-semibold text-muted-foreground">{hint}</span> : null}
    </h3>
  )
}

function Brief({ request }: { request: RequestDetail }) {
  const openQuestions = openQuestionCount(request)
  const hasAnything =
    request.why ||
    request.doneWhen.length > 0 ||
    request.outOfScope.length > 0 ||
    request.openQuestions.length > 0
  return (
    <Panel aria-labelledby="brief-title">
      <PanelHeader title={<span id="brief-title">Brief</span>} hint={request.briefPath || "brief.md"} />
      {hasAnything ? (
        <div className="flex flex-col gap-6 p-4 sm:p-5">
          {request.why ? (
            <div className="flex flex-col gap-1.5">
              <BriefHeading>Why</BriefHeading>
              <p className="max-w-3xl text-sm leading-relaxed">{request.why}</p>
            </div>
          ) : null}
          {request.doneWhen.length > 0 ? (
            <div className="flex flex-col gap-2">
              <BriefHeading
                hint={`${request.doneWhen.filter((d) => d.checked).length} of ${request.doneWhen.length} met`}
              >
                Done when
              </BriefHeading>
              <Checklist items={request.doneWhen} doneLabel="Met" />
            </div>
          ) : null}
          {request.outOfScope.length > 0 ? (
            <div className="flex flex-col gap-2">
              <BriefHeading>Out of scope</BriefHeading>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground marker:text-muted-foreground">
                {request.outOfScope.map((item, i) => (
                  <li key={`${item}-${i}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {request.openQuestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <BriefHeading hint={`${openQuestions} of ${request.openQuestions.length} open`}>
                Open questions
              </BriefHeading>
              <ul className="flex flex-col gap-2">
                {request.openQuestions.map((q, i) => (
                  <li
                    key={`${q.text}-${i}`}
                    className={cn(
                      "flex items-start gap-2.5 border-2 border-black px-3 py-2.5 text-sm",
                      q.checked ? "bg-background text-muted-foreground" : "bg-chart-3 text-black"
                    )}
                  >
                    <span aria-hidden className="font-bold">
                      {q.checked ? "✓" : "?"}
                    </span>
                    <span>
                      <span className="sr-only">{q.checked ? "Answered: " : "Open: "}</span>
                      {q.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <EmptyNote className="m-4">The brief has no Why, Done when or questions yet.</EmptyNote>
      )}
    </Panel>
  )
}

/* -------------------------------------------------------------------- tree */

function LeafRow({ leaf, requestId }: { leaf: RequestLeaf; requestId: string }) {
  const closed = ["cancelled", "shelved"].includes(leaf.status.toLowerCase())
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-black/40 py-1.5 pr-3 pl-4 first:border-t-0 sm:pl-10">
      <KindMark kind={leaf.kind} />
      <Link
        href={itemHref(requestId, leaf.id)}
        scroll={false}
        className={cn(
          "flex min-h-11 min-w-0 flex-[1_1_200px] items-center gap-2 text-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          (leaf.stage === "production" || closed) && "text-muted-foreground",
          closed && "line-through"
        )}
      >
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{leaf.id}</span>
        <span className="min-w-0 truncate">{leaf.title}</span>
      </Link>
      <span className="flex items-center gap-2">
        {leaf.resolvers.slice(0, 2).map((p) => (
          <PersonBadge key={p.email || p.name} name={p.name} className="size-6 text-[9px]" />
        ))}
        <StageChip stage={leaf.stage} />
        <span className="w-12 text-right font-mono text-xs text-muted-foreground">
          {leaf.points} pts
        </span>
      </span>
    </li>
  )
}

function StoryBlock({ story, requestId }: { story: RequestStory; requestId: string }) {
  const counts = stageCountsOf(story.leaves)
  const done = counts.production
  const allShipped = story.leaves.length > 0 && done === story.leaves.length
  return (
    <details open={!allShipped} className="group border-t-2 border-black">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          aria-hidden
          className="shrink-0 transition-transform group-open:rotate-90"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        <KindMark kind="story" />
        <span className="flex min-w-0 flex-[1_1_200px] items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{story.id}</span>
          <span className="min-w-0 font-semibold">{story.title}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {done} of {story.leaves.length} in main
          </span>
          <StageChip stage={story.stage} />
          <span className="w-12 text-right font-mono text-xs text-muted-foreground">
            {pointsOf(story.leaves)} pts
          </span>
        </span>
      </summary>
      {story.leaves.length > 0 ? (
        <ul className="pb-1.5">
          {story.leaves.map((leaf) => (
            <LeafRow key={leaf.id} leaf={leaf} requestId={requestId} />
          ))}
        </ul>
      ) : (
        <p className="px-10 pb-3 text-sm text-muted-foreground">No tasks in this story yet.</p>
      )}
    </details>
  )
}

function EpicBlock({ epic, requestId }: { epic: RequestEpic; requestId: string }) {
  const leaves = [...epic.leaves, ...epic.stories.flatMap((s) => s.leaves)]
  return (
    <div className="border-2 border-black bg-background">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-card px-3 py-2.5">
        <KindMark kind="epic" />
        <span className="flex min-w-0 flex-[1_1_200px] items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{epic.id}</span>
          <span className="min-w-0 font-head text-base">{epic.title}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {epic.stories.length > 0 ? `${plural(epic.stories.length, "story", "stories")} · ` : ""}
            {plural(leaves.length, "task")}
          </span>
          <StageChip stage={epic.stage} />
          <span className="w-12 text-right font-mono text-xs text-muted-foreground">
            {pointsOf(leaves)} pts
          </span>
        </span>
      </div>
      {epic.stories.map((story) => (
        <StoryBlock key={story.id} story={story} requestId={requestId} />
      ))}
      {epic.leaves.length > 0 ? (
        <ul className="border-t-2 border-black py-1">
          {epic.leaves.map((leaf) => (
            <LeafRow key={leaf.id} leaf={leaf} requestId={requestId} />
          ))}
        </ul>
      ) : null}
      {epic.stories.length === 0 && epic.leaves.length === 0 ? (
        <p className="border-t-2 border-black px-3 py-3 text-sm text-muted-foreground">
          Nothing under this epic yet.
        </p>
      ) : null}
    </div>
  )
}

function Tree({ request }: { request: RequestDetail }) {
  const leaves = allLeaves(request)
  return (
    <Panel aria-labelledby="tree-title">
      <PanelHeader
        title={<span id="tree-title">Epics, stories and tasks</span>}
        hint={
          leaves.length > 0
            ? `${plural(leaves.length, "task")} · ${pointsOf(leaves)} pts`
            : undefined
        }
      />
      <div className="flex flex-col gap-4 p-3 sm:p-4">
        {request.epics.length === 0 ? (
          <EmptyNote>
            {request.status === "proposed"
              ? "Not split into epics and tasks yet. That happens once the request gets a go."
              : "No epics or tasks under this request yet."}
          </EmptyNote>
        ) : (
          request.epics.map((epic) => <EpicBlock key={epic.id} epic={epic} requestId={request.id} />)
        )}
        {leaves.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            A task counts as shipped only when its commits reach main. A story or epic is as far
            along as its least advanced task.
          </p>
        ) : null}
      </div>
    </Panel>
  )
}

/* --------------------------------------------------------------------- log */

const LOG_KIND: Record<RequestLogKind, { label: string; className: string }> = {
  push: { label: "Push", className: "bg-primary text-primary-foreground" },
  merge: { label: "Merge", className: "bg-chart-2 text-black" },
  promote: { label: "Promote", className: "bg-chart-3 text-black" },
  release: { label: "Release", className: "bg-chart-4 text-black" },
  decision: { label: "Decision", className: "bg-accent text-accent-foreground" },
  meeting: { label: "Meeting", className: "bg-chart-5 text-white" },
  scope: { label: "Scope", className: "bg-destructive text-white" },
  note: { label: "Note", className: "bg-muted text-foreground" },
}

function Target({
  id,
  requestId,
  treeIds,
  meetingIds,
}: {
  id: string
  requestId: string
  treeIds: Set<string>
  meetingIds: Set<string>
}) {
  const cls =
    "inline-flex min-h-8 items-center border-2 border-black bg-background px-1.5 font-mono text-[11px]"
  if (treeIds.has(id)) {
    return (
      <Link href={itemHref(requestId, id)} scroll={false} className={cn(cls, "hover:bg-muted")}>
        {id}
      </Link>
    )
  }
  if (meetingIds.has(id)) {
    return (
      <Link href={meetingHref(id)} className={cn(cls, "hover:bg-muted")}>
        {id}
      </Link>
    )
  }
  return (
    <span title="Not in this request" className={cn(cls, "border-dashed text-muted-foreground")}>
      {id}
    </span>
  )
}

function LogItem({
  entry,
  requestId,
  treeIds,
  meetingIds,
}: {
  entry: RequestLogEntry
  requestId: string
  treeIds: Set<string>
  meetingIds: Set<string>
}) {
  const kind = LOG_KIND[entry.kind] ?? LOG_KIND.note
  const meta = [entry.person?.name, entry.repo].filter(Boolean)
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t-2 border-black px-4 py-3.5 first:border-t-0 sm:grid-cols-[110px_76px_minmax(0,1fr)] sm:px-5">
      <time
        dateTime={entry.at}
        className="col-span-2 font-mono text-[11px] text-muted-foreground sm:col-span-1 sm:pt-1"
      >
        {formatDateTime(entry.at)}
      </time>
      <Chip className={cn("self-start justify-self-start", kind.className)}>{kind.label}</Chip>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold leading-snug">{entry.title}</span>
        {entry.summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {meta.length > 0 ? <span>{meta.join(" · ")}</span> : null}
          {entry.fromBranch || entry.toBranch ? (
            <span className="font-mono">
              {entry.fromBranch || "?"}
              {entry.toBranch ? (
                <>
                  <span aria-label="to"> → </span>
                  {entry.toBranch}
                </>
              ) : null}
            </span>
          ) : null}
          {entry.shas.length > 0 ? (
            <span className="font-mono">
              {entry.shas
                .slice(0, 3)
                .map((s) => s.slice(0, 7))
                .join(" ")}
              {entry.shas.length > 3 ? ` +${entry.shas.length - 3}` : ""}
            </span>
          ) : null}
        </div>
        {entry.targets.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {entry.targets.map((t) => (
              <Target key={t} id={t} requestId={requestId} treeIds={treeIds} meetingIds={meetingIds} />
            ))}
          </div>
        ) : null}
      </div>
    </li>
  )
}

function Log({ data, request }: { data: RequestBoardData; request: RequestDetail }) {
  const entries = sortedLog(request)
  const treeIds = treeItemIds(request)
  const meetingIds = new Set(data.meetings.map((m) => m.id))
  return (
    <Panel aria-labelledby="log-title">
      <PanelHeader
        title={<span id="log-title">Log</span>}
        hint={entries.length > 0 ? `${plural(entries.length, "entry", "entries")} · newest first` : undefined}
      />
      {entries.length === 0 ? (
        <EmptyNote className="m-4">
          No log entries yet. Pushes, merges, releases and decisions for this request show up here.
        </EmptyNote>
      ) : (
        <ol>
          {entries.map((entry) => (
            <LogItem
              key={entry.id}
              entry={entry}
              requestId={request.id}
              treeIds={treeIds}
              meetingIds={meetingIds}
            />
          ))}
        </ol>
      )}
    </Panel>
  )
}

/* ------------------------------------------------------------------- aside */

function Meetings({ data, request }: { data: RequestBoardData; request: RequestDetail }) {
  const meetings = relatedMeetings(data, request)
  const missing = missingSourceMeetings(data, request)
  return (
    <Panel aria-labelledby="meetings-title">
      <PanelHeader title={<span id="meetings-title">Meetings</span>} />
      {meetings.length === 0 && missing.length === 0 ? (
        <EmptyNote className="m-4">No meeting mentions this request.</EmptyNote>
      ) : (
        <ul>
          {meetings.map((m) => (
            <li key={m.meeting.id} className="border-t-2 border-black first:border-t-0">
              <Link
                href={meetingHref(m.meeting.id)}
                className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-muted"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{m.meeting.title || m.meeting.id}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {m.meeting.date ? <span>{formatDay(m.meeting.date, data.asOf)}</span> : null}
                  {m.isSource ? <Chip className="bg-chart-2 text-black">Source</Chip> : null}
                  {m.relations.map((r) => (
                    <Chip key={r} className="bg-background text-foreground capitalize">
                      {r}
                    </Chip>
                  ))}
                  {m.openTaskCount > 0 ? (
                    <Chip className="bg-chart-3 text-black">
                      {plural(m.openTaskCount, "open action")}
                    </Chip>
                  ) : null}
                </span>
                {m.decisions.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-1 text-[13px]">
                    {m.decisions.map((d, i) => (
                      <li key={`${d}-${i}`} className="flex gap-1.5">
                        <span className="font-mono text-[11px] text-muted-foreground">Decided</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            </li>
          ))}
          {missing.map((id) => (
            <li key={id} className="border-t-2 border-black px-4 py-3 text-sm first:border-t-0">
              <span className="font-mono">{id}</span>
              <span className="block text-xs text-muted-foreground">
                Listed as a source, not found in meetings/
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function LinkedRequests({ data, request }: { data: RequestBoardData; request: RequestDetail }) {
  const links = linkedRequests(data, request)
  return (
    <Panel aria-labelledby="links-title">
      <PanelHeader title={<span id="links-title">Linked requests</span>} />
      {links.length === 0 ? (
        <EmptyNote className="m-4">No links to other requests.</EmptyNote>
      ) : (
        <ul>
          {links.map((link, i) => (
            <li key={`${link.ref}-${link.relation}-${i}`} className="border-t-2 border-black first:border-t-0">
              {link.request ? (
                <Link
                  href={requestHref(link.request.id)}
                  className="flex min-h-11 flex-col gap-1 px-4 py-3 hover:bg-muted"
                >
                  <MonoLabel>{relationLabel(link.relation, link.direction)}</MonoLabel>
                  <span className="font-semibold">{link.request.title}</span>
                  <span className="flex items-center gap-2">
                    <RequestStatusChip status={link.request.status} />
                    <span className="font-mono text-[11px] text-muted-foreground">{link.request.id}</span>
                  </span>
                </Link>
              ) : (
                <div className="flex flex-col gap-1 px-4 py-3">
                  <MonoLabel>{relationLabel(link.relation, link.direction)}</MonoLabel>
                  <span className="font-mono text-sm">{link.ref}</span>
                  <span className="text-xs text-muted-foreground">Not found on this board</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function AtAGlance({ data, request }: { data: RequestBoardData; request: RequestDetail }) {
  const leaves = allLeaves(request)
  const started = leaves.length > 0 ? firstActivityDay(request) : ""
  const lastShipped = lastShippedDay(request)
  const people = new Map<string, number>()
  for (const entry of request.log) {
    if (entry.person?.name) people.set(entry.person.name, (people.get(entry.person.name) ?? 0) + 1)
  }
  const rows: [string, string][] = []
  if (leaves.length > 0) {
    rows.push(["Size", `${pointsOf(leaves)} pts · ${plural(leaves.length, "task")}`])
    rows.push(["In main", `${request.shippedPoints} pts · ${request.shippedLeafCount} tasks`])
  }
  if (started) rows.push(["Started", formatDay(started, data.asOf)])
  if (lastShipped) rows.push(["Last shipped", formatDay(lastShipped, data.asOf)])
  if (request.log.length > 0) {
    const who = [...people.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `${name.split(/\s+/)[0]} ${n}`)
      .join(", ")
    rows.push([
      "Log",
      [plural(request.log.length, "entry", "entries"), who].filter(Boolean).join(" · "),
    ])
  }
  return (
    <Panel aria-labelledby="glance-title">
      <PanelHeader title={<span id="glance-title">At a glance</span>} />
      <div className="flex flex-col gap-3 p-4">
        {rows.length > 0 ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {request.briefPath ? (
          <div className="flex flex-col gap-1">
            <MonoLabel>Where this lives</MonoLabel>
            <code className="border-2 border-black bg-background px-2 py-1.5 font-mono text-xs break-all">
              {request.briefPath}
            </code>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}

/* -------------------------------------------------------------------- page */

/** One request: brief, forecast, the work tree and its log. */
export function RequestPage({ data, requestId }: RequestPageProps) {
  const request = findRequest(data, requestId)
  if (!request) return <NotFound requestId={requestId} />

  const pace = shippedPace(data)
  const forecast = forecastRequests(data, pace).get(request.id)
  const read = readForecast(request, forecast)

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb current={request.title} />
      <Header request={request} read={read} asOf={data.asOf} pace={pace} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Brief request={request} />
          <Tree request={request} />
          <Log data={data} request={request} />
        </div>
        <aside aria-label="Around this request" className="flex min-w-0 flex-col gap-6">
          <AtAGlance data={data} request={request} />
          <Meetings data={data} request={request} />
          <LinkedRequests data={data} request={request} />
        </aside>
      </div>
    </div>
  )
}
