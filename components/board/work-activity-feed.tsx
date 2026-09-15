"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"

import {
  Bubble,
  BubbleContent,
} from "@taskmark/components/ui/bubble"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@taskmark/components/ui/message"
import { Badge } from "@taskmark/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@taskmark/components/ui/tooltip"
import { cn } from "../../lib/utils"
import { formatTaskmarkDateTime } from "../../lib/format-date"
import { bong001Sound } from "../../lib/bong-001"
import { playSound } from "../../lib/sound-engine"
import { FLOATING_CHROME_PULSE_MS } from "../../lib/board-model/floating-chrome"
import {
  WORK_ACTIVITY_MAX_VISIBLE,
  type WorkActivityEvent,
} from "../../lib/board-model/work-activity"
import { ActorAvatar } from "./actor-avatar"
import { typeBadgeClass } from "./status-badge"

function itemKindFromId(id: string): "epic" | "story" | "task" | "bug" {
  if (id.startsWith("B-")) return "bug"
  if (id.startsWith("E-")) return "epic"
  if (id.startsWith("S-")) return "story"
  return "task"
}

function FeedItemTag({
  itemId,
  itemTitle,
}: {
  itemId: string
  itemTitle: string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className={cn(
                "cursor-default font-mono text-xs",
                typeBadgeClass(itemKindFromId(itemId)),
              )}
            />
          }
        >
          {itemId || "—"}
        </TooltipTrigger>
        <TooltipContent>{itemTitle || itemId || "Untitled"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function receivedTime(event: WorkActivityEvent): number | null {
  const value = Date.parse(event.receivedAt)
  return Number.isFinite(value) ? value : null
}

function isUsableEvent(value: WorkActivityEvent): boolean {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      value.id.trim() &&
      typeof value.actor === "string" &&
      typeof value.receivedAt === "string" &&
      receivedTime(value) != null
  )
}

function WorkActivityCard({ event }: { event: WorkActivityEvent }) {
  const received = new Date(receivedTime(event)!)
  return (
    <Message className="items-start">
      <ActorAvatar actor={event.actor} />
      <MessageContent className="gap-1">
        <MessageHeader className="justify-between gap-3">
          <span className="truncate">{event.actor || "Unknown actor"}</span>
          <span className="shrink-0 font-normal">
            {formatDistanceToNow(received, { addSuffix: true })}
          </span>
        </MessageHeader>
        <Bubble variant="outline" className="max-w-full">
          <BubbleContent className="flex w-full flex-col border-2 bg-card shadow-md">
            <div className="mb-2 flex justify-end">
              <FeedItemTag itemId={event.itemId} itemTitle={event.itemTitle} />
            </div>
            <p className="text-muted-foreground">{event.summary}</p>
          </BubbleContent>
        </Bubble>
        <MessageFooter>
          Started {formatTaskmarkDateTime(event.started)}
        </MessageFooter>
      </MessageContent>
    </Message>
  )
}

export function WorkActivityToastStack({
  events,
  className,
}: {
  events: readonly WorkActivityEvent[]
  className?: string
}) {
  if (events.length === 0) return null
  return (
    <MessageGroup
      aria-label="New work activity"
      aria-live="polite"
      className={cn(
        "pointer-events-auto hidden w-[min(24rem,calc(100vw-1.5rem))] md:flex",
        className,
      )}
    >
      {events.map((event) => (
        <WorkActivityCard key={event.id} event={event} />
      ))}
    </MessageGroup>
  )
}

export function useWorkActivityToasts(active: boolean): {
  toasts: readonly WorkActivityEvent[]
  push: (events: readonly WorkActivityEvent[]) => void
} {
  const [toasts, setToasts] = React.useState<WorkActivityEvent[]>([])
  const timers = React.useRef(new Map<string, number>())

  const clear = React.useCallback(() => {
    for (const timer of timers.current.values()) window.clearTimeout(timer)
    timers.current.clear()
    setToasts([])
  }, [])

  React.useEffect(() => {
    if (!active) clear()
  }, [active, clear])

  React.useEffect(() => () => clear(), [clear])

  const push = React.useCallback(
    (events: readonly WorkActivityEvent[]) => {
      if (!active || events.length === 0) return
      setToasts((previous) => {
        const merged = new Map(previous.map((event) => [event.id, event]))
        for (const event of events) merged.set(event.id, event)
        return Array.from(merged.values())
          .sort((a, b) => (receivedTime(a) ?? 0) - (receivedTime(b) ?? 0))
          .slice(-WORK_ACTIVITY_MAX_VISIBLE)
      })
      for (const event of events) {
        const existing = timers.current.get(event.id)
        if (existing) window.clearTimeout(existing)
        timers.current.set(
          event.id,
          window.setTimeout(() => {
            timers.current.delete(event.id)
            setToasts((previous) =>
              previous.filter((item) => item.id !== event.id),
            )
          }, FLOATING_CHROME_PULSE_MS),
        )
      }
    },
    [active],
  )

  return { toasts, push }
}

export function WorkActivityFeed({
  events,
  ready = true,
  layout = "floating",
  className,
  onNewEvents,
}: {
  events: readonly WorkActivityEvent[]
  /**
   * False until the caller has fetched once. The first fetched batch seeds the
   * feed silently, so a page load or refresh never replays existing messages.
   */
  ready?: boolean
  /** Floating stays out of the page flow and is hidden on mobile. */
  layout?: "floating" | "inline"
  className?: string
  /** Fires after the silent seed when newly received worklog events appear. */
  onNewEvents?: (events: readonly WorkActivityEvent[]) => void
}) {
  const [visible, setVisible] = React.useState<WorkActivityEvent[]>([])
  const seeded = React.useRef(false)
  const announcedIds = React.useRef(new Set<string>())
  const onNewEventsRef = React.useRef(onNewEvents)
  onNewEventsRef.current = onNewEvents

  React.useEffect(() => {
    const incoming = (Array.isArray(events) ? events : []).filter(isUsableEvent)
    const newcomers = incoming.filter(
      (event) => !announcedIds.current.has(event.id),
    )
    for (const event of incoming) announcedIds.current.add(event.id)
    if (!seeded.current) {
      if (ready) seeded.current = true
    } else if (newcomers.length > 0) {
      onNewEventsRef.current?.(newcomers)
      for (let index = 0; index < newcomers.length; index += 1) {
        window.setTimeout(() => {
          void playSound(bong001Sound.dataUri, { volume: 0.7 }).catch(() => {})
        }, index * 90)
      }
    }
    setVisible((previous) => {
      const merged = new Map<string, WorkActivityEvent>()
      for (const event of previous) merged.set(event.id, event)
      for (const event of incoming) merged.set(event.id, event)
      return Array.from(merged.values())
        .sort((a, b) => (receivedTime(a) ?? 0) - (receivedTime(b) ?? 0))
        .slice(-WORK_ACTIVITY_MAX_VISIBLE)
    })
  }, [events, ready])

  if (visible.length === 0) return null

  return (
    <MessageGroup
      aria-label="Recent work activity"
      aria-live="polite"
      className={cn(
        "pointer-events-auto",
        layout === "floating" &&
          "fixed right-4 bottom-12 z-50 hidden w-[min(24rem,calc(100vw-2rem))] md:flex",
        className
      )}
    >
      {visible.map((event) => (
        <WorkActivityCard key={event.id} event={event} />
      ))}
    </MessageGroup>
  )
}
