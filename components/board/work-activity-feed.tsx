"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"

import {
  Avatar,
  AvatarFallback,
} from "@taskmark/components/ui/avatar"
import {
  Bubble,
  BubbleContent,
} from "@taskmark/components/ui/bubble"
import {
  Message,
  MessageAvatar,
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
import {
  deriveInitials,
  identityBackgroundColor,
} from "../../lib/board-model/identity"
import {
  WORK_ACTIVITY_MAX_VISIBLE,
  WORK_ACTIVITY_TTL_MS,
  type WorkActivityEvent,
} from "../../lib/board-model/work-activity"
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

export function WorkActivityFeed({
  events,
  className,
}: {
  events: readonly WorkActivityEvent[]
  className?: string
}) {
  const [now, setNow] = React.useState(() => Date.now())
  const [feed, setFeed] = React.useState<{
    visible: WorkActivityEvent[]
    seen: Map<string, number>
  }>(() => ({ visible: [], seen: new Map() }))
  const visible = feed.visible
  const seeded = React.useRef(false)
  const announcedIds = React.useRef(new Set<string>())

  React.useEffect(() => {
    const current = Date.now()
    setNow(current)
    const incoming = (Array.isArray(events) ? events : []).filter(
      (event) =>
        isUsableEvent(event) &&
        current - receivedTime(event)! < WORK_ACTIVITY_TTL_MS,
    )
    const newcomers = incoming.filter(
      (event) => !announcedIds.current.has(event.id),
    )
    for (const event of incoming) announcedIds.current.add(event.id)
    if (!seeded.current) {
      seeded.current = true
    } else if (newcomers.length > 0) {
      for (let index = 0; index < newcomers.length; index += 1) {
        window.setTimeout(() => {
          void playSound(bong001Sound.dataUri, { volume: 0.7 }).catch(() => {})
        }, index * 90)
      }
    }
    setFeed((previous) => {
      const seen = new Map(
        Array.from(previous.seen).filter(
          ([, received]) => current - received < WORK_ACTIVITY_TTL_MS
        )
      )
      const merged = new Map<string, WorkActivityEvent>()
      for (const event of previous.visible) {
        const received = receivedTime(event)
        if (received != null && current - received < WORK_ACTIVITY_TTL_MS) {
          merged.set(event.id, event)
          seen.set(event.id, received)
        }
      }
      for (const event of Array.isArray(events) ? events : []) {
        if (!isUsableEvent(event)) continue
        const received = receivedTime(event)!
        if (current - received >= WORK_ACTIVITY_TTL_MS) continue
        if (seen.has(event.id)) {
          if (merged.has(event.id)) merged.set(event.id, event)
        } else {
          seen.set(event.id, received)
          merged.set(event.id, event)
        }
      }
      return {
        visible: Array.from(merged.values())
          .sort(
            (a, b) =>
              (receivedTime(a) ?? 0) - (receivedTime(b) ?? 0)
          )
          .slice(-WORK_ACTIVITY_MAX_VISIBLE),
        seen,
      }
    })
  }, [events])

  React.useEffect(() => {
    if (visible.length === 0) return
    const nextExpiry = Math.min(
      ...visible.map(
        (event) => (receivedTime(event) ?? now) + WORK_ACTIVITY_TTL_MS
      )
    )
    const delay = Math.max(50, Math.min(30_000, nextExpiry - Date.now()))
    const timer = window.setTimeout(() => {
      const current = Date.now()
      setNow(current)
      setFeed((currentFeed) => ({
        visible: currentFeed.visible.filter((event) => {
          const received = receivedTime(event)
          return received != null && current - received < WORK_ACTIVITY_TTL_MS
        }),
        seen: new Map(
          Array.from(currentFeed.seen).filter(
            ([, received]) => current - received < WORK_ACTIVITY_TTL_MS
          )
        ),
      }))
    }, delay)
    return () => window.clearTimeout(timer)
  }, [visible, now])

  if (visible.length === 0) return null

  return (
    <MessageGroup
      aria-label="Recent work activity"
      aria-live="polite"
      className={cn(
        "pointer-events-auto fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100vw-2rem))]",
        className
      )}
    >
      {visible.map((event) => {
        const received = new Date(receivedTime(event)!)
        const initials = deriveInitials(event.actor)
        const color = identityBackgroundColor({
          name: event.actor,
          email: "",
          initials,
        })
        return (
          <Message key={event.id} className="items-start">
            <MessageAvatar className="self-start translate-y-0 group-has-data-[slot=message-footer]/message:translate-y-0">
              <Avatar size="lg" aria-hidden="true">
                <AvatarFallback
                  className="font-semibold tracking-wide text-white"
                  style={{ backgroundColor: color }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </MessageAvatar>
            <MessageContent className="gap-1">
              <MessageHeader className="justify-between gap-3">
                <span className="truncate">{event.actor || "Unknown actor"}</span>
                <span className="shrink-0 font-normal">
                  {formatDistanceToNow(received, { addSuffix: true })}
                </span>
              </MessageHeader>
              <Bubble variant="outline" className="max-w-full">
                <BubbleContent className="w-full border-2 bg-card shadow-md">
                  <FeedItemTag
                    itemId={event.itemId}
                    itemTitle={event.itemTitle}
                  />
                </BubbleContent>
              </Bubble>
              <MessageFooter>
                Started {formatTaskmarkDateTime(event.started)}
              </MessageFooter>
            </MessageContent>
          </Message>
        )
      })}
    </MessageGroup>
  )
}
