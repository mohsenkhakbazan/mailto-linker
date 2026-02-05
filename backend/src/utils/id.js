import crypto from "crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(buf) {
  // Convert bytes -> base62 string
  // Use BigInt for simplicity
  let x = BigInt("0x" + buf.toString("hex"));
  let out = "";
  while (x > 0n) {
    const r = x % 62n;
    out = BASE62[Number(r)] + out;
    x = x / 62n;
  }
  return out || "0";
}

export function generateId(length = 8) {
  // Generate enough bytes to get ~length chars
  // 8 chars base62 ~ 48 bits; use 8 bytes (64 bits) then trim
  const buf = crypto.randomBytes(8);
  const s = toBase62(buf);
  // pad if needed
  const padded = s.padStart(length, "0");
  return padded.slice(0, length);
}
