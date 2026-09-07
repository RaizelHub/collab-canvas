import { Eye, EyeOff, Users } from "lucide-react";

import { getInitials, type PresenceParticipant } from "./presence";

interface CollaboratorMenuProps {
  followingUserId?: string | null;
  onToggleFollow?: (participant: PresenceParticipant) => void;
  participants: readonly PresenceParticipant[];
  role: "owner" | "editor" | "viewer";
}

export function CollaboratorMenu({
  followingUserId,
  onToggleFollow,
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
      <div className="absolute right-0 top-10 z-30 w-72 border border-line bg-panel p-3 text-xs shadow-lg">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <p className="font-semibold">Collaborators</p>
          <span className="text-muted">Role: {role}</span>
        </div>
        <ul className="mt-2 space-y-1">
          {participants.map((participant) => {
            const isFollowing = followingUserId === participant.id;
            return (
              <li
                className="flex items-center justify-between gap-2 py-1.5"
                key={participant.id}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: participant.color }}
                  >
                    {getInitials(participant.name)}
                  </span>
                  <span className="min-w-0 truncate font-medium">
                    {participant.name}
                  </span>
                </div>
                <div>
                  {participant.isCurrentUser ? (
                    <span className="text-[11px] text-muted">You</span>
                  ) : (
                    onToggleFollow && (
                      <button
                        className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors ${
                          isFollowing
                            ? "bg-accent text-white"
                            : "border border-line bg-canvas text-muted hover:bg-hover hover:text-ink"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          onToggleFollow(participant);
                        }}
                        type="button"
                      >
                        {isFollowing ? (
                          <>
                            <EyeOff className="size-3" /> Following
                          </>
                        ) : (
                          <>
                            <Eye className="size-3" /> Follow
                          </>
                        )}
                      </button>
                    )
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
