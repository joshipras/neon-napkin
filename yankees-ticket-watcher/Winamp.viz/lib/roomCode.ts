const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_TTL_MS = 20 * 60 * 1000;

export interface RoomInfo {
  code: string;
  createdAt: number;
  expiresAt: number;
}

export function createRoomCode(length = 4, now = Date.now(), ttlMs = DEFAULT_TTL_MS): RoomInfo {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  let code = "";
  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return {
    code,
    createdAt: now,
    expiresAt: now + ttlMs
  };
}

export function normalizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export function isRoomExpired(room: Pick<RoomInfo, "expiresAt">, now = Date.now()) {
  return now >= room.expiresAt;
}
