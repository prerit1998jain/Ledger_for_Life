import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowlisted } from "@/lib/allowlist";
import { consumeResetToken } from "@/lib/reset-token";
import { hashPassword } from "@/lib/password";
import { db } from "@/db";
import { users } from "@/db/schema";

const bodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!isAllowlisted(email)) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  const valid = await consumeResetToken(email, parsed.data.token);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db
    .insert(users)
    .values({ email, passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash } });

  return NextResponse.json({ ok: true });
}
