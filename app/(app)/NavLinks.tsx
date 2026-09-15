"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/entry", label: "Entry" },
  { href: "/log", label: "Log" },
  { href: "/analysis", label: "Analysis" },
  { href: "/beliefs", label: "Beliefs" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={active ? "font-medium text-foreground" : "text-muted hover:text-foreground"}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
