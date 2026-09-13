"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export async function requestSignIn(email: string): Promise<void> {
  try {
    await signIn("nodemailer", { email, redirect: false });
  } catch {
    // Deliberately generic: whether the allowlist rejected this email or the
    // provider genuinely failed, we don't want to reveal which emails are
    // allowed to sign in (PRD principle 1, private-first).
  }
  redirect(`/login/verify-request?email=${encodeURIComponent(email)}`);
}
