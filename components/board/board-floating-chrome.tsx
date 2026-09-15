"use client"

import * as React from "react"
import { MessageSquareIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import {
  worklogEntriesToActivityEvents,
  type WorkActivityEvent,
  type WorkPresenceCard,
} from "../../lib/board-model/work-activity"
import { dailyWorklogPace, worklogPaceIcon } from "../../lib/board-model/worklog-pace"
import type { WorklogEntry } from "../../lib/board-model/worklog"
import {
  useFloatingChromeCollapsed,
  useFloatingChromePulse,
} from "./floating-chrome-toggle"
import {
  useWorkActivityToasts,
  WorkActivityFeed,
  WorkActivityToastStack,
} from "./work-activity-feed"
import { WorkPresenceFeed } from "./work-presence-feed"
import { WorklogPacePeek, WorklogSpeedometer } from "./worklog-speedometer"

/** App footer is `h-8`. Keep chrome above it with 1rem inset. */
const FOOTER_CLEARANCE = "bottom-12"
/** Peek is `size-12` at `bottom-12`, so the sheet sits on the button's top edge. */
const SHEET_ABOVE_PEEK = "bottom-24"

function HoverExpandChrome({
  collapsed,
  forceOpen = false,
  side,
  peek,
  peekLabel,
  children,
  className,
}: {
  collapsed: boolean
  forceOpen?: boolean
  side: "left" | "right"
  peek: React.ReactNode
  peekLabel: string
  children: React.ReactNode
  className?: string
}) {
  const isLeft = side === "left"
  const panelWidth = isLeft
    ? "w-[20rem]"
    : "w-[min(24rem,calc(100vw-1.5rem))]"
  const sideInset = isLeft ? "left-4" : "right-4"

  if (!collapsed) {
    return (
      <div
        className={cn(
          "pointer-events-auto fixed z-50 hidden md:block",
          FOOTER_CLEARANCE,
          sideInset,
          panelWidth,
          className,
        )}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group/chrome pointer-events-none fixed inset-y-0 z-50 hidden md:block",
        isLeft ? "left-0" : "right-0",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-auto absolute top-0 bottom-8 w-4",
          isLeft ? "left-0" : "right-0",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-8 w-1 rounded-full bg-primary/0 transition-colors duration-200 group-hover/chrome:bg-primary/50",
            isLeft ? "left-0 rounded-r-full" : "right-0 rounded-l-full",
          )}
        />
      </div>
      <button
        type="button"
        aria-label={peekLabel}
        className={cn(
          "pointer-events-auto absolute z-10 flex items-center justify-center rounded-lg border-2 border-border bg-card/95 text-sm font-head shadow-md",
          isLeft ? "w-12 py-2" : "size-12",
          FOOTER_CLEARANCE,
          sideInset,
        )}
      >
        {peek}
      </button>
      <div
        className={cn(
          "pointer-events-none absolute z-20 max-h-[min(80vh,calc(100vh-7rem))] overflow-y-auto opacity-0 transition duration-200 ease-in-out",
          SHEET_ABOVE_PEEK,
          panelWidth,
          sideInset,
          isLeft ? "-translate-x-[110%]" : "translate-x-[110%]",
          "group-hover/chrome:pointer-events-auto group-hover/chrome:translate-x-0 group-hover/chrome:opacity-100 group-focus-within/chrome:pointer-events-auto group-focus-within/chrome:translate-x-0 group-focus-within/chrome:opacity-100",
          forceOpen && "pointer-events-auto translate-x-0 opacity-100",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function BoardFloatingChrome({
  events,
  eventsReady = true,
  presence,
  presenceReady = true,
  worklogEntries,
  className,
}: {
  events?: readonly WorkActivityEvent[]
  eventsReady?: boolean
  presence?: readonly WorkPresenceCard[]
  presenceReady?: boolean
  worklogEntries: readonly WorklogEntry[]
  className?: string
}) {
  const collapsed = useFloatingChromeCollapsed()
  const presencePulse = useFloatingChromePulse()
  const activityToasts = useWorkActivityToasts(collapsed)

  const derivedEvents = React.useMemo(
    () => events ?? worklogEntriesToActivityEvents(worklogEntries),
    [events, worklogEntries],
  )
  const todayPace = React.useMemo(
    () => dailyWorklogPace(worklogEntries),
    [worklogEntries],
  )
  const todayIcon = worklogPaceIcon(todayPace)
  const generatingPresence = React.useMemo(
    () => (presence ?? []).some((card) => card.status === "generating"),
    [presence],
  )

  return (
    <>
      <HoverExpandChrome
        collapsed={collapsed}
        forceOpen={presencePulse.open || generatingPresence}
        side="left"
        peekLabel="Worklog count (hover or use the left edge to expand)"
        peek={
          <WorklogPacePeek icon={todayIcon} today={todayPace.today} />
        }
        className={className}
      >
        <div className="flex flex-col gap-3">
          <WorkPresenceFeed
            cards={presence ?? []}
            ready={presenceReady}
            layout="inline"
            onNewCards={presencePulse.pulse}
          />
          <WorklogSpeedometer entries={worklogEntries} layout="inline" />
        </div>
      </HoverExpandChrome>

      <HoverExpandChrome
        collapsed={collapsed}
        side="right"
        peekLabel="Worklog messages (hover or use the right edge to expand)"
        peek={<MessageSquareIcon className="size-5" aria-hidden />}
      >
        <WorkActivityFeed
          events={derivedEvents}
          ready={eventsReady}
          layout="inline"
          onNewEvents={activityToasts.push}
        />
      </HoverExpandChrome>

      {collapsed ? (
        <WorkActivityToastStack
          events={activityToasts.toasts}
          className={cn(
            "fixed z-40",
            SHEET_ABOVE_PEEK,
            "right-4",
          )}
        />
      ) : null}
    </>
  )
}
