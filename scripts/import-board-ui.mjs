#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const front = "/Users/menda0/Projects/taskmark/taskmark-frontend"
const ui = "/Users/menda0/Projects/taskmark/taskmark-ui"

const modelFiles = [
  "constants.ts",
  "types.ts",
  "identity.ts",
  "report-types.ts",
  "epic-types.ts",
  "story-types.ts",
  "item-types.ts",
  "flat-work-item-types.ts",
  "detail-types.ts",
  "timeframe-filters.ts",
  "list-view-mode.ts",
  "list-filters.ts",
  "table-sort.ts",
  "overall-tree.ts",
  "points-calendar.ts",
  "general-epic.ts",
  "project-metrics-shared.ts",
  "pagination.ts",
  "hide-completed-cookie.ts",
  "snapshot-types.ts",
  "snapshot-client.ts",
]

const libFiles = [
  "display-path.ts",
  "format-date.ts",
  "format-compact-number.ts",
  "format-duration.ts",
]

const hookFiles = [
  "use-paginated-rows.ts",
  "use-persisted-hide-completed.ts",
  "use-table-sort.ts",
]

function rewrite(src, kind) {
  let out = src
  out = out.replaceAll("@/lib/taskmark/", "./")
  out = out.replaceAll("@/lib/format-date", "../format-date")
  out = out.replaceAll("@/lib/format-compact-number", "../format-compact-number")
  out = out.replaceAll("@/lib/format-duration", "../format-duration")
  out = out.replaceAll("@/lib/display-path", "../display-path")
  if (kind === "hook") {
    out = out.replaceAll("./constants", "../lib/board-model/constants")
    out = out.replaceAll("./hide-completed-cookie", "../lib/board-model/hide-completed-cookie")
    out = out.replaceAll("./pagination", "../lib/board-model/pagination")
    out = out.replaceAll("./table-sort", "../lib/board-model/table-sort")
  }
  return out
}

function copyRewritten(from, to, kind) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  const src = fs.readFileSync(from, "utf8")
  fs.writeFileSync(to, rewrite(src, kind))
}

for (const file of modelFiles) {
  copyRewritten(
    path.join(front, "lib/taskmark", file),
    path.join(ui, "lib/board-model", file),
    "model",
  )
}

for (const file of libFiles) {
  copyRewritten(
    path.join(front, "lib", file),
    path.join(ui, "lib", file),
    "lib",
  )
}

for (const file of hookFiles) {
  copyRewritten(
    path.join(front, "hooks", file),
    path.join(ui, "hooks", file),
    "hook",
  )
}

// timing fields only (avoid parse-sections)
fs.writeFileSync(
  path.join(ui, "lib/board-model/timing.ts"),
  `export type TimingFields = {
  actualMinutes: number | null
  actualMs: number | null
}
`,
)

const skipBoard = new Set([
  "app-bar.tsx",
  "board-screen.tsx",
  "board-dev-reloader.tsx",
])

const boardDir = path.join(front, "components/board")
for (const name of fs.readdirSync(boardDir)) {
  if (!name.endsWith(".tsx") || skipBoard.has(name)) continue
  const from = path.join(boardDir, name)
  const to = path.join(ui, "components/board", name)
  let src = fs.readFileSync(from, "utf8")
  src = src.replaceAll("@/components/board/", "./")
  src = src.replaceAll("@/hooks/", "../../hooks/")
  src = src.replaceAll("@/lib/taskmark/", "../../lib/board-model/")
  src = src.replaceAll("@/lib/display-path", "../../lib/display-path")
  src = src.replaceAll("@/lib/format-date", "../../lib/format-date")
  src = src.replaceAll("@/lib/format-compact-number", "../../lib/format-compact-number")
  src = src.replaceAll("@/lib/format-duration", "../../lib/format-duration")
  fs.writeFileSync(to, src)
}

console.log("copied board-model, helpers, hooks, and board screens")
