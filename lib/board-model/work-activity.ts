export type WorkActivityEvent = {
  /** Stable event identifier used to deduplicate repeated snapshots. */
  id: string
  actor: string
  itemId: string
  itemTitle: string
  path: string
  summary: string
  started: string
  ended: string
  /** ISO timestamp for when this client received the event. */
  receivedAt: string
}

export type WorkPresenceCard = {
  id: string
  actor: string
  summary: string
  /** Complete summary shown when the compact card is opened. */
  fullSummary?: string
  generatedAt: string
  sourceEventIds?: readonly string[]
  status?: "ready" | "generating"
}

export const WORK_ACTIVITY_MAX_VISIBLE = 5
