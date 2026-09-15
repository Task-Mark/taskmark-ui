"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"

import { Bubble, BubbleContent } from "@taskmark/components/ui/bubble"
import {
  Message,
  MessageContent,
  MessageGroup,
  MessageHeader,
} from "@taskmark/components/ui/message"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { cn } from "../../lib/utils"
import { bong001Sound } from "../../lib/bong-001"
import { playSound } from "../../lib/sound-engine"
import type { WorkPresenceCard } from "../../lib/board-model/work-activity"
import { WORK_PRESENCE_MAX_VISIBLE } from "../../lib/board-model/work-activity"
import { ActorAvatar } from "./actor-avatar"
import { Skeleton } from "../ui/skeleton"

function generatedTime(card: WorkPresenceCard): number | null {
  const value = Date.parse(card.generatedAt)
  return Number.isFinite(value) ? value : null
}

function isUsableCard(value: WorkPresenceCard): boolean {
  if (!value || typeof value.actor !== "string" || !value.actor.trim()) {
    return false
  }
  if (value.status === "generating") return true
  return Boolean(
    typeof value.summary === "string" &&
      value.summary.trim() &&
      typeof value.generatedAt === "string" &&
      generatedTime(value) != null,
  )
}

function actorKey(actor: string): string {
  return actor.trim().toLocaleLowerCase() || "unknown"
}

function preferredCard(
  left: WorkPresenceCard,
  right: WorkPresenceCard,
): WorkPresenceCard {
  if (left.status === "generating" && right.status !== "generating") return left
  if (right.status === "generating" && left.status !== "generating") return right
  return (generatedTime(right) ?? 0) >= (generatedTime(left) ?? 0)
    ? right
    : left
}

function cardKey(card: WorkPresenceCard): string {
  return `${actorKey(card.actor)}\0${card.summary}\0${card.fullSummary ?? ""}\0${card.status ?? "ready"}`
}

/**
 * Who each teammate is working on right now, summarized from their recent work
 * logs. Sits on the left of the board, above the pace gauge.
 */
export function WorkPresenceFeed({
  cards,
  ready = true,
  layout = "floating",
  className,
  onNewCards,
}: {
  cards: readonly WorkPresenceCard[]
  /**
   * False until the caller has fetched once. The first fetched batch seeds the
   * column silently, so a page load never replays existing summaries.
   */
  ready?: boolean
  /** Floating stays out of the page flow and is hidden on mobile. */
  layout?: "floating" | "inline"
  className?: string
  /** Fires after the silent seed when a ready presence summary appears. */
  onNewCards?: (cards: readonly WorkPresenceCard[]) => void
}) {
  const seeded = React.useRef(false)
  const announced = React.useRef(new Set<string>())
  const onNewCardsRef = React.useRef(onNewCards)
  onNewCardsRef.current = onNewCards

  const visible = React.useMemo(() => {
    const byActor = new Map<string, WorkPresenceCard>()
    for (const card of Array.isArray(cards) ? cards : []) {
      if (!isUsableCard(card)) continue
      const key = actorKey(card.actor)
      const existing = byActor.get(key)
      byActor.set(key, existing ? preferredCard(existing, card) : card)
    }
    return [...byActor.values()]
      .sort(
        (a, b) => (generatedTime(a) ?? 0) - (generatedTime(b) ?? 0),
      )
      .slice(-WORK_PRESENCE_MAX_VISIBLE)
  }, [cards])

  React.useEffect(() => {
    const newcomers = visible.filter(
      (card) =>
        card.status !== "generating" && !announced.current.has(cardKey(card)),
    )
    for (const card of visible) announced.current.add(cardKey(card))
    if (!seeded.current) {
      if (ready) seeded.current = true
      return
    }
    if (newcomers.length > 0) onNewCardsRef.current?.(newcomers)
    for (let index = 0; index < newcomers.length; index += 1) {
      window.setTimeout(() => {
        void playSound(bong001Sound.dataUri, { volume: 0.7 }).catch(() => {})
      }, index * 90)
    }
  }, [visible, ready])

  if (visible.length === 0) return null

  return (
    <MessageGroup
      aria-label="Who is working now"
      aria-live="polite"
      className={cn(
        "pointer-events-auto",
        layout === "floating" &&
          "fixed left-4 bottom-12 z-50 hidden w-[min(24rem,calc(100vw-2rem))] md:flex",
        className
      )}
    >
      {visible.map((card) => {
        const generating = card.status === "generating"
        const generatedAtMs = generatedTime(card)
        const generatedAt =
          generatedAtMs != null ? new Date(generatedAtMs) : null
        const relativeTime = generatedAt
          ? formatDistanceToNow(generatedAt, { addSuffix: true })
          : ""
        return (
        <Message
          key={actorKey(card.actor)}
          className="items-start"
          aria-busy={generating || undefined}
          aria-label={
            generating
              ? `Generating a work summary for ${card.actor}`
              : undefined
          }
        >
          <ActorAvatar actor={card.actor} />
          <MessageContent className="gap-1">
            <MessageHeader className="justify-between gap-3">
              <span className="truncate">{card.actor}</span>
              <span className="shrink-0 font-normal">
                {generating ? (
                  <span className="font-normal text-muted-foreground">
                    Generating summary
                  </span>
                ) : generatedAt ? (
                  <time dateTime={generatedAt.toISOString()}>
                    {relativeTime}
                  </time>
                ) : null}
              </span>
            </MessageHeader>
            {generating ? (
              <Bubble variant="outline" className="max-w-full" aria-hidden>
                <BubbleContent className="w-full border-2 bg-card shadow-md">
                  <div className="flex flex-col gap-2 py-0.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-[88%]" />
                    <Skeleton className="h-3 w-[62%]" />
                  </div>
                </BubbleContent>
              </Bubble>
            ) : generatedAt ? (
            <Dialog>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Open full work summary for ${card.actor}`}
                    className="block max-w-full cursor-pointer text-left"
                  />
                }
              >
                <Bubble variant="outline" className="max-w-full">
                  <BubbleContent className="w-full border-2 bg-card shadow-md transition-colors hover:bg-muted/50">
                    <p className="text-muted-foreground">{`“${card.summary}”`}</p>
                  </BubbleContent>
                </Bubble>
              </DialogTrigger>
              <DialogContent className="max-h-[min(80svh,48rem)] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <div className="flex items-center gap-3 pr-8">
                    <ActorAvatar actor={card.actor} className="self-center" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <DialogTitle className="truncate">
                        {card.actor}
                      </DialogTitle>
                      <time
                        dateTime={generatedAt.toISOString()}
                        title={generatedAt.toLocaleString()}
                        className="text-xs font-medium text-muted-foreground"
                      >
                        {relativeTime}
                      </time>
                    </div>
                  </div>
                  <DialogDescription className="whitespace-pre-wrap leading-relaxed">
                    {card.fullSummary?.trim() || card.summary}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            ) : null}
          </MessageContent>
        </Message>
        )
      })}
    </MessageGroup>
  )
}
