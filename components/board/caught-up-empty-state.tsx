import { IconMoodCheck } from "@tabler/icons-react"

import { cn } from "../../lib/utils"
import type { ListEmptyKind } from "../../lib/board-model/list-filters"

export function CaughtUpEmptyState({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-2 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 ring-2 ring-green-200 dark:bg-green-950 dark:text-green-400 dark:ring-green-800">
        <IconMoodCheck aria-hidden stroke={1.75} className="size-8" />
      </span>
      <p className="font-head text-lg tracking-tight">You&apos;re all caught up</p>
      <p className="text-sm text-muted-foreground">
        There are no remaining tasks to do.
      </p>
    </div>
  )
}

export function BoardListEmptyState({
  kind,
  sourceMessage,
  filteredMessage,
}: {
  kind: ListEmptyKind
  sourceMessage: string
  filteredMessage: string
}) {
  if (kind === "caught-up") return <CaughtUpEmptyState />
  return (
    <p className="text-sm text-muted-foreground">
      {kind === "filtered" ? filteredMessage : sourceMessage}
    </p>
  )
}
