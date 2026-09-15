import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { verificationTokens } from "@/db/schema";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Issues a password-reset (or first-time set-password) token for `email`.
 * Only the hash is stored — the raw token exists only in the emailed link.
 * Returns the raw token to embed in that link.
 */
export async function createResetToken(email: string): Promise<string> {
  const raw = randomBytes(32).toString("hex");

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashToken(raw),
    expires: new Date(Date.now() + TOKEN_TTL_MS),
  });

  return raw;
}

/**
 * Validates and single-use-consumes a reset token. Returns true if it was
 * valid (matching, unexpired) for `email` — the token is deleted either way
 * once looked up, so a stale/expired one can't be retried.
 */
export async function consumeResetToken(email: string, raw: string): Promise<boolean> {
  const hashed = hashToken(raw);

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, hashed)));

  if (!row) return false;

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email), eq(verificationTokens.token, hashed)));

  return row.expires.getTime() > Date.now();
}

/** Housekeeping: drop any expired tokens. Cheap to call opportunistically. */
export async function pruneExpiredTokens(): Promise<void> {
  await db.delete(verificationTokens).where(lt(verificationTokens.expires, new Date()));
}
