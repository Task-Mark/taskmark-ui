/**
 * One colour per person on the People screen, by position (most shipped
 * first). `bg` is the Tailwind fill, `fill` the CSS variable for SVG.
 * Every fill takes black text in light and dark mode.
 */
export type PersonColor = { bg: string; fill: string }

const PALETTE: PersonColor[] = [
  { bg: "bg-chart-1", fill: "var(--chart-1)" },
  { bg: "bg-chart-2", fill: "var(--chart-2)" },
  { bg: "bg-chart-4", fill: "var(--chart-4)" },
  { bg: "bg-chart-3", fill: "var(--chart-3)" },
  { bg: "bg-backlog", fill: "var(--status-backlog)" },
  { bg: "bg-shipped", fill: "var(--status-shipped)" },
]

export const UNASSIGNED_COLOR: PersonColor = {
  bg: "bg-muted",
  fill: "var(--muted-foreground)",
}

export function personColor(index: number): PersonColor {
  return PALETTE[index % PALETTE.length]
}
