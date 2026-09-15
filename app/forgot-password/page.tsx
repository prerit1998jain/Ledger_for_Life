import Link from "next/link";
import { AuthCard } from "../AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Set or reset your password"
      description="Enter the allowlisted email and we'll send a link to set your password — whether it's your first time or you've forgotten it."
    >
      <ForgotPasswordForm />
      <Link href="/login" className="mt-6 block text-center text-sm text-muted hover:text-foreground">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
