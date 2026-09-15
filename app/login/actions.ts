"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function credentialsSignIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: "Invalid email or password." };
    }
    throw err;
  }
}
