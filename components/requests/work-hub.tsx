import Link from "next/link"

import { cn } from "../../lib/utils"
import { boardViewHref } from "../../lib/board-model/request-nav"
import { forecastRequests, type RequestForecast } from "../../lib/board-model/request-forecast"
import type {
  MeetingSummary,
  MeetingTask,
  RequestBoardData,
  RequestDetail,
  RequestEpic,
  RequestLeaf,
  RequestStory,
} from "../../lib/board-model/request-types"
import {
  countDone,
  findRequestIn,
  isMeetingTaskClosed,
  leafMark,
  meetingRelationTo,
  meetingTaskState,
  orderMeetingsForHub,
  orderRequestsForHub,
  requestDateLabel,
  requestTreeCounts,
  resolveWorkSelection,
  tallyMeetingTasks,
  type LeafMark,
  type MeetingTaskState,
} from "../../lib/board-model/work-hub"
import {
  Chip,
  EmptyNote,
  KindMark,
  MonoLabel,
  PersonBadge,
  RequestStatusChip,
  ScreenHeader,
  StageChip,
  formatDay,
  plural,
} from "./request-ui"
import { WorkHubMeetingTasks, type MeetingTaskRow } from "./work-hub-meeting-tasks"

export type WorkSelection = { kind: "request" | "meeting"; id: string } | null

export type WorkHubProps = {
  data: RequestBoardData
  projectName: string
  /** From `?request=` or `?meeting=`; null picks the first open request. */
  selection: WorkSelection
}

type HubContext = {
  data: RequestBoardData
  forecasts: Map<string, RequestForecast>
  day: (day: string) => string
}

const requestHref = (id: string) =>
  boardViewHref({ view: "work", request: id, hasRequestBoard: true })
const meetingHref = (id: string) =>
  boardViewHref({ view: "work", meeting: id, hasRequestBoard: true })

const RELATION_CLASS: Record<string, string> = {
  created: "bg-chart-2 text-black",
  changed: "bg-primary text-primary-foreground",
  accepted: "bg-chart-4 text-black",
  raised: "bg-chart-3 text-black",
}

function relationLabel(relation: string): string {
  const text = relation.replace(/[-_]+/g, " ").trim()
  return text ? text[0].toUpperCase() + text.slice(1) : ""
}

function RelationChip({ relation, className }: { relation: string; className?: string }) {
  return (
    <Chip
      className={cn(
        RELATION_CLASS[relation.toLowerCase()] ?? "bg-muted text-foreground",
        className
      )}
    >
      {relationLabel(relation)}
    </Chip>
  )
}

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return ""
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-head text-base leading-tight sm:text-lg">{children}</h3>
      {aside}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Side lists                                                               */
/* ------------------------------------------------------------------------ */

type CardTone = "selected" | "linked" | "dim" | "plain"

const CARD_CLASS: Record<CardTone, string> = {
  selected:
    "border-black bg-primary text-primary-foreground shadow-[4px_4px_0_0_#000]",
  linked:
    "border-chart-2 bg-card text-card-foreground shadow-[4px_4px_0_0_var(--shadow-color)] hover:-translate-y-px",
  dim: "border-black bg-card text-card-foreground opacity-70 hover:opacity-100",
  plain:
    "border-black bg-card text-card-foreground shadow-[3px_3px_0_0_var(--shadow-color)] hover:-translate-y-px",
}

