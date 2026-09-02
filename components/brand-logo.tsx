import { cn } from "../lib/utils"

export type BrandLogoProps = {
  className?: string
  /** Accessible name; empty string when adjacent text already names the brand. */
  alt?: string
  width?: number
  height?: number
}

/**
 * Taskmark mark: `tm_light` on light surfaces, `tm_dark` when `.dark`.
 * Consumers must serve both files from their own `public/` root.
 */
export function BrandLogo({
  className,
  alt = "Taskmark",
  width = 40,
  height = 45,
}: BrandLogoProps) {
  return (
    <>
      <img
        src="/tm_light.png"
        alt={alt}
        width={width}
        height={height}
        className={cn("dark:hidden", className)}
      />
      <img
        src="/tm_dark.png"
        alt=""
        aria-hidden
        width={width}
        height={height}
        className={cn("hidden dark:block", className)}
      />
    </>
  )
}
