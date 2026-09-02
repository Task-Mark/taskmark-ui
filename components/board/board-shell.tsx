import type * as React from "react"

import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Progress } from "../ui/progress"

export type BoardMetric = {
  label: string
  value: string | number
}

export type BoardWorkItem = {
  id: string
  title: string
  type: "epic" | "story" | "task" | "bug"
  status: "planned" | "ready" | "done" | "blocked" | string
  points?: number
  progress?: number
  parent?: string
  tags?: string[]
}

export type BoardShellProps = {
  title: string
  description?: string
  metrics?: BoardMetric[]
  items?: BoardWorkItem[]
  toolbar?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

const typeTone: Record<BoardWorkItem["type"], string> = {
  epic: "bg-primary",
  story: "bg-chart-3",
  task: "bg-chart-4",
  bug: "bg-destructive text-destructive-foreground",
}

export function WorkItemSurface({ item }: { item: BoardWorkItem }) {
  return (
    <li className="grid gap-3 border-b-2 border-border px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge className={cn("uppercase", typeTone[item.type])}>
            {item.type}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {item.id}
          </span>
          <Badge variant="outline">{item.status}</Badge>
        </div>
        <p className="font-head text-base tracking-tight">{item.title}</p>
        {item.parent ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {item.parent}
          </p>
        ) : null}
        {item.progress !== undefined ? (
          <Progress
            className="mt-3 h-2 max-w-md"
            value={item.progress}
            aria-label={`${item.title} progress`}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {item.tags?.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
        {item.points !== undefined ? (
          <span className="min-w-12 rounded border-2 border-border bg-muted px-2 py-1 text-center text-xs font-medium shadow-xs">
            {item.points} pt
          </span>
        ) : null}
      </div>
    </li>
  )
}

export function BoardShell({
  title,
  description,
  metrics = [],
  items = [],
  toolbar,
  children,
  className,
}: BoardShellProps) {
  return (
    <main className={cn("tm-surface min-h-[calc(100vh-74px)]", className)}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Board
            </p>
            <h1 className="font-head text-3xl tracking-tight sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {toolbar}
        </div>

        {metrics.length > 0 ? (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-2 border-border bg-card p-3 shadow-sm"
              >
                <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                <dd className="mt-1 font-head text-2xl">{metric.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children ?? (
          <Card className="overflow-hidden p-0">
            <CardHeader className="border-b-2 border-border">
              <CardTitle>Work items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul>
                {items.map((item) => (
                  <WorkItemSurface key={item.id} item={item} />
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
