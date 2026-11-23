import type * as React from "react"
import Link from "next/link"

import { cn } from "../../lib/utils"
import { boardViewHref } from "../../lib/board-model/request-nav"
import {
  formatHours,
  formatMinutes,
  formatPoints,
  type AgentSessionStats,
  type PersonStats,
} from "../../lib/board-model/people"
import type { PersonColor } from "./people-colors"
import { PeopleSparkline } from "./people-sparkline"
import { MonoLabel, initialsOf, plural } from "./request-ui"

const MAX_REQUESTS = 6

function Stat({
  value,
  label,
  accent,
}: {
  value: React.ReactNode
  label: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 border-2 border-black p-3",
        accent ? "bg-chart-1 text-black" : "bg-background"
      )}
    >
      <div className="font-head text-2xl leading-none tabular-nums">{value}</div>
      <div className={cn("text-xs", accent ? "font-semibold text-black/75" : "text-muted-foreground")}>
        {label}
      </div>
    </div>
  )
}

function Avatar({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-14 shrink-0 place-items-center border-2 border-black font-head text-lg text-black shadow-[3px_3px_0_0_#000]",
        color
      )}
    >
      {children}
    </span>
  )
}

const cardClass =
  "@container flex min-w-0 flex-col gap-5 border-2 border-black bg-card p-5 text-card-foreground shadow-[4px_4px_0_0_var(--shadow-color)]"

export function PersonCard({
  person,
  color,
  weeks,
  sparkMax,
  today,
  ownedRequests,
}: {
  person: PersonStats
  color: PersonColor
  weeks: string[]
  sparkMax: number
  today: string
  ownedRequests: number
}) {
  const inProgress = person.inTesting + person.inDevelopment
  const shown = person.requests.slice(0, MAX_REQUESTS)
  const hidden = person.requests.length - shown.length
  const progressParts = [
    person.inTesting > 0 ? `${person.inTesting} testing` : "",
    person.inDevelopment > 0 ? `${person.inDevelopment} in dev` : "",
  ].filter(Boolean)

  return (
    <article className={cardClass} aria-label={person.name}>
      <div className="flex items-center gap-3.5">
        <Avatar color={color.bg}>{initialsOf(person.name)}</Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate font-head text-xl leading-tight">{person.name}</h3>
          <span className="text-[13px] text-muted-foreground">
            {ownedRequests > 0 ? `Owns ${plural(ownedRequests, "request")}` : "Contributor"}
          </span>
        </div>
        {person.shippedPoints > 0 && person.share < 0.9995 ? (
          <span
            className={cn(
              "ml-auto shrink-0 border-2 border-black px-2 py-0.5 font-mono text-xs font-bold text-black",
              color.bg
            )}
            title="Share of shipped points in this period"
          >
            {Math.round(person.share * 100)}%
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5 @md:grid-cols-3">
        <Stat value={formatPoints(person.shippedPoints)} label="pts shipped" accent />
        <Stat value={person.shippedTasks} label={person.shippedTasks === 1 ? "task shipped" : "tasks shipped"} />
        <Stat
          value={inProgress}
          label={progressParts.length > 0 ? `in progress: ${progressParts.join(", ")}` : "in progress"}
        />
        <Stat value={person.sessions} label={person.sessions === 1 ? "session run" : "sessions run"} />
        <Stat value={formatHours(person.minutes)} label="hours in sessions" />
        <Stat value={person.commits} label={person.commits === 1 ? "commit" : "commits"} />
      </div>

      <div className="flex flex-col gap-2">
        <MonoLabel>Pts shipped per week · last {weeks.length}</MonoLabel>
        <div className="border-2 border-black bg-background px-2 pt-2">
          <PeopleSparkline
            weeks={weeks}
            values={person.weekly}
            max={sparkMax}
            fill={color.fill}
            name={person.name}
            today={today}
          />
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="flex flex-col gap-2">
          <MonoLabel>Worked on</MonoLabel>
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((r) => (
              <li key={r.id} className="min-w-0 max-w-full">
                <Link
                  href={boardViewHref({ view: "request", request: r.id, hasRequestBoard: true })}
                  className="inline-flex min-h-11 max-w-full items-center gap-2 border-2 border-black bg-muted px-2.5 text-[13px] font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="truncate">{r.title}</span>
                  {r.points > 0 ? (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatPoints(r.points)} pts
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
            {hidden > 0 ? (
              <li className="inline-flex min-h-11 items-center px-1 text-[13px] text-muted-foreground">
                and {plural(hidden, "more request")}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

export function AgentSessionsCard({
  agent,
  activityHref,
}: {
  agent: AgentSessionStats
  activityHref: string
}) {
  return (
    <article className={cardClass} aria-label="Agent sessions">
      <div className="flex items-center gap-3.5">
        <Avatar color="bg-chart-3">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="4" y="7" width="16" height="12" />
            <path d="M12 3v4M9 12h.01M15 12h.01M9 16h6" />
          </svg>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-head text-xl leading-tight">Agent sessions</h3>
          <span className="text-[13px] text-muted-foreground">Every work log session in the period</span>
        </div>
      </div>

      {agent.sessions > 0 ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Stat value={agent.sessions} label={agent.sessions === 1 ? "session" : "sessions"} accent />
          <Stat value={formatHours(agent.minutes)} label="hours" />
          <Stat value={formatMinutes(agent.avgMinutes)} label="average session" />
          <Stat value={agent.tasksTouched} label={agent.tasksTouched === 1 ? "task touched" : "tasks touched"} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No sessions were logged in this period.</p>
      )}

      <p className="text-[13px] text-muted-foreground">
        Work logs name the person who ran each session, not the agent, so agent sessions are
        counted together. A session that worked on several tasks counts once.
      </p>
      <Link
        href={activityHref}
        className="mt-auto inline-flex min-h-11 items-center self-start text-sm font-bold underline-offset-4 hover:underline"
      >
        Open activity
      </Link>
    </article>
  )
}
