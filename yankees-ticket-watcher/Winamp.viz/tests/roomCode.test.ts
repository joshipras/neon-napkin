import { describe, expect, it } from "vitest";
import { createRoomCode, isRoomExpired, normalizeRoomCode } from "@/lib/roomCode";

describe("room code logic", () => {
  it("creates short uppercase room codes with expirations", () => {
    const room = createRoomCode(4, 1000, 5000);
    expect(room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(room.expiresAt).toBe(6000);
    expect(isRoomExpired(room, 5999)).toBe(false);
    expect(isRoomExpired(room, 6000)).toBe(true);
  });

  it("normalizes user-entered room codes", () => {
    expect(normalizeRoomCode(" ab-cd! ")).toBe("ABCD");
  });
});
