import { AuthCard } from "../AuthCard";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <AuthCard title="Link problem">
        <p className="text-sm text-danger">
          This link is missing its email or token — copy the full link from the email, or
          request a new one from the forgot-password page.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set your password" description={`For ${email}. At least 8 characters.`}>
      <ResetPasswordForm email={email} token={token} />
    </AuthCard>
  );
}
