import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { isAllowlisted } from "@/lib/allowlist";
import { sendVerificationRequest } from "@/lib/mailer";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "database" },
  providers: [
    Nodemailer({
      // The provider requires a `server` value to construct, but our
      // sendVerificationRequest below never reads it — it opens its own
      // transport from SMTP_* env vars (see lib/mailer.ts).
      // `||`, not `??`: an env var present but left blank (e.g. pasted from
      // .env.example into a host's env UI) is "" — falsy but not nullish —
      // so `??` would silently pass the empty string through.
      server: process.env.SMTP_HOST || "smtp://unused:0",
      from: process.env.SMTP_FROM || "Mind-Space Ledger <no-reply@example.com>",
      sendVerificationRequest,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/verify-request",
  },
  callbacks: {
    // Runs before a verification email is sent, and again on OAuth-style
    // callbacks. Returning false here is the allowlist gate (PRD §9 D8):
    // it blocks both magic-link issuance and sign-in completion for any
    // email not on AUTH_ALLOWLIST.
    async signIn({ user }) {
      return isAllowlisted(user.email);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