function RequestCard({
  request,
  ctx,
  tone,
  relation,
}: {
  request: RequestDetail
  ctx: HubContext
  tone: CardTone
  relation: string
}) {
  const selected = tone === "selected"
  const date = requestDateLabel(request, ctx.forecasts.get(request.id), ctx.day)
  const counts = requestTreeCounts(request)
  const meta =
    counts.epics === 0
      ? "Not split yet"
      : [
          plural(counts.epics, "epic"),
          counts.stories > 0 ? plural(counts.stories, "story", "stories") : "",
          plural(counts.tasks, "task"),
        ]
          .filter(Boolean)
          .join(" · ")
  return (
    <li>
      <Link
        href={requestHref(request.id)}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "flex min-h-11 flex-col gap-2 border-2 p-3.5 text-left transition-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          CARD_CLASS[tone]
        )}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <RequestStatusChip status={request.status} />
          {date ? (
            <span
              title={date.title}
              className={cn(
                "font-mono text-[11px]",
                selected ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {date.label}
            </span>
          ) : null}
          {relation ? <RelationChip relation={relation} className="ml-auto" /> : null}
        </span>
        <span className="text-[15px] leading-snug font-bold">{request.title}</span>
        <span
          className={cn(
            "text-xs",
            selected ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {meta}
        </span>
      </Link>
    </li>
  )
}

function MeetingCard({
  meeting,
  ctx,
  tone,
  relation,
}: {
  meeting: MeetingSummary
  ctx: HubContext
  tone: CardTone
  relation: string
}) {
  const selected = tone === "selected"
  const tally = tallyMeetingTasks(meeting, ctx.data.asOf)
  const requestCount = meeting.requests.length
  const meta = requestCount
    ? [
        plural(requestCount, "request"),
        plural(meeting.decisions.length, "decision"),
      ].join(" · ")
    : meeting.decisions.length
      ? plural(meeting.decisions.length, "decision")
      : "No product work"
  const pct = tally.total ? Math.round((tally.finished / tally.total) * 100) : 0
  const duration = formatDuration(meeting.durationMinutes)
  return (
    <li>
      <Link
        href={meetingHref(meeting.id)}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "flex min-h-11 flex-col gap-2 border-2 p-3.5 text-left transition-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          CARD_CLASS[tone]
        )}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          {meeting.date ? (
            <Chip
              className={cn(
                selected ? "bg-black text-primary" : "bg-muted text-foreground"
              )}
            >
              {ctx.day(meeting.date)}
            </Chip>
          ) : null}
          {duration ? (
            <span
              className={cn(
                "text-[11px]",
                selected ? "text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {duration}
            </span>
          ) : null}
          {relation ? <RelationChip relation={relation} className="ml-auto" /> : null}
        </span>
        <span className="text-[15px] leading-snug font-bold">{meeting.title}</span>
        <span
          className={cn(
            "text-xs",
            selected ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          {meta}
        </span>
        {tally.total > 0 ? (
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2.5 flex-1 border-2 border-black bg-muted"
            >
              <span className="block h-full bg-chart-4" style={{ width: `${pct}%` }} />
            </span>
            <span
              className={cn(
                "font-mono text-[11px] font-semibold",
                tally.overdue > 0
                  ? selected
                    ? "text-primary-foreground underline decoration-2"
                    : "text-destructive"
                  : selected
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
              )}
            >
              {tally.finished}/{tally.total} tasks
              {tally.overdue > 0 ? ` · ${tally.overdue} late` : ""}
            </span>
          </span>
        ) : null}
      </Link>
    </li>
  )
}

/* ------------------------------------------------------------------------ */
/* Request selection                                                        */
/* ------------------------------------------------------------------------ */

const MARK: Record<LeafMark, { glyph: string; label: string; className: string }> = {
  done: { glyph: "✓", label: "Done", className: "text-foreground dark:text-chart-4" },
  now: { glyph: "▶", label: "In progress", className: "text-chart-5 dark:text-chart-3" },
  todo: { glyph: "○", label: "To do", className: "text-muted-foreground" },
  dropped: { glyph: "×", label: "Dropped", className: "text-muted-foreground" },
}

function LeafRow({ leaf, request }: { leaf: RequestLeaf; request: RequestDetail }) {
  const mark = leafMark(leaf)
  const m = MARK[mark]
  const finished = mark === "done" || mark === "dropped"
  return (
    <li>
      <Link
        href={boardViewHref({
          view: "work",
          request: request.id,
          item: leaf.id,
          hasRequestBoard: true,
        })}
        scroll={false}
        className="group flex min-h-11 items-center gap-2 px-1 text-[13px] hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary sm:min-h-9"
      >
        <KindMark kind={leaf.kind} className="size-4 text-[9px]" />
        <span
          aria-label={m.label}
          title={m.label}
          className={cn("w-3 shrink-0 text-center font-bold", m.className)}
        >
          {m.glyph}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 group-hover:underline",
            finished ? "text-muted-foreground line-through decoration-1" : "text-foreground"
          )}
        >
          {leaf.title}
        </span>
        {leaf.stage && leaf.stage !== "production" ? (
          <StageChip stage={leaf.stage} className="text-[10px]" />
        ) : null}
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
          {leaf.id}
        </span>
      </Link>
    </li>
  )
}

function StoryBlock({ story, request }: { story: RequestStory; request: RequestDetail }) {
  const { done, total } = countDone(story.leaves)
  return (
    <div className="flex flex-col gap-1.5 border-t border-border px-3 py-2 sm:pl-6">
      <div className="flex flex-wrap items-center gap-2">
        <KindMark kind="story" />
        <span className="min-w-0 flex-[1_1_10rem] text-[13px] font-semibold">{story.title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {story.stage ? <StageChip stage={story.stage} /> : null}
          <span
            className="w-10 text-right font-mono text-[11px] text-muted-foreground"
            title={`${done} of ${total} tasks done`}
          >
            {done}/{total}
          </span>
        </span>
      </div>
      {story.leaves.length > 0 ? (
        <ul className="flex flex-col sm:pl-6">
          {story.leaves.map((leaf) => (
            <LeafRow key={leaf.id} leaf={leaf} request={request} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function EpicBlock({ epic, request }: { epic: RequestEpic; request: RequestDetail }) {
  const leaves = [...epic.leaves, ...epic.stories.flatMap((s) => s.leaves)]
  const { done, total } = countDone(leaves)
  return (
    <div className="border-2 border-black bg-background">
      <div className="flex items-center gap-2.5 border-b-2 border-black bg-muted px-3 py-2.5">
        <KindMark kind="epic" />
        <span className="min-w-0 flex-1 text-sm font-bold">{epic.title}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {epic.stories.length > 0
            ? plural(epic.stories.length, "story", "stories")
            : plural(epic.leaves.length, "task")}
          {total > 0 ? ` · ${done}/${total}` : ""}
        </span>
      </div>
      {epic.stories.map((story) => (
        <StoryBlock key={story.id} story={story} request={request} />
      ))}
      {epic.leaves.length > 0 ? (
        <ul className="flex flex-col border-t border-border px-3 py-2">
          {epic.leaves.map((leaf) => (
            <LeafRow key={leaf.id} leaf={leaf} request={request} />
          ))}
        </ul>
      ) : null}
      {epic.stories.length === 0 && epic.leaves.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No stories or tasks yet.</p>
      ) : null}
    </div>
  )
}

type DecisionRef = { text: string; meeting: MeetingSummary }

function decisionsFor(request: RequestDetail, ctx: HubContext): DecisionRef[] {
  const out: DecisionRef[] = []
  for (const meeting of orderMeetingsForHub(ctx.data.meetings)) {
    for (const d of meeting.decisions) {
      if (findRequestIn(ctx.data.requests, d.request)?.id === request.id) {
        out.push({ text: d.text, meeting })
      }
    }
  }
  return out
}

function RequestSelection({ request, ctx }: { request: RequestDetail; ctx: HubContext }) {
  const date = requestDateLabel(request, ctx.forecasts.get(request.id), ctx.day)
  const decisions = decisionsFor(request, ctx)
  return (
    <>
      <div className="flex flex-col gap-2.5 border-b-2 border-black px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="bg-chart-2 text-black uppercase">Request</Chip>
          <RequestStatusChip status={request.status} />
          {date ? (
            <span title={date.title} className="text-xs text-muted-foreground">
              {date.label}
            </span>
          ) : null}
        </div>
        <h2 className="font-head text-2xl leading-tight sm:text-[28px]">{request.title}</h2>
        {request.goal ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            <span className="font-bold text-foreground">Goal:</span> {request.goal}
          </p>
        ) : null}
        <Link
          href={boardViewHref({ view: "request", request: request.id, hasRequestBoard: true })}
          className="inline-flex min-h-11 items-center self-start text-sm font-bold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          Open the full request →
        </Link>
      </div>

      <div className="flex flex-col gap-3 border-b-2 border-black px-4 py-5 sm:px-6">
        <SectionTitle
          aside={
            request.epics.length > 0 ? (
              <span className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <KindMark kind="epic" className="size-4 text-[9px]" /> epic
                </span>
                <span className="inline-flex items-center gap-1">
                  <KindMark kind="story" className="size-4 text-[9px]" /> story
                </span>
                <span className="inline-flex items-center gap-1">
                  <KindMark kind="task" className="size-4 text-[9px]" /> task
                </span>
              </span>
            ) : null
          }
        >
          Inside this request
        </SectionTitle>
        {request.epics.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {request.epics.map((epic) => (
              <EpicBlock key={epic.id} epic={epic} request={request} />
            ))}
          </div>
        ) : (
          <EmptyNote className="text-left">Not split into tasks yet.</EmptyNote>
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-5 sm:px-6">
        <SectionTitle>Decided in meetings</SectionTitle>
        {decisions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {decisions.map((d, i) => (
              <li
                key={`${d.meeting.id}-${i}`}
                className="flex flex-wrap items-start gap-x-3 gap-y-2 border-2 border-black bg-background px-3 py-2.5"
              >
                {d.meeting.date ? (
                  <Chip className="bg-muted text-foreground">{ctx.day(d.meeting.date)}</Chip>
                ) : null}
                <span className="min-w-0 flex-[1_1_12rem] text-[13px] leading-relaxed">
                  {d.text}
                </span>
                <Link
                  href={meetingHref(d.meeting.id)}
                  className="inline-flex min-h-11 max-w-full items-center border-2 border-black px-2.5 text-xs font-bold hover:bg-muted sm:min-h-8"
                >
                  <span className="truncate">{d.meeting.title} →</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote className="text-left">No meeting decisions about this request yet.</EmptyNote>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* Meeting selection                                                        */
/* ------------------------------------------------------------------------ */

const TASK_STATE: Record<
  MeetingTaskState,
  { label: string; glyph: string; icon: string; text: string }
> = {
  production: { label: "In production", glyph: "✓", icon: "bg-chart-4 text-black", text: "" },
  done: { label: "Done", glyph: "✓", icon: "bg-chart-4 text-black", text: "" },
  testing: { label: "In testing", glyph: "◐", icon: "bg-chart-3 text-black", text: "" },
  development: { label: "In development", glyph: "▶", icon: "bg-primary text-primary-foreground", text: "" },
  overdue: { label: "Overdue", glyph: "!", icon: "bg-destructive text-destructive-foreground", text: "text-destructive" },
  open: { label: "Not started", glyph: "", icon: "bg-background", text: "text-muted-foreground" },
  cancelled: { label: "Cancelled", glyph: "×", icon: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
}

function taskWhen(task: MeetingTask, state: MeetingTaskState, ctx: HubContext): string {
  if (!task.due) return ""
  if (state === "overdue") return `was due ${ctx.day(task.due)}`
  if (isMeetingTaskClosed(state)) return ""
  return `due ${ctx.day(task.due)}`
}

function MeetingTaskItem({
  task,
  meeting,
  ctx,
}: {
  task: MeetingTask
  meeting: MeetingSummary
  ctx: HubContext
}) {
  const state = meetingTaskState(task, ctx.data.asOf)
  const s = TASK_STATE[state]
  const request = task.request ? findRequestIn(ctx.data.requests, task.request) : null
  const finished = isMeetingTaskClosed(state)
  const when = taskWhen(task, state, ctx)
  const who = [task.owner, when].filter(Boolean).join(" · ")
  return (
    <li
      className={cn(
        "flex flex-wrap items-start gap-x-3.5 gap-y-2.5 border-2 bg-background p-3",
        state === "overdue" ? "border-destructive" : "border-black"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-6 shrink-0 place-items-center border-2 border-black text-[13px] font-bold",
          s.icon
        )}
      >
        {s.glyph}
      </span>
      <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1.5">
        <span
          className={cn(
            "text-sm leading-snug font-semibold",
            finished && "text-muted-foreground",
            state === "cancelled" && "line-through"
          )}
        >
          {task.title}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {request ? (
            <Link
              href={requestHref(request.id)}
              className="inline-flex min-h-11 items-center border-2 border-black bg-muted px-2 text-[11px] font-semibold hover:bg-accent sm:min-h-7"
            >
              {request.title} →
            </Link>
          ) : task.request ? (
            <Chip className="bg-muted text-muted-foreground">{task.request}</Chip>
          ) : (
            <span className="border-2 border-dashed border-muted-foreground/50 px-2 py-px text-[11px] font-semibold text-muted-foreground">
              Meeting only
            </span>
          )}
          {task.item ? (
            <Link
              href={boardViewHref({
                view: "work",
                meeting: meeting.id,
                item: task.item,
                hasRequestBoard: true,
              })}
              scroll={false}
              className="inline-flex min-h-11 items-center px-1 font-mono text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground sm:min-h-7"
            >
              {task.item}
            </Link>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-[0_1_12rem] items-center gap-2">
        {task.owner ? <PersonBadge name={task.owner} /> : null}
        <span className="flex min-w-0 flex-col">
          <span className={cn("text-xs font-bold", s.text)}>{s.label}</span>
          {who ? <span className="truncate text-[11px] text-muted-foreground">{who}</span> : null}
        </span>
      </div>
    </li>
  )
}

function MeetingSelection({ meeting, ctx }: { meeting: MeetingSummary; ctx: HubContext }) {
  const tally = tallyMeetingTasks(meeting, ctx.data.asOf)
  const duration = formatDuration(meeting.durationMinutes)
  const people = meeting.people.map((p) => p.name).filter(Boolean).join(", ")
  const headline = [meeting.date ? ctx.day(meeting.date) : "", duration, people]
    .filter(Boolean)
    .join(" · ")

  const linked = meeting.requests.map((link) => ({
    link,
    request: findRequestIn(ctx.data.requests, link.request),
  }))

  const parts: string[] = []
  if (tally.done) parts.push(`${tally.done} done`)
  if (tally.production) parts.push(`${tally.production} in production`)
  if (tally.testing) parts.push(`${tally.testing} in testing`)
  if (tally.development) parts.push(`${tally.development} in development`)
  if (tally.open) parts.push(`${tally.open} not started`)
  if (tally.overdue) parts.push(`${tally.overdue} overdue`)
  if (tally.cancelled) parts.push(`${tally.cancelled} cancelled`)
  const total = Math.max(1, tally.total)
  const donePct = (tally.finished / total) * 100
  const movingPct = ((tally.testing + tally.development) / total) * 100

  const rows: MeetingTaskRow[] = meeting.tasks.map((task, i) => ({
    key: task.id || `task-${i}`,
    open: !isMeetingTaskClosed(meetingTaskState(task, ctx.data.asOf)),
    node: <MeetingTaskItem task={task} meeting={meeting} ctx={ctx} />,
  }))

  return (
    <>
      <div className="flex flex-col gap-2.5 border-b-2 border-black px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Chip className="bg-chart-4 text-black uppercase">Meeting</Chip>
          {meeting.reviewState === "needs_review" ? (
            <Chip className="bg-chart-3 text-black">Needs review</Chip>
          ) : null}
          {headline ? <span className="text-xs text-muted-foreground">{headline}</span> : null}
        </div>
        <h2 className="font-head text-2xl leading-tight sm:text-[28px]">{meeting.title}</h2>
        {meeting.summary ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">{meeting.summary}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-b-2 border-black px-4 py-5 sm:px-6">
        <SectionTitle>Requests from this meeting</SectionTitle>
        {linked.length > 0 ? (
          <ul className="grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
            {linked.map(({ link, request }, i) => {
              const date = request
                ? requestDateLabel(request, ctx.forecasts.get(request.id), ctx.day)
                : null
              const body = (
                <>
                  <RelationChip relation={link.relation} className="self-start" />
                  <span className="text-sm leading-snug font-bold">
                    {request ? request.title : link.request}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {request ? (
                      <>
                        <RequestStatusChip status={request.status} />
                        {date ? <span>{date.label}</span> : null}
                      </>
                    ) : (
                      "Not found on this board"
                    )}
                  </span>
                </>
              )
              return (
                <li key={`${link.request}-${i}`}>
                  {request ? (
                    <Link
                      href={requestHref(request.id)}
                      className="flex h-full min-h-11 flex-col gap-1.5 border-2 border-black bg-background p-3 shadow-[3px_3px_0_0_var(--shadow-color)] hover:-translate-y-px hover:bg-muted"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex h-full flex-col gap-1.5 border-2 border-dashed border-muted-foreground/50 p-3">
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote className="text-left">No product work in this meeting. Kept for the record.</EmptyNote>
        )}
      </div>

      {meeting.tasks.length > 0 ? (
        <div className="flex flex-col gap-3.5 border-b-2 border-black bg-muted/40 px-4 py-5 sm:px-6">
          <SectionTitle
            aside={
              <span className="font-mono text-[13px] font-semibold">
                {tally.finished} of {tally.total} done
              </span>
            }
          >
            Tasks from this meeting
          </SectionTitle>
          <div className="flex flex-col gap-1.5">
            <div
              role="img"
              aria-label={`${tally.finished} of ${tally.total} tasks done`}
              className="flex h-3.5 border-2 border-black bg-muted"
            >
              {donePct > 0 ? (
                <span className="h-full bg-chart-4" style={{ width: `${donePct}%` }} />
              ) : null}
              {movingPct > 0 ? (
                <span
                  className="h-full bg-[repeating-linear-gradient(135deg,var(--chart-3)_0_3px,transparent_3px_6px)]"
                  style={{ width: `${movingPct}%` }}
                />
              ) : null}
            </div>
            {parts.length > 0 ? (
              <span className="text-xs text-muted-foreground">{parts.join(" · ")}</span>
            ) : null}
          </div>
          <WorkHubMeetingTasks rows={rows} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 border-b-2 border-black px-4 py-5 sm:px-6">
        <SectionTitle>Decided</SectionTitle>
        {meeting.decisions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {meeting.decisions.map((d, i) => {
              const request = d.request ? findRequestIn(ctx.data.requests, d.request) : null
              return (
                <li
                  key={i}
                  className="flex flex-wrap items-start gap-x-3 gap-y-2 border-2 border-black bg-background px-3 py-2.5"
                >
                  <span aria-hidden className="font-bold text-foreground dark:text-chart-4">
                    ✓
                  </span>
                  <span className="min-w-0 flex-[1_1_12rem] text-[13px] leading-relaxed">
                    {d.text}
                  </span>
                  {request ? (
                    <Link
                      href={requestHref(request.id)}
                      className="inline-flex min-h-11 max-w-full items-center border-2 border-black px-2.5 text-xs font-bold hover:bg-muted sm:min-h-8 sm:max-w-48"
                    >
                      <span className="truncate">{request.title} →</span>
                    </Link>
                  ) : d.request ? (
                    <Chip className="bg-muted text-muted-foreground">{d.request}</Chip>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyNote className="text-left">No decisions recorded.</EmptyNote>
        )}
      </div>

      <div className="flex flex-col gap-2.5 px-4 py-5 sm:px-6">
        <SectionTitle>Notes</SectionTitle>
        {meeting.notes.trim() ? (
          <pre className="overflow-x-auto border-2 border-black bg-background p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {meeting.notes.trim()}
          </pre>
        ) : (
          <EmptyNote className="text-left">No notes for this meeting.</EmptyNote>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* Hub                                                                      */
/* ------------------------------------------------------------------------ */

export function WorkHub({ data, projectName, selection }: WorkHubProps) {
  const forecasts = forecastRequests(data)
  const ctx: HubContext = {
    data,
    forecasts,
    day: (d) => formatDay(d, data.asOf),
  }
  const requests = orderRequestsForHub(data.requests, forecasts)
  const meetings = orderMeetingsForHub(data.meetings)
  const resolved = resolveWorkSelection(data, requests, meetings, selection)

  const selectedRequest = resolved.kind === "request" ? resolved.request : null
  const selectedMeeting = resolved.kind === "meeting" ? resolved.meeting : null

  const requestTone = (r: RequestDetail): { tone: CardTone; relation: string } => {
    if (selectedRequest?.id === r.id) return { tone: "selected", relation: "" }
    if (selectedMeeting) {
      const relation = meetingRelationTo(selectedMeeting, r, data.requests)
      return { tone: relation ? "linked" : "dim", relation }
    }
    return { tone: "plain", relation: "" }
  }
  const meetingTone = (m: MeetingSummary): { tone: CardTone; relation: string } => {
    if (selectedMeeting?.id === m.id) return { tone: "selected", relation: "" }
    if (selectedRequest) {
      const relation = meetingRelationTo(m, selectedRequest, data.requests)
      return { tone: relation ? "linked" : "dim", relation }
    }
    return { tone: "plain", relation: "" }
  }

  const eyebrow = [
    projectName,
    plural(data.requests.length, "request"),
    plural(data.meetings.length, "meeting"),
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        eyebrow={eyebrow}
        title="Work"
        description="Requests on the left, meetings on the right. Pick either one to see what links them and what is still to do."
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(15rem,1fr)_minmax(0,2.4fr)] xl:grid-cols-[minmax(15rem,1fr)_minmax(0,2.4fr)_minmax(14rem,1fr)]">
        <section aria-labelledby="work-requests" className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 id="work-requests" className="font-head text-lg">
              Requests
            </h2>
            <MonoLabel>Open first</MonoLabel>
          </div>
          {requests.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {requests.map((r) => {
                const { tone, relation } = requestTone(r)
                return (
                  <RequestCard key={r.id} request={r} ctx={ctx} tone={tone} relation={relation} />
                )
              })}
            </ul>
          ) : (
            <EmptyNote>No requests on this board yet.</EmptyNote>
          )}
        </section>

        <section
          aria-label="Selection"
          className="flex min-w-0 flex-col border-2 border-black bg-card text-card-foreground shadow-[6px_6px_0_0_var(--primary)] lg:row-span-2 xl:row-span-1"
        >
          {resolved.kind === "request" ? (
            <RequestSelection request={resolved.request} ctx={ctx} />
          ) : resolved.kind === "meeting" ? (
            <MeetingSelection meeting={resolved.meeting} ctx={ctx} />
          ) : resolved.kind === "missing" ? (
            <div className="flex flex-col gap-3 p-6">
              <h2 className="font-head text-xl">
                {resolved.what === "request" ? "Request not found" : "Meeting not found"}
              </h2>
              <p className="text-sm text-muted-foreground">
                There is no {resolved.what} called{" "}
                <code className="border-2 border-black bg-muted px-1 font-mono text-xs text-foreground">
                  {resolved.id}
                </code>{" "}
                on this board. It may have been renamed or removed. Pick one from the lists.
              </p>
              <Link
                href={boardViewHref({ view: "work", hasRequestBoard: true })}
                className="inline-flex min-h-11 items-center self-start text-sm font-bold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
              >
                Back to Work →
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <EmptyNote>
                Nothing here yet. Requests and meetings show up once the board has them.
              </EmptyNote>
            </div>
          )}
        </section>

        <section
          aria-labelledby="work-meetings"
          className="flex min-w-0 flex-col gap-2.5 lg:col-start-1 xl:col-start-auto"
        >
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 id="work-meetings" className="font-head text-lg">
              Meetings
            </h2>
            <MonoLabel>Newest first</MonoLabel>
          </div>
          {meetings.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {meetings.map((m) => {
                const { tone, relation } = meetingTone(m)
                return (
                  <MeetingCard key={m.id} meeting={m} ctx={ctx} tone={tone} relation={relation} />
                )
              })}
            </ul>
          ) : (
            <EmptyNote>No meetings yet.</EmptyNote>
          )}
        </section>
      </div>
    </div>
  )
}
