"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "../../lib/utils"
import { BOARD_VIEW_LABELS, boardViewHref, type BoardView } from "../../lib/board-model/request-nav"
import { ThemeToggle } from "../theme-toggle"
import { BrandBlock } from "../board/brand-block"
import { FloatingChromeToggle } from "../board/floating-chrome-toggle"
import type { ContributorIdentity } from "../../lib/board-model/identity"
import { MonoLabel } from "./request-ui"

type NavItem = {
  view: BoardView
  icon: string
  badge?: number
  badgeTone?: "count" | "alert"
}

const ICONS = {
  work: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  requests: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6",
  roadmap: "M3 6h10M3 12h16M3 18h7",
  status: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  activity:
    "M6 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM6 15.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM18 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM6 8.5v7M18 10.5c0 4-6 3-11 5",
  people: "M9 4a4 4 0 100 8 4 4 0 000-8zM2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5",
  overall: "M4 5h16M8 12h12M12 19h8",
  workitems: "M4 6h16M4 12h16M4 18h16",
  worklog: "M12 7v5l3 3M12 3a9 9 0 100 18 9 9 0 000-18z",
  changelog: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h4",
  reports: "M5 20V10M12 20V4M19 20v-7",
} as const

export type BoardSidebarProps = {
  activeView: BoardView
  projectName: string
  /** e.g. "6 requests · 4 meetings" */
  projectMeta?: string
  /** Project switcher or other control under the brand (live mode). */
  projectSlot?: React.ReactNode
  openRequestCount?: number
  /** Meetings with tasks still open, shown as an alert badge on Work. */
  openMeetingTaskCount?: number
  hasChangelog?: boolean
  hasReports?: boolean
  /** Footer line, e.g. "Synced 2 min ago". */
  syncNote?: React.ReactNode
  /** Who is looking at the board (git user locally, signed-in user in the Cloud). */
  user?: ContributorIdentity | null
  /** Brand name and tagline, as in the app bar (the Cloud passes its own). */
  brandTitle?: string
  brandTagline?: string
  className?: string
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={boardViewHref({ view: item.view, hasRequestBoard: true })}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 border-2 px-2.5 text-sm font-bold transition-colors",
        active
          ? "border-black bg-primary text-primary-foreground shadow-[3px_3px_0_0_#000]"
          : "border-transparent text-foreground hover:border-black hover:bg-muted",
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <path d={ICONS[item.view as keyof typeof ICONS] ?? ICONS.work} />
      </svg>
      <span className="flex-1">{BOARD_VIEW_LABELS[item.view]}</span>
      {item.badge ? (
        <span
          className={cn(
            "border-2 border-black px-1.5 font-mono text-[11px]",
            item.badgeTone === "alert"
              ? "bg-chart-3 text-black"
              : active
                ? "bg-black text-primary"
                : "bg-muted text-foreground",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}

/**
 * Left navigation for request boards: Work, Requests and Roadmap; Client
 * status for reports; the legacy list views under "Board files".
 */
export function BoardSidebar({
  activeView,
  projectName,
  projectMeta,
  projectSlot,
  openRequestCount,
  openMeetingTaskCount,
  hasChangelog,
  hasReports,
  syncNote,
  user,
  brandTitle = "Taskmark",
  brandTagline = "Product memory for agent work",
  className,
}: BoardSidebarProps) {
  const activeKey: BoardView = activeView === "request" ? "requests" : activeView
  const work: NavItem[] = [
    { view: "work", icon: ICONS.work, badge: openMeetingTaskCount, badgeTone: "alert" },
    { view: "requests", icon: ICONS.requests, badge: openRequestCount, badgeTone: "count" },
    { view: "roadmap", icon: ICONS.roadmap },
  ]
  const reportsNav: NavItem[] = [
    { view: "status", icon: ICONS.status },
    { view: "activity", icon: ICONS.activity },
    { view: "people", icon: ICONS.people },
  ]
  const files: NavItem[] = [
    { view: "overall", icon: ICONS.overall },
    { view: "workitems", icon: ICONS.workitems },
    { view: "worklog", icon: ICONS.worklog },
    ...(hasChangelog ? [{ view: "changelog" as const, icon: ICONS.changelog }] : []),
    ...(hasReports ? [{ view: "reports" as const, icon: ICONS.reports }] : []),
  ]

  return (
    <aside
      aria-label="Main"
      className={cn(
        "flex flex-col gap-4 border-black bg-card pb-5 text-card-foreground lg:sticky lg:top-0 lg:h-[calc(100svh-2rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r-2",
        className,
      )}
    >
      {/* Same header strip as the app bar on legacy boards. */}
      <header className="border-b-2 border-border bg-card/95 shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-4">
          <BrandBlock title={brandTitle} tagline={brandTagline} className="flex-1" />
        </div>
      </header>

      <div className="flex flex-col gap-4 px-3.5">
        <div className="flex min-h-13 items-center gap-2.5 border-2 border-black bg-background px-2.5 py-2 shadow-[3px_3px_0_0_var(--shadow-color)]">
          <span className="grid size-7 shrink-0 place-items-center border-2 border-black bg-chart-4 font-head text-xs text-black">
            {projectName.slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold">{projectName}</span>
            {projectMeta ? (
              <span className="truncate text-[11px] text-muted-foreground">{projectMeta}</span>
            ) : null}
          </span>
        </div>
        {projectSlot}

        <nav
          aria-label="Sections"
          className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col"
        >
          <MonoLabel className="col-span-full px-2 py-1">Work</MonoLabel>
          {work.map((item) => (
            <NavLink key={item.view} item={item} active={activeKey === item.view} />
          ))}
          <MonoLabel className="col-span-full px-2 pt-3.5 pb-1">Reports</MonoLabel>
          {reportsNav.map((item) => (
            <NavLink key={item.view} item={item} active={activeKey === item.view} />
          ))}
          <MonoLabel className="col-span-full px-2 pt-3.5 pb-1">Board files</MonoLabel>
          {files.map((item) => (
            <NavLink key={item.view} item={item} active={activeKey === item.view} />
          ))}
        </nav>
      </div>

      <div className="mx-3.5 mt-auto flex items-center gap-2.5 border-t-2 border-muted pt-3">
        {user ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              aria-hidden
              className="grid size-7.5 shrink-0 place-items-center border-2 border-black bg-chart-4 text-[10px] font-bold text-black"
            >
              {user.initials || user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col text-xs">
              <span className="truncate font-bold" title={user.email || undefined}>
                {user.name}
              </span>
              {syncNote ? (
                <span className="truncate text-muted-foreground">{syncNote}</span>
              ) : user.email ? (
                <span className="truncate text-muted-foreground">{user.email}</span>
              ) : null}
            </span>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col text-xs">
            {syncNote ?? <span className="text-muted-foreground">Read from the board files</span>}
          </div>
        )}
        <div className="flex shrink-0 gap-2">
          <FloatingChromeToggle />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

/** Sidebar plus main column. Stacks on small screens. */
export function RequestShell({
  sidebar,
  children,
  footer,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="tm-surface flex min-h-[calc(100svh-2rem)] flex-col lg:flex-row">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-8 sm:px-8 2xl:px-10">
          {children}
        </main>
        {footer}
      </div>
    </div>
  )
}
