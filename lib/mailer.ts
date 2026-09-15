import "server-only";
import nodemailer from "nodemailer";

/**
 * Sends an email. In production this requires SMTP_* env vars (any
 * provider — Resend, Postmark, SES, Gmail SMTP, etc). In local development,
 * when SMTP isn't configured, the content is logged to the console instead
 * so flows (like password reset) can be exercised without a mail provider.
 */
export async function sendMail(params: { to: string; subject: string; text: string; html: string }) {
  const hasSmtp = Boolean(process.env.SMTP_HOST);

  if (!hasSmtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SMTP_HOST is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD (or another mailer) to send email in production.",
      );
    }
    console.log(`\n[dev] Email to ${params.to} — ${params.subject}:\n${params.text}\n`);
    return;
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });

  await transport.sendMail({
    to: params.to,
    from: process.env.SMTP_FROM || "Mind-Space Ledger <no-reply@example.com>",
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}
