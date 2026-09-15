import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthCard } from "../AuthCard";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/entry");
  }

  return (
    <AuthCard
      title="Mind-Space Ledger"
      description="A private record of your own thinking. Sign in with the email on the allowlist."
    >
      <LoginForm />
    </AuthCard>
  );
}
