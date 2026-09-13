import "server-only";
import nodemailer from "nodemailer";
import type { NodemailerConfig } from "next-auth/providers/nodemailer";

type SendVerificationRequestParams = Parameters<NodemailerConfig["sendVerificationRequest"]>[0];

/**
 * Sends the magic-link email. In production this requires SMTP_* env vars
 * (any provider — Resend, Postmark, SES, Gmail SMTP, etc). In local
 * development, when SMTP isn't configured, the link is logged to the
 * console instead of emailed so the sign-in flow can be exercised without
 * a mail provider.
 */
export async function sendVerificationRequest({
  identifier: email,
  url,
  provider,
}: SendVerificationRequestParams) {
  const host = new URL(url).host;
  const hasSmtp = Boolean(process.env.SMTP_HOST);

  if (!hasSmtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_HOST is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD (or another mailer) to send magic links in production.",
      );
    }
    console.log(`\n[dev] Magic sign-in link for ${email}:\n${url}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transport.sendMail({
    to: email,
    from: provider.from,
    subject: `Sign in to Mind-Space Ledger`,
    text: `Sign in to Mind-Space Ledger (${host})\n\n${url}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Sign in to <strong>Mind-Space Ledger</strong> (${host}).</p><p><a href="${url}">Click here to sign in</a></p><p>If you did not request this, ignore this email.</p>`,
  });
}
