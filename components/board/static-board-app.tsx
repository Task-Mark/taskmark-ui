"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { AppBar } from "./app-bar"
import { ChangelogPanel } from "./changelog-panel"
import { ListViewSwitcher } from "./list-view-switcher"
import { OverallTreeList } from "./overall-tree-list"
import { PointsHeatmap } from "./points-heatmap"
import { ProjectStatusMetricsStrip } from "./project-status-metrics-strip"
import { ReportsPanel } from "./reports-panel"
import { WorkItemsList } from "./work-items-list"
import { WorkItemSheetProvider } from "./work-item-sheet"
import { WorklogPanel } from "./worklog-panel"
import { HIDE_COMPLETED_DEFAULT } from "../../lib/board-model/constants"
import { flattenWorklogEntries } from "../../lib/board-model/worklog"
import {
  LIST_VIEW_LABELS,
  parseListViewMode,
  type ListViewMode,
} from "../../lib/board-model/list-view-mode"
import { seedBoardSnapshot } from "../../lib/board-model/snapshot-client"
import type { BoardSnapshot } from "../../lib/board-model/snapshot-types"

function headingForView(view: ListViewMode): string {
  if (view === "overall") return "Overall"
  return LIST_VIEW_LABELS[view]
}

export function StaticBoardApp({
  snapshot,
  actions,
  title = "Taskmark",
  tagline = "Product memory for agent work",
}: {
  snapshot: BoardSnapshot
  actions?: React.ReactNode
  title?: string
  tagline?: string
}) {
  React.useMemo(() => {
    seedBoardSnapshot(snapshot)
    return null
  }, [snapshot])

  const searchParams = useSearchParams()
  const changelogMarkdown = snapshot.changelogMarkdown?.trim()
    ? snapshot.changelogMarkdown
    : null
  const hasChangelog = changelogMarkdown != null
  const reports = snapshot.reports ?? []
  const hasReports = reports.length > 0
  const activeView = parseListViewMode(searchParams.get("view") ?? undefined, {
    hasChangelog,
    hasReports,
  })
  const selectedEpicId =
    activeView === "overall" ? searchParams.get("epic")?.trim() || null : null
  const selectedStoryId =
    activeView === "overall" && selectedEpicId
      ? searchParams.get("story")?.trim() || null
      : null
  const activeProject = snapshot.project
  const list = snapshot.epics
  const epicCount = list.epics.length
  const errorCount = list.errors.length
  const hideCompleted = snapshot.hideCompleted ?? HIDE_COMPLETED_DEFAULT
  const countableCompletions = snapshot.countableCompletions
  const statusMetrics = snapshot.statusMetrics
  const workItemsList = snapshot.workItemsView
  const worklogEntries = React.useMemo(
    () => flattenWorklogEntries(snapshot.detailsByPath),
    [snapshot.detailsByPath]
  )

  const selectedEpic = selectedEpicId
    ? list.epics.find((e) => e.id === selectedEpicId) ?? null
    : null

  return (
    <WorkItemSheetProvider>
      <div className="tm-surface min-h-svh">
        <AppBar title={title} tagline={tagline}>
          {actions}
        </AppBar>

        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-head text-3xl tracking-tight">
                {headingForView(activeView)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeProject.name}
                {activeView === "overall"
                  ? ` · ${epicCount} epic${epicCount === 1 ? "" : "s"}`
                  : ""}
                {activeView === "overall" && errorCount > 0
                  ? ` · ${errorCount} parse issue${errorCount === 1 ? "" : "s"}`
                  : ""}
                {activeView === "workitems"
                  ? ` · ${workItemsList.rows.length} item${workItemsList.rows.length === 1 ? "" : "s"}`
                  : ""}
                {activeView === "worklog"
                  ? ` · ${worklogEntries.length} entr${worklogEntries.length === 1 ? "y" : "ies"}`
                  : ""}
                {activeView === "overall" && selectedEpic
                  ? ` · expanded ${selectedEpic.id}`
                  : activeView === "overall" && selectedEpicId
                    ? ` · epic ${selectedEpicId} not in list`
                    : ""}
                {activeView === "overall" && selectedStoryId
                  ? ` · story ${selectedStoryId}`
                  : ""}
              </p>
            </div>
            <ListViewSwitcher
              activeView={activeView}
              selectedEpicId={selectedEpicId}
              selectedStoryId={selectedStoryId}
              hasChangelog={hasChangelog}
              hasReports={hasReports}
            />
          </div>

          <ProjectStatusMetricsStrip metrics={statusMetrics} />

          {activeView === "overall" ? (
            <>
              <PointsHeatmap samples={countableCompletions} />
              <OverallTreeList
                list={list}
                workItemsByEpic={snapshot.workItemsByEpic}
                itemsByStory={snapshot.itemsByStory}
                selectedEpicId={selectedEpicId}
                selectedStoryId={selectedStoryId}
                countableCompletions={countableCompletions}
                initialHideCompleted={hideCompleted}
              />
            </>
          ) : null}

          {activeView === "workitems" ? (
            <WorkItemsList
              list={workItemsList}
              countableCompletions={countableCompletions}
              initialHideCompleted={hideCompleted}
            />
          ) : null}

          {activeView === "worklog" ? (
            <WorklogPanel entries={worklogEntries} />
          ) : null}

          {activeView === "changelog" && changelogMarkdown ? (
            <ChangelogPanel markdown={changelogMarkdown} />
          ) : null}

          {activeView === "reports" && hasReports ? (
            <ReportsPanel reports={reports} />
          ) : null}
        </div>
      </div>
    </WorkItemSheetProvider>
  )
}
