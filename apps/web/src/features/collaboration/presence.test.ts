import { describe, expect, it } from "vitest";

import {
  arePresenceParticipantsEqual,
  buildPresenceParticipants,
  describePresenceChanges,
  getInitials,
  getPresenceChanges,
} from "./presence";

const currentUser = { color: "#2563eb", id: "user:owner", name: "Ari Kim" };

describe("presence participants", () => {
  it("includes the current user and deduplicates multiple remote sessions", () => {
    expect(
      buildPresenceParticipants(currentUser, [
        { color: "#ef4444", userId: "user:sam", userName: "Sam Lee" },
        { color: "#ef4444", userId: "user:sam", userName: "Sam Lee" },
      ]),
    ).toEqual([
      { ...currentUser, isCurrentUser: true },
      {
        color: "#ef4444",
        id: "user:sam",
        isCurrentUser: false,
        name: "Sam Lee",
      },
    ]);
  });

  it("reports remote joins and leaves without announcing the current user", () => {
    const initial = buildPresenceParticipants(currentUser, []);
    const withSam = buildPresenceParticipants(currentUser, [
      { color: "#ef4444", userId: "user:sam", userName: "Sam Lee" },
    ]);

    expect(describePresenceChanges(getPresenceChanges(initial, withSam))).toBe(
      "Sam Lee joined the board.",
    );
    expect(describePresenceChanges(getPresenceChanges(withSam, initial))).toBe(
      "Sam Lee left the board.",
    );
  });

  it("creates compact initials", () => {
    expect(getInitials("Ari Kim")).toBe("AK");
    expect(getInitials("Prince")).toBe("P");
    expect(getInitials("  ")).toBe("?");
  });

  it("detects whether a presence snapshot materially changed", () => {
    const first = buildPresenceParticipants(currentUser, []);
    const equivalent = buildPresenceParticipants(currentUser, []);
    const withCollaborator = buildPresenceParticipants(currentUser, [
      { color: "#ef4444", userId: "user:sam", userName: "Sam Lee" },
    ]);

    expect(arePresenceParticipantsEqual(first, equivalent)).toBe(true);
    expect(arePresenceParticipantsEqual(first, withCollaborator)).toBe(false);
  });
});
