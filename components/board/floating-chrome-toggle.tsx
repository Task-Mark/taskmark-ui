"use client"

import * as React from "react"
import { BookmarkIcon, BookmarkOffIcon } from "lucide-react"

import { Button } from "../ui/button"
import {
  FLOATING_CHROME_COLLAPSED_DEFAULT,
  FLOATING_CHROME_PULSE_MS,
  readFloatingChromeCollapsed,
  subscribeFloatingChromeCollapsed,
  toggleFloatingChromeCollapsed,
} from "../../lib/board-model/floating-chrome"

const FloatingChromeServerSnapshotContext = React.createContext<
  boolean | null
>(null)

/** Pass the Cloud cookie so SSR matches the first client paint. */
export function FloatingChromeServerSnapshot({
  collapsed,
  children,
}: {
  collapsed: boolean
  children: React.ReactNode
}) {
  return (
    <FloatingChromeServerSnapshotContext.Provider value={collapsed}>
      {children}
    </FloatingChromeServerSnapshotContext.Provider>
  )
}

export function useFloatingChromeCollapsed(): boolean {
  const serverSnapshot = React.useContext(FloatingChromeServerSnapshotContext)
  const getServerSnapshot = React.useCallback(
    () => serverSnapshot ?? FLOATING_CHROME_COLLAPSED_DEFAULT,
    [serverSnapshot],
  )
  return React.useSyncExternalStore(
    subscribeFloatingChromeCollapsed,
    readFloatingChromeCollapsed,
    getServerSnapshot,
  )
}

/** Opens a collapsed sheet, then closes it after `FLOATING_CHROME_PULSE_MS`. */
export function useFloatingChromePulse(): {
  open: boolean
  pulse: () => void
} {
  const collapsed = useFloatingChromeCollapsed()
  const [open, setOpen] = React.useState(false)
  const timer = React.useRef<number>(0)

  const clear = React.useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = 0
    setOpen(false)
  }, [])

  React.useEffect(() => {
    if (!collapsed) clear()
  }, [clear, collapsed])

  React.useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const pulse = React.useCallback(() => {
    if (!collapsed) return
    setOpen(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = 0
      setOpen(false)
    }, FLOATING_CHROME_PULSE_MS)
  }, [collapsed])

  return { open: collapsed && open, pulse }
}

export function FloatingChromeToggle() {
  const collapsed = useFloatingChromeCollapsed()
  const label = collapsed
    ? "Show worklog messages and count card"
    : "Hide worklog messages and count card"

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      aria-pressed={!collapsed}
      title={label}
      onClick={() => toggleFloatingChromeCollapsed()}
    >
      {collapsed ? (
        <BookmarkOffIcon className="size-4" />
      ) : (
        <BookmarkIcon className="size-4 fill-current" />
      )}
    </Button>
  )
}
