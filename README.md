# @taskmark/components

Source-distributed React components and design tokens shared by Taskmark's
local board, cloud board, and website.

The GitHub repository [`Task-Mark/taskmark-ui`](https://github.com/Task-Mark/taskmark-ui)
is public. Install the published package:

```bash
npm install @taskmark/components
```

Sibling Taskmark apps in this workspace may keep `"@taskmark/components": "file:../taskmark-ui"`
while developing against unreleased sources.

Import primitives from `@taskmark/components/ui/*`, board chrome from
`@taskmark/components/board`, and theme helpers from
`@taskmark/components/theme`. Import `@taskmark/components/theme.css` once in
the consumer's global stylesheet and add the package to Tailwind's sources.

Next.js consumers must include `@taskmark/components` in `transpilePackages`.

## Publish

Releases go to the public npm registry from GitHub Actions on `main`. Set the
repository secret `NPM_TOKEN` to an npm granular token with permission to
publish `@taskmark/components` (`access: public`).

```bash
npm publish --access public
```
