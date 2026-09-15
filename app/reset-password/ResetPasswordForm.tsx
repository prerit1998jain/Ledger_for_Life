"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResetPasswordForm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);

        if (password !== confirm) {
          setError("Passwords don't match.");
          return;
        }

        startTransition(async () => {
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, token, password }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setError(body.error ?? "Something went wrong.");
            return;
          }

          router.push("/login");
        });
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">New password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Confirm password</span>
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-md border border-border px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={pending || !password || !confirm}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
