import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

const NAV = [
  { href: "/entry", label: "Entry" },
  { href: "/log", label: "Log" },
  { href: "/analysis", label: "Analysis" },
  { href: "/beliefs", label: "Beliefs" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/entry" className="font-serif-reflect text-lg">
            Mind-Space Ledger
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted hover:text-foreground">
                {item.label}
              </Link>
            ))}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button type="submit" className="text-muted hover:text-foreground">
                Sign out
              </button>
            </form>
          </nav>
        </div>
        {session?.user?.email && (
          <div className="mx-auto max-w-3xl px-6 pb-2 text-xs text-muted">{session.user.email}</div>
        )}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
