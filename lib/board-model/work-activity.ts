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

export const WORK_ACTIVITY_MAX_VISIBLE = 6
