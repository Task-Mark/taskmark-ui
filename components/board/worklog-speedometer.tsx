"use client"

import * as React from "react"
import {
  IconFlameFilled,
  IconMoodAnnoyed,
  IconMoodHappyFilled,
  IconMoodSing,
  IconMoodSmileFilled,
} from "@tabler/icons-react"

import { Gauge } from "../charts/gauge"
import { cn } from "../../lib/utils"
import {
  dailyWorklogHistory,
  dailyWorklogPace,
  worklogPaceIcon,
  type WorklogPaceIcon,
} from "../../lib/board-model/worklog-pace"
import type { WorklogEntry } from "../../lib/board-model/worklog"

const ICONS: Record<
  WorklogPaceIcon,
  React.ComponentType<{
    className?: string
    stroke?: number
    "aria-hidden"?: boolean
  }>
> = {
  sing: IconMoodSing,
  smile: IconMoodSmileFilled,
  happy: IconMoodHappyFilled,
  annoyed: IconMoodAnnoyed,
  flame: IconFlameFilled,
}

/** Traffic-light reading of today's pace against the 30-day peak. */
const ICON_COLOR: Record<WorklogPaceIcon, string> = {
  sing: "text-slate-500",
  smile: "text-sky-500",
  happy: "text-green-500",
  annoyed: "text-yellow-500",
  flame: "text-red-500",
}

const ICON_DISC: Record<WorklogPaceIcon, string> = {
  sing: "bg-slate-100 ring-slate-200",
  smile: "bg-sky-100 ring-sky-200",
  happy: "bg-green-100 ring-green-200",
  annoyed: "bg-yellow-100 ring-yellow-200",
  flame: "bg-red-100 ring-red-200",
}

function PaceGlyph({
  icon,
  bounce,
}: {
  icon: WorklogPaceIcon
  bounce?: boolean
}) {
  const Icon = ICONS[icon]
  return (
    <div
      className={cn(
        "flex size-16 items-center justify-center rounded-full ring-2",
        ICON_DISC[icon],
        bounce && "animate-bounce",
      )}
    >
      <Icon
        aria-hidden
        stroke={2.25}
        className={cn("size-12", ICON_COLOR[icon])}
      />
    </div>
  )
}

export function WorklogSpeedometer({
  entries,
  className,
}: {
  entries: readonly WorklogEntry[]
  className?: string
}) {
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const pace = React.useMemo(
    () => dailyWorklogPace(entries, now),
    [entries, now],
  )
  const history = React.useMemo(
    () => dailyWorklogHistory(entries, now),
    [entries, now],
  )
  const icon = worklogPaceIcon(pace, now)
  const bounce = icon === "happy" || icon === "flame"

  return (
    <div
      aria-label={`Today ${pace.today} work logs, peak ${pace.peak} in the last 30 days`}
      className={cn(
        "pointer-events-none fixed bottom-4 left-4 z-50 w-[18rem]",
        className,
      )}
    >
      <div className="rounded-lg border-2 border-border bg-card/95 p-3 shadow-md">
        <div className="relative">
          <Gauge
            className="h-52 w-full"
            orientation="arc"
            value={pace.fill}
            minWidth={240}
            totalNotches={28}
            spacing={20}
            uniformWidth
            notchCornerRadius={0}
            useGradient
            activeGradient={["#EADFFE", "#C4A1FF"]}
            inactiveFill="#EADFFE"
            inactiveFillOpacity={0.55}
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-1">
            <PaceGlyph bounce={bounce} icon={icon} />
            <span className="mt-1 font-head text-2xl leading-none tabular-nums">
              {pace.today}
            </span>
          </div>
        </div>
        <p className="mt-1 text-center text-xs font-medium text-muted-foreground">
          Work logs today vs 30-day peak ({pace.peak})
        </p>
        <div
          aria-label="Last 10 days"
          className="pointer-events-auto mt-2 flex items-center justify-between gap-0.5"
        >
          {history.map((day) => {
            const DayIcon = ICONS[day.icon]
            return (
              <span
                key={day.day}
                title={`${day.day}: ${day.count} work logs`}
                className={cn(
                  "flex size-6 items-center justify-center rounded-full ring-1",
                  ICON_DISC[day.icon],
                )}
              >
                <DayIcon
                  aria-hidden
                  stroke={2}
                  className={cn("size-4", ICON_COLOR[day.icon])}
                />
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
