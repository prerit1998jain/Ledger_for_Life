import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif-reflect text-2xl mb-1">Set or reset your password</h1>
        <p className="text-sm text-muted mb-6">
          Enter the allowlisted email and we&apos;ll send a link to set your password — whether
          it&apos;s your first time or you&apos;ve forgotten it.
        </p>
        <ForgotPasswordForm />
        <Link href="/login" className="mt-6 block text-center text-sm text-muted hover:text-foreground">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
