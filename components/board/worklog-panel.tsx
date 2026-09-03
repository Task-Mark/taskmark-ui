import {
  Avatar,
  AvatarFallback,
} from "@taskmark/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@taskmark/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@taskmark/components/ui/table"
import { formatTaskmarkDateTime } from "../../lib/format-date"
import {
  deriveInitials,
  identityBackgroundColor,
} from "../../lib/board-model/identity"
import type { WorklogEntry } from "../../lib/board-model/worklog"

function Actor({ name }: { name: string }) {
  const actor = name.trim() || "Unknown"
  const initials = deriveInitials(actor)
  const backgroundColor = identityBackgroundColor({
    name: actor,
    email: "",
    initials,
  })
  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback
          className="font-semibold tracking-wide text-white !text-[7px]"
          style={{ backgroundColor }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <span>{actor}</span>
    </div>
  )
}

export function WorklogPanel({ entries }: { entries: readonly WorklogEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-head text-xl">Worklog</CardTitle>
        <CardDescription>
          Every task and bug work session, newest first
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No task or bug worklog entries yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Source item</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Ended</TableHead>
                <TableHead className="min-w-64">Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.key}>
                  <TableCell>
                    <Actor name={entry.actor} />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.itemTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.itemId} · {entry.itemType}
                    </div>
                  </TableCell>
                  <TableCell>{formatTaskmarkDateTime(entry.started)}</TableCell>
                  <TableCell>{formatTaskmarkDateTime(entry.ended)}</TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.summary || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
