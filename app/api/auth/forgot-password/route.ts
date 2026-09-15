import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAllowlisted } from "@/lib/allowlist";
import { createResetToken } from "@/lib/reset-token";
import { sendMail } from "@/lib/mailer";

const bodySchema = z.object({ email: z.string().email() });

/**
 * Doubles as "set your initial password" (no separate signup flow) and
 * "forgot password" — same link, same handling. Always responds the same
 * way regardless of whether the email is allowlisted, so this endpoint
 * can't be used to probe which addresses are allowed in (PRD principle 1).
 */
export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (isAllowlisted(email)) {
    try {
      const token = await createResetToken(email);
      const origin = req.nextUrl.origin;
      const url = `${origin}/reset-password?email=${encodeURIComponent(email)}&token=${token}`;

      await sendMail({
        to: email,
        subject: "Set your Mind-Space Ledger password",
        text: `Set or reset your password:\n\n${url}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
        html: `<p>Set or reset your Mind-Space Ledger password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
      });
    } catch (err) {
      // Logged, not surfaced — see the generic response below.
      console.error("forgot-password: failed to send email", err);
    }
  }

  return NextResponse.json({ ok: true });
}
