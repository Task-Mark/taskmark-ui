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

## Request boards

Boards that keep work under `requests/` (and meetings under `meetings/`) get
a request-centred interface from `@taskmark/components/requests`:

- `BoardSidebar` and `RequestShell`: the left navigation and page frame.
- `RequestViewContent`: picks the screen for a view. `work` (requests and
  meetings side by side), `requests`, `request` (brief, tree, log and
  forecast), `roadmap` and `status` (the client view).

They all read one `RequestBoardData` value (`@taskmark/components/board-model`),
which the CLI builds from the board and stores in the snapshot as
`requestBoard`. Forecasts only count work that reached `main` (task `stage:
production`), so a task done on a feature branch or in `quality` never moves a
client date. `parseBoardView` and `boardViewHref` map the `?view=` query to a
screen; the legacy views (`overall`, `workitems`, `worklog`, `changelog`,
`reports`) stay available under "Board files".

## Publish

Releases go to the public npm registry from GitHub Actions on `main`. Set the
repository secret `NPM_TOKEN` to an npm granular token with permission to
publish `@taskmark/components` (`access: public`).

```bash
npm publish --access public
```
