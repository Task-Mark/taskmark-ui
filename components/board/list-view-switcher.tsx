"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@taskmark/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@taskmark/components/ui/tabs"
import {
  LIST_VIEW_LABELS,
  boardHref,
  listViewModes,
  type ListViewMode,
} from "../../lib/board-model/list-view-mode"

type ListViewSwitcherProps = {
  activeView: ListViewMode
  selectedEpicId?: string | null
  selectedStoryId?: string | null
  hasChangelog?: boolean
  hasReports?: boolean
}

function useListViewNavigate(
  selectedEpicId: string | null,
  selectedStoryId: string | null,
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const itemId = searchParams.get("item")

  return React.useCallback(
    (value: string) => {
      const next = value as ListViewMode
      const href = boardHref({
        view: next,
        epic: next === "overall" ? selectedEpicId : null,
        story: next === "overall" ? selectedStoryId : null,
        item: itemId,
      })
      router.push(pathname === "/" ? href : `${pathname}${href.slice(1)}`)
    },
    [itemId, pathname, router, selectedEpicId, selectedStoryId],
  )
}

function ListViewSwitcherInner({
  activeView,
  selectedEpicId = null,
  selectedStoryId = null,
  hasChangelog = false,
  hasReports = false,
}: ListViewSwitcherProps) {
  const navigate = useListViewNavigate(selectedEpicId, selectedStoryId)
  const modes = listViewModes({ hasChangelog, hasReports })

  return (
    <div className="w-full min-w-0 md:w-auto">
      <div className="md:hidden">
        <Select
          value={activeView}
          onValueChange={(next) => {
            if (typeof next === "string") navigate(next)
          }}
        >
          <SelectTrigger
            className="h-10 w-full font-head"
            aria-label="Board list view"
          >
            <SelectValue>
              {(value: string | null) =>
                value ? LIST_VIEW_LABELS[value as ListViewMode] : ""
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {modes.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {LIST_VIEW_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Tabs
        className="hidden md:flex"
        value={activeView}
        onValueChange={(value) => {
          if (typeof value !== "string") return
          navigate(value)
        }}
      >
        <TabsList aria-label="Board list view">
          {modes.map((mode) => (
            <TabsTrigger key={mode} value={mode}>
              {LIST_VIEW_LABELS[mode]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

export function ListViewSwitcher(props: ListViewSwitcherProps) {
  const modes = listViewModes({
    hasChangelog: props.hasChangelog ?? false,
    hasReports: props.hasReports ?? false,
  })
  return (
    <React.Suspense
      fallback={
        <div className="w-full min-w-0 md:w-auto">
          <div className="md:hidden">
            <Select value={props.activeView} disabled>
              <SelectTrigger
                className="h-10 w-full font-head"
                aria-label="Board list view"
              >
                <SelectValue>
                  {(value: string | null) =>
                    value ? LIST_VIEW_LABELS[value as ListViewMode] : ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {modes.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {LIST_VIEW_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={props.activeView} className="hidden md:flex">
            <TabsList aria-label="Board list view">
              {modes.map((mode) => (
                <TabsTrigger key={mode} value={mode} disabled>
                  {LIST_VIEW_LABELS[mode]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      }
    >
      <ListViewSwitcherInner {...props} />
    </React.Suspense>
  )
}
