"use client"

import { MarkdownSourceProvider } from "./board-assets"
import { MarkdownContent } from "./markdown-content"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@taskmark/components/ui/card"

export function ChangelogPanel({
  markdown,
  sourcePath,
}: {
  markdown: string
  /** CHANGELOG.md path, so relative image srcs resolve next to it. */
  sourcePath?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Changelog</CardTitle>
        <CardDescription>
          Board-root CHANGELOG.md (Keep a Changelog)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MarkdownSourceProvider sourcePath={sourcePath}>
          <MarkdownContent text={markdown} />
        </MarkdownSourceProvider>
      </CardContent>
    </Card>
  )
}
