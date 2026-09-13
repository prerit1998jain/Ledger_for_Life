import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/entry");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif-reflect text-2xl mb-1">Mind-Space Ledger</h1>
        <p className="text-sm text-muted mb-6">
          A private record of your own thinking. Sign in with the email on the allowlist.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
