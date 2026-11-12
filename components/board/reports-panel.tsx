"use client"

import * as React from "react"

import { MarkdownSourceProvider } from "./board-assets"
import { MarkdownContent } from "./markdown-content"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@taskmark/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@taskmark/components/ui/select"
import {
  REPORTS_DIR_NAME,
  type BoardReport,
} from "../../lib/board-model/report-types"

export function ReportsPanel({
  reports,
  boardRoot,
}: {
  reports: BoardReport[]
  /**
   * Board root (absolute in live mode, "" for board-relative snapshots), so
   * relative image srcs resolve next to `.reports/report-<date>.md`.
   */
  boardRoot?: string
}) {
  const [selectedDate, setSelectedDate] = React.useState(
    reports[0]?.date ?? null
  )

  const selected =
    reports.find((report) => report.date === selectedDate) ??
    reports[0] ??
    null

  if (!selected) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="font-head text-xl">Reports</CardTitle>
            <CardDescription>
              Local reports from /tkmd-reportme, newest first
            </CardDescription>
          </div>
          <Select
            value={selected.date}
            onValueChange={(next) => {
              if (typeof next === "string") setSelectedDate(next)
            }}
          >
            <SelectTrigger
              id="report-picker"
              className="min-w-[9rem]"
              aria-label="Report date"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reports.map((report) => (
                <SelectItem key={report.id} value={report.date}>
                  {report.date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <MarkdownSourceProvider
          sourcePath={
            boardRoot == null
              ? null
              : [boardRoot, REPORTS_DIR_NAME, `report-${selected.id}.md`]
                  .filter(Boolean)
                  .join("/")
          }
        >
          <MarkdownContent text={selected.markdown} />
        </MarkdownSourceProvider>
      </CardContent>
    </Card>
  )
}
