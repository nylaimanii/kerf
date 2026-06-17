"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "overview" },
  { href: "/network", label: "network" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line py-5">
      <div className="flex items-baseline gap-6">
        <Link
          href="/"
          className="font-serif text-2xl lowercase tracking-tight text-ink"
        >
          kerf
        </Link>
        <nav className="flex gap-4 font-sans text-sm lowercase">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "border-b border-green pb-0.5 text-ink"
                    : "pb-0.5 text-ink/45 transition-colors hover:text-ink"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <p className="hidden font-mono text-xs lowercase text-ink/45 sm:block">
        the gap between supply and demand, mapped.
      </p>
    </header>
  );
}
