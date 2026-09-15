export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="font-serif-reflect text-2xl mb-1">{title}</h1>
        {description && <p className="text-sm text-muted mb-6">{description}</p>}
        {children}
      </div>
    </div>
  );
}
