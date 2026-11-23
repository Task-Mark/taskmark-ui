import {
  DEFAULT_LIST_VIEW_MODE,
  parseListViewMode,
  type ListViewAvailability,
  type ListViewMode,
} from "./list-view-mode"

/**
 * Screens of a request board. They sit next to the legacy list views
 * (overall, workitems, worklog, changelog, reports), which stay reachable
 * from the sidebar under "Board files".
 */
export const REQUEST_VIEWS = [
  "work",
  "requests",
  "request",
  "roadmap",
  "status",
  "activity",
  "people",
] as const
export type RequestView = (typeof REQUEST_VIEWS)[number]

export type BoardView = RequestView | ListViewMode

export const BOARD_VIEW_LABELS: Record<BoardView, string> = {
  work: "Work",
  requests: "Requests",
  request: "Request",
  roadmap: "Roadmap",
  status: "Client status",
  activity: "Activity",
  people: "People",
  overall: "All epics",
  workitems: "All items",
  worklog: "Work log",
  changelog: "Changelog",
  reports: "Reports",
}

export type BoardViewAvailability = ListViewAvailability & {
  /** The board has requests or meetings (see `RequestBoardData`). */
  hasRequestBoard?: boolean
}

export function isRequestView(view: BoardView): view is RequestView {
  return (REQUEST_VIEWS as readonly string[]).includes(view)
}

/** Request boards open on Work; legacy boards keep Overall. */
export function defaultBoardView(availability?: BoardViewAvailability): BoardView {
  return availability?.hasRequestBoard ? "work" : DEFAULT_LIST_VIEW_MODE
}

export function parseBoardView(
  value: string | string[] | undefined,
  availability?: BoardViewAvailability
): BoardView {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : ""
  if ((REQUEST_VIEWS as readonly string[]).includes(raw)) {
    return availability?.hasRequestBoard
      ? (raw as RequestView)
      : DEFAULT_LIST_VIEW_MODE
  }
  if (!raw) return defaultBoardView(availability)
  return parseListViewMode(raw, availability)
}

export type BoardViewHrefOptions = {
  view?: BoardView
  /** Request id (Work selection or the Request page). */
  request?: string | null
  /** Meeting id (Work selection). */
  meeting?: string | null
  /** Open the work item sheet (E-/S-/T-/B- id). */
  item?: string | null
  /** Client status period, e.g. `4w`, `12w`, `all`. */
  period?: string | null
  /** Request board default view, so `/` is used for it. */
  hasRequestBoard?: boolean
}

export function boardViewHref(opts: BoardViewHrefOptions): string {
  const params = new URLSearchParams()
  const view = opts.view ?? defaultBoardView(opts)
  if (view !== defaultBoardView(opts)) params.set("view", view)
  if (opts.request) params.set("request", opts.request)
  if (opts.meeting) params.set("meeting", opts.meeting)
  if (opts.period) params.set("period", opts.period)
  if (opts.item) params.set("item", opts.item)
  const qs = params.toString()
  return qs ? `/?${qs}` : "/"
}
