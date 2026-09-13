"use client";

import { useState, useTransition } from "react";
import { requestSignIn } from "./actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() => requestSignIn(email));
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-md border border-border px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !email}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {pending ? "Sending link…" : "Send sign-in link"}
      </button>
    </form>
  );
}
