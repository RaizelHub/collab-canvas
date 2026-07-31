export interface PresenceParticipant {
  color: string;
  id: string;
  isCurrentUser: boolean;
  name: string;
}

export interface RemotePresence {
  color: string;
  userId: string;
  userName: string;
}

export interface PresenceChanges {
  joined: PresenceParticipant[];
  left: PresenceParticipant[];
}

export function buildPresenceParticipants(
  currentUser: Omit<PresenceParticipant, "isCurrentUser">,
  remotePresence: readonly RemotePresence[],
): PresenceParticipant[] {
  const participants = new Map<string, PresenceParticipant>();
  participants.set(currentUser.id, { ...currentUser, isCurrentUser: true });

  for (const presence of remotePresence) {
    if (participants.has(presence.userId)) continue;
    participants.set(presence.userId, {
      color: presence.color,
      id: presence.userId,
      isCurrentUser: false,
      name: presence.userName.trim() || "Collaborator",
    });
  }

  return [...participants.values()];
}

export function getPresenceChanges(
  previous: readonly PresenceParticipant[],
  next: readonly PresenceParticipant[],
): PresenceChanges {
  const previousById = new Map(previous.map((person) => [person.id, person]));
  const nextById = new Map(next.map((person) => [person.id, person]));

  return {
    joined: next.filter(
      (person) => !person.isCurrentUser && !previousById.has(person.id),
    ),
    left: previous.filter(
      (person) => !person.isCurrentUser && !nextById.has(person.id),
    ),
  };
}

export function arePresenceParticipantsEqual(
  left: readonly PresenceParticipant[],
  right: readonly PresenceParticipant[],
): boolean {
  return (
    left.length === right.length &&
    left.every((person, index) => {
      const candidate = right[index];
      return (
        candidate?.id === person.id &&
        candidate.name === person.name &&
        candidate.color === person.color &&
        candidate.isCurrentUser === person.isCurrentUser
      );
    })
  );
}

export function describePresenceChanges(changes: PresenceChanges): string {
  if (changes.joined.length > 0) {
    const names = changes.joined.map((person) => person.name).join(", ");
    return `${names} joined the board.`;
  }
  if (changes.left.length > 0) {
    const names = changes.left.map((person) => person.name).join(", ");
    return `${names} left the board.`;
  }
  return "";
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toLocaleUpperCase())
    .join("");
}
