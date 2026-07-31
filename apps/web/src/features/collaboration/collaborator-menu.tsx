import { Users } from "lucide-react";

import { getInitials, type PresenceParticipant } from "./presence";

interface CollaboratorMenuProps {
  participants: readonly PresenceParticipant[];
  role: "owner" | "editor" | "viewer";
}

export function CollaboratorMenu({
  participants,
  role,
}: CollaboratorMenuProps) {
  return (
    <details className="relative hidden sm:block">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-2 border border-line px-2 text-xs text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent">
        <span className="flex -space-x-1" aria-hidden="true">
          {participants.slice(0, 3).map((participant) => (
            <span
              className="grid size-5 place-items-center rounded-full border border-panel text-[9px] font-semibold text-white"
              key={participant.id}
              style={{ backgroundColor: participant.color }}
            >
              {getInitials(participant.name)}
            </span>
          ))}
        </span>
        <Users className="size-3.5" />
        {participants.length} online
      </summary>
      <div className="absolute right-0 top-10 z-30 w-64 border border-line bg-panel p-3 text-xs shadow-lg">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <p className="font-semibold">Online now</p>
          <span className="text-muted">Your role: {role}</span>
        </div>
        <ul className="mt-2 space-y-1">
          {participants.map((participant) => (
            <li className="flex items-center gap-2 py-1.5" key={participant.id}>
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: participant.color }}
              >
                {getInitials(participant.name)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {participant.name}
              </span>
              {participant.isCurrentUser && (
                <span className="text-muted">You</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
