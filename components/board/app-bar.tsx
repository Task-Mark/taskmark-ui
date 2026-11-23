"use client"

import type * as React from "react"

import { BrandBlock } from "./brand-block"
import { ThemeToggle } from "../theme-toggle"
import { FloatingChromeToggle } from "./floating-chrome-toggle"

export type AppBarProps = {
  title?: string
  tagline?: string
  /** Controls rendered between the brand block and the theme toggle. */
  children?: React.ReactNode
  /**
   * Replaces every control on mobile, leaving only the brand block beside it.
   * Without it the regular controls stay visible at every width.
   */
  mobileMenu?: React.ReactNode
  /** Bookmark control that shows or hides the floating worklog chrome. */
  floatingChromeToggle?: boolean
}

export function AppBar({
  title = "Taskmark",
  tagline = "Product memory for agent work",
  children,
  mobileMenu,
  floatingChromeToggle = false,
}: AppBarProps) {
  const chromeToggle = floatingChromeToggle ? <FloatingChromeToggle /> : null
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-card/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 pt-3.5 pb-4">
        <BrandBlock title={title} tagline={tagline} className="flex-1" />

        {mobileMenu ? (
          <>
            <div className="hidden items-center gap-3 md:flex">
              {children}
              {chromeToggle}
              <ThemeToggle />
            </div>
            <div className="md:hidden">{mobileMenu}</div>
          </>
        ) : (
          <>
            {children}
            {chromeToggle}
            <ThemeToggle />
          </>
        )}
      </div>
    </header>
  )
}
