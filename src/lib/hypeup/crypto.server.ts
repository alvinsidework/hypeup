import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { encryptionKey } from "./env.server";

const ALGO = "aes-256-gcm";

function keyBuffer(): Buffer {
  const hex = encryptionKey();
  if (!hex || hex.length !== 64) {
    throw new Error("APP_ENCRYPTION_KEY must be 32 bytes as 64 hex characters");
  }
  return Buffer.from(hex, "hex");
}

/** Format: iv.authTag.ciphertext (hex). */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

export function decryptToken(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(".");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid token cipher");
  }
  const decipher = createDecipheriv(ALGO, keyBuffer(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function newId(): string {
  return crypto.randomUUID();
}

export function randomNonce(): string {
  return randomBytes(24).toString("hex");
}
