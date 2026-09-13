export default async function VerifyRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-serif-reflect text-2xl mb-2">Check your email</h1>
        <p className="text-sm text-muted">
          If {email ? <span className="text-foreground">{email}</span> : "that address"} is on the
          allowlist, a sign-in link is on its way.
        </p>
      </div>
    </div>
  );
}
