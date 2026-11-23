/**
 * Shared layout classes for the roadmap timeline, used by the server panel and
 * the client row toggle so both keep the same columns.
 */

/** Label column on the left, time track on the right. */
export const ROADMAP_ROW_GRID =
  "grid grid-cols-[160px_minmax(0,1fr)] md:grid-cols-[300px_minmax(0,1fr)]"

/** Offset of the track (matches the label column width). */
export const ROADMAP_TRACK_OFFSET = "left-[160px] md:left-[300px]"

/** Label cell stays put while the track scrolls sideways on small screens. */
export const ROADMAP_LABEL_CELL = "sticky left-0 z-10 flex min-w-0 border-r-2 border-black bg-card"

/** Minimum chart width; the container scrolls sideways below it. */
export const ROADMAP_MIN_WIDTH = "min-w-[720px] md:min-w-[900px]"
