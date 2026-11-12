"use client"

import { createContext, useCallback, useContext, type ReactNode } from "react"

import {
  boardAssetUrl,
  resolveBoardAssetPath,
  type BoardAssetMode,
} from "../../lib/board-model/board-assets"

const BoardAssetModeContext = createContext<BoardAssetMode | null>(null)
const MarkdownSourceContext = createContext<string | null>(null)

/**
 * How relative markdown images are served: `live` streams them through the
 * `/api/board-asset` route, `static` points at the copies a static build
 * writes under `/board-assets/`. Without a provider, srcs are left untouched.
 */
export function BoardAssetsProvider({
  mode,
  children,
}: {
  mode: BoardAssetMode
  children: ReactNode
}) {
  return (
    <BoardAssetModeContext.Provider value={mode}>
      {children}
    </BoardAssetModeContext.Provider>
  )
}

/** The markdown file whose folder relative image srcs resolve against. */
export function MarkdownSourceProvider({
  sourcePath,
  children,
}: {
  sourcePath: string | null | undefined
  children: ReactNode
}) {
  return (
    <MarkdownSourceContext.Provider value={sourcePath || null}>
      {children}
    </MarkdownSourceContext.Provider>
  )
}

/** Map a markdown image src to the URL the board serves it from. */
export function useBoardAssetSrc(): (src: string) => string {
  const mode = useContext(BoardAssetModeContext)
  const sourcePath = useContext(MarkdownSourceContext)
  return useCallback(
    (src: string) => {
      if (!mode || !sourcePath) return src
      const resolved = resolveBoardAssetPath(sourcePath, src)
      return resolved ? boardAssetUrl(mode, resolved) : src
    },
    [mode, sourcePath]
  )
}
