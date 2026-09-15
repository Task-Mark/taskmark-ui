import {
  FLOATING_CHROME_COLLAPSED_DEFAULT,
  FLOATING_CHROME_COOKIE,
  FLOATING_CHROME_COOKIE_MAX_AGE,
} from "./constants"

export const FLOATING_CHROME_EVENT = "taskmark-floating-chrome"
/** How long a collapsed sheet stays open after a new worklog or summary. */
export const FLOATING_CHROME_PULSE_MS = 10_000

export {
  FLOATING_CHROME_COLLAPSED_DEFAULT,
  FLOATING_CHROME_COOKIE,
  FLOATING_CHROME_COOKIE_MAX_AGE,
}

/**
 * Missing or unrecognized values stay collapsed. Only an explicit opt-out
 * (`0` / `false`) expands the floating messages.
 */
export function parseFloatingChromeCollapsedCookie(
  value: string | null | undefined,
): boolean {
  if (value === "0" || value === "false") return false
  if (value === "1" || value === "true") return true
  return FLOATING_CHROME_COLLAPSED_DEFAULT
}

export function readFloatingChromeCollapsed(): boolean {
  if (typeof document === "undefined") return FLOATING_CHROME_COLLAPSED_DEFAULT
  const escaped = FLOATING_CHROME_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return parseFloatingChromeCollapsedCookie(
    match?.[1] ? decodeURIComponent(match[1]) : undefined,
  )
}

export function subscribeFloatingChromeCollapsed(onChange: () => void): () => void {
  window.addEventListener(FLOATING_CHROME_EVENT, onChange)
  return () => window.removeEventListener(FLOATING_CHROME_EVENT, onChange)
}

export function writeFloatingChromeCollapsed(value: boolean) {
  if (typeof document !== "undefined") {
    const secure = window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${FLOATING_CHROME_COOKIE}=${value ? "1" : "0"}; path=/; max-age=${FLOATING_CHROME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FLOATING_CHROME_EVENT))
  }
}

export function toggleFloatingChromeCollapsed() {
  writeFloatingChromeCollapsed(!readFloatingChromeCollapsed())
}
