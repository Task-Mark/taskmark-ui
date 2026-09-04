"use client"

import { Avatar, AvatarFallback } from "@taskmark/components/ui/avatar"
import { MessageAvatar } from "@taskmark/components/ui/message"
import {
  deriveInitials,
  identityBackgroundColor,
} from "../../lib/board-model/identity"

export function ActorAvatar({ actor }: { actor: string }) {
  const initials = deriveInitials(actor)
  const color = identityBackgroundColor({
    name: actor,
    email: "",
    initials,
  })
  return (
    <MessageAvatar className="self-start translate-y-0 group-has-data-[slot=message-footer]/message:translate-y-0">
      <Avatar size="lg" aria-hidden="true">
        <AvatarFallback
          className="font-semibold tracking-wide text-white"
          style={{ backgroundColor: color }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    </MessageAvatar>
  )
}
