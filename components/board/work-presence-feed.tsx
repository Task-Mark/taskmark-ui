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
import { ActorAvatar } from "./actor-avatar"

function generatedTime(card: WorkPresenceCard): number | null {
  const value = Date.parse(card.generatedAt)
  return Number.isFinite(value) ? value : null
}

function isUsableCard(value: WorkPresenceCard): boolean {
  return Boolean(
    value &&
      typeof value.actor === "string" &&
      value.actor.trim() &&
      typeof value.summary === "string" &&
      value.summary.trim() &&
      typeof value.generatedAt === "string" &&
      generatedTime(value) != null
  )
}

function cardKey(card: WorkPresenceCard): string {
  return `${card.actor}\0${card.summary}\0${card.fullSummary ?? ""}`
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
}) {
  const seeded = React.useRef(false)
  const announced = React.useRef(new Set<string>())

  const visible = React.useMemo(
    () =>
      (Array.isArray(cards) ? cards : [])
        .filter(isUsableCard)
        .sort((a, b) => (generatedTime(a) ?? 0) - (generatedTime(b) ?? 0)),
    [cards],
  )

  React.useEffect(() => {
    const newcomers = visible.filter(
      (card) => !announced.current.has(cardKey(card)),
    )
    for (const card of visible) announced.current.add(cardKey(card))
    if (!seeded.current) {
      if (ready) seeded.current = true
      return
    }
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
          "fixed left-4 bottom-4 z-50 hidden w-[min(24rem,calc(100vw-2rem))] md:flex",
        className
      )}
    >
      {visible.map((card) => (
        <Message key={card.actor} className="items-start">
          <ActorAvatar actor={card.actor} />
          <MessageContent className="gap-1">
            <MessageHeader className="justify-between gap-3">
              <span className="truncate">{card.actor}</span>
              <span className="shrink-0 font-normal">
                {formatDistanceToNow(new Date(generatedTime(card)!), {
                  addSuffix: true,
                })}
              </span>
            </MessageHeader>
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
                  <DialogTitle>{card.actor}</DialogTitle>
                  <DialogDescription className="whitespace-pre-wrap leading-relaxed">
                    {card.fullSummary?.trim() || card.summary}
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </MessageContent>
        </Message>
      ))}
    </MessageGroup>
  )
}
