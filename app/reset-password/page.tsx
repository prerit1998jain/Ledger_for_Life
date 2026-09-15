import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-danger">This link is missing its email or token.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif-reflect text-2xl mb-1">Set your password</h1>
        <p className="text-sm text-muted mb-6">For {email}. At least 8 characters.</p>
        <ResetPasswordForm email={email} token={token} />
      </div>
    </div>
  );
}
