/**
 * Board image assets referenced from markdown with relative paths
 * (`![mockup](./mockup.png)` inside an epic/story/task file).
 *
 * Pure helpers shared by the markdown renderer (browser), the live
 * `/api/board-asset` route, and the static build copy step.
 */

/** Image extensions the board may serve, mapped to their media type. */
export const BOARD_IMAGE_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
}

/** Live mode: route handler that streams a file from the resolved board. */
export const BOARD_ASSET_API_PATH = "/api/board-asset"

/** Static mode: folder under the export root holding copied board images. */
export const BOARD_ASSET_STATIC_DIR = "board-assets"

export type BoardAssetMode = "live" | "static"

/** Lowercase extension including the dot (`.png`), or "" when there is none. */
export function assetExtension(assetPath: string): string {
  const name = assetPath.slice(assetPath.lastIndexOf("/") + 1)
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(dot).toLowerCase() : ""
}

export function boardImageType(assetPath: string): string | null {
  return BOARD_IMAGE_TYPES[assetExtension(assetPath)] ?? null
}

/**
 * True for a src that points at a file next to the markdown: no scheme
 * (`https:`, `data:`, `C:` is handled by the caller's absolute path), no
 * protocol-relative `//`, no site-absolute `/`, no fragment-only `#`.
 */
export function isRelativeAssetSrc(src: string): boolean {
  const value = src.trim()
  if (!value || value.startsWith("#") || value.startsWith("/")) return false
  if (value.startsWith("\\")) return false
  return !/^[a-z][a-z0-9+.-]*:/i.test(value)
}

function toSlashes(value: string): string {
  return value.replaceAll("\\", "/")
}

/**
 * Collapse `.` and `..` segments. Returns null when a relative path climbs
 * above its root, or an absolute path above `/` (or the drive).
 */
function normalizeSlashPath(value: string): string | null {
  const absolute = value.startsWith("/")
  const parts = value.split("/")
  const out: string[] = []
  for (const part of parts) {
    if (part === "" || part === ".") continue
    if (part === "..") {
      const last = out[out.length - 1]
      if (out.length === 0 || (out.length === 1 && /^[a-z]:$/i.test(last!))) {
        return null
      }
      out.pop()
      continue
    }
    out.push(part)
  }
  if (out.length === 0) return null
  return (absolute ? "/" : "") + out.join("/")
}

/**
 * Resolve a relative markdown image src against the markdown file it came
 * from. `sourcePath` is absolute in live mode and board-relative in static
 * snapshots; the result keeps that form, always with `/` separators.
 * Returns null for non-relative srcs, non-image files, or paths that escape.
 */
export function resolveBoardAssetPath(
  sourcePath: string,
  src: string
): string | null {
  if (!sourcePath || !isRelativeAssetSrc(src)) return null
  let target = src.trim()
  // Markdown allows `<path with spaces.png>`; react-markdown already strips
  // the brackets, but tolerate them for raw definitions in the build scan.
  if (target.startsWith("<") && target.endsWith(">")) {
    target = target.slice(1, -1)
  }
  target = target.split(/[?#]/, 1)[0] ?? ""
  try {
    target = decodeURI(target)
  } catch {
    return null
  }
  if (!target) return null

  const source = toSlashes(sourcePath)
  const slash = source.lastIndexOf("/")
  const dir = slash >= 0 ? source.slice(0, slash) : ""
  const joined = dir ? `${dir}/${toSlashes(target)}` : toSlashes(target)
  const resolved = normalizeSlashPath(joined)
  if (!resolved || !boardImageType(resolved)) return null
  return resolved
}

/** Browser URL that serves a resolved board asset in the given mode. */
export function boardAssetUrl(mode: BoardAssetMode, assetPath: string): string {
  if (mode === "live") {
    return `${BOARD_ASSET_API_PATH}?path=${encodeURIComponent(assetPath)}`
  }
  const encoded = assetPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/")
  return `/${BOARD_ASSET_STATIC_DIR}/${encoded}`
}

/**
 * Image srcs written in markdown: inline `![alt](src "title")` and reference
 * definitions `[id]: src`. Raw HTML `<img>` is not rendered by the board, so
 * it is not collected.
 */
export function collectMarkdownImageSrcs(markdown: string): string[] {
  const out = new Set<string>()
  const inline = /!\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)/g
  for (const match of markdown.matchAll(inline)) {
    if (match[1]) out.add(match[1])
  }
  const definitions = /^[ \t]{0,3}\[[^\]]+\]:[ \t]*(<[^>]+>|\S+)/gm
  for (const match of markdown.matchAll(definitions)) {
    if (match[1]) out.add(match[1])
  }
  return [...out]
}
