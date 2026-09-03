"use client"

import * as React from "react"

import { Badge } from "@taskmark/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@taskmark/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@taskmark/components/ui/tooltip"
import { cn } from "../../lib/utils"
import { formatTaskmarkDate } from "../../lib/format-date"
import {
  slicePage,
  type PageSize,
} from "../../lib/board-model/pagination"
import type { WorklogEntry } from "../../lib/board-model/worklog"
import { ListPagination } from "./list-pagination"
import { typeBadgeClass } from "./status-badge"
import { useWorkItemSheet } from "./work-item-sheet"

const WORKLOG_PAGE_SIZE: PageSize = 10

function WorkItemTag({ entry }: { entry: WorklogEntry }) {
  const { openDetailById } = useWorkItemSheet()
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer font-mono text-xs",
                typeBadgeClass(entry.itemType)
              )}
              render={
                <button
                  type="button"
                  onClick={() => openDetailById(entry.itemId)}
                />
              }
            />
          }
        >
          {entry.itemId}
        </TooltipTrigger>
        <TooltipContent>{entry.itemTitle || entry.itemId}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function WorklogPanel({ entries }: { entries: readonly WorklogEntry[] }) {
  const [requestedPage, setRequestedPage] = React.useState(1)
  const pagination = slicePage(entries, requestedPage, WORKLOG_PAGE_SIZE)

  React.useEffect(() => {
    if (requestedPage !== pagination.page) setRequestedPage(pagination.page)
  }, [pagination.page, requestedPage])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Worklog</CardTitle>
        <CardDescription>
          Every task and bug work session, newest first
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No task or bug worklog entries yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div role="list" className="flex flex-col gap-2 sm:hidden">
              {pagination.pageRows.map((entry) => (
                <article
                  key={entry.key}
                  role="listitem"
                  className="min-w-0 rounded border-2 border-border bg-card p-3 shadow-sm"
                >
                  <p className="font-head text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Summary
                  </p>
                  <div className="mt-1 break-words text-sm font-medium leading-snug">
                    {entry.summary || "—"}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-2.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Session</dt>
                      <dd className="mt-0.5 font-mono font-medium">
                        {entry.session || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Actor</dt>
                      <dd className="mt-0.5 font-medium">{entry.actor || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Started</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatTaskmarkDate(entry.started)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Ended</dt>
                      <dd className="mt-0.5 font-medium">
                        {formatTaskmarkDate(entry.ended)}
                      </dd>
                    </div>
                    <div className="col-span-full">
                      <dt className="text-muted-foreground">Work items</dt>
                      <dd className="mt-1">
                        <WorkItemTag entry={entry} />
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden w-full overflow-x-auto rounded border-2 border-border sm:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 font-head">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">Actor</th>
                    <th className="px-2 py-1.5">Started</th>
                    <th className="px-2 py-1.5">Ended</th>
                    <th className="px-2 py-1.5">Summary</th>
                    <th className="px-2 py-1.5">Work items</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.pageRows.map((entry) => (
                    <tr key={entry.key} className="border-t border-border">
                      <td className="px-2 py-1.5 font-mono">
                        {entry.session || "—"}
                      </td>
                      <td className="px-2 py-1.5">{entry.actor || "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {formatTaskmarkDate(entry.started)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {formatTaskmarkDate(entry.ended)}
                      </td>
                      <td className="px-2 py-1.5">{entry.summary || "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <WorkItemTag entry={entry} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ListPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              pageSize={WORKLOG_PAGE_SIZE}
              onPageChange={setRequestedPage}
              onPageSizeChange={() => {}}
              showPageSize={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
