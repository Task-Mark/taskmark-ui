import type { WorkItemDetail, WorkLogRow } from "./detail-types"

export type WorklogEntry = WorkLogRow & {
  key: string
  itemId: string
  itemTitle: string
  itemType: "task" | "bug"
  filePath: string
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function compareNewest(a: string, b: string): number {
  const left = timestamp(a)
  const right = timestamp(b)
  if (left === right) return 0
  return right > left ? 1 : -1
}

/** Flatten leaf-owned work logs without including derived epic/story rollups. */
export function flattenWorklogEntries(
  detailsByPath: Record<string, WorkItemDetail>
): WorklogEntry[] {
  const entries: WorklogEntry[] = []

  for (const [path, detail] of Object.entries(detailsByPath)) {
    if (detail.type !== "task" && detail.type !== "bug") continue

    detail.workLog.forEach((row, index) => {
      entries.push({
        ...row,
        key: `${detail.id}:${row.session || index}:${row.started}:${index}`,
        itemId: detail.id,
        itemTitle: detail.title,
        itemType: detail.type,
        filePath: detail.filePath || path,
      })
    })
  }

  return entries.sort((a, b) => {
    const byStart = compareNewest(a.started, b.started)
    if (byStart !== 0) return byStart
    const byEnd = compareNewest(a.ended, b.ended)
    if (byEnd !== 0) return byEnd
    return a.key.localeCompare(b.key)
  })
}
