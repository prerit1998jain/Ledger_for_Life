/**
 * MVP sign-in gate (PRD §9, D8): only allowlisted emails may sign in.
 * Removing this check later is the entire "flip to multi-user" for auth
 * (PRD §10) — no schema change needed.
 */
export function isAllowlisted(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.AUTH_ALLOWLIST ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return false;
  return allowed.includes(email.trim().toLowerCase());
}
