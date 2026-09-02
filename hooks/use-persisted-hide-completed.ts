"use client"

import { useCallback, useState } from "react"

import { HIDE_COMPLETED_DEFAULT } from "../lib/board-model/constants"
import { writeHideCompletedCookieClient } from "../lib/board-model/hide-completed-cookie"

/**
 * Hide completed state backed by one cookie shared by every board list, so
 * toggling it in one list carries over to the others.
 * Pass `initial` from the server cookie so SSR matches the first paint.
 */
export function usePersistedHideCompleted(
  initial = HIDE_COMPLETED_DEFAULT
): [boolean, (hide: boolean) => void] {
  const [hideCompleted, setHideCompletedState] = useState(initial)

  const setHideCompleted = useCallback((hide: boolean) => {
    writeHideCompletedCookieClient(hide)
    setHideCompletedState(hide)
  }, [])

  return [hideCompleted, setHideCompleted]
}
