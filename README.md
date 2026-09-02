# @taskmark/components

Source-distributed React components and design tokens shared by Taskmark's
local board, cloud board, and website.

Import primitives from `@taskmark/components/ui/*`, board chrome from
`@taskmark/components/board`, and theme helpers from
`@taskmark/components/theme`. Import `@taskmark/components/theme.css` once in
the consumer's global stylesheet and add the package to Tailwind's sources.

Next.js consumers must include `@taskmark/components` in `transpilePackages`.
