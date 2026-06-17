"use client";

import Link from "next/link";

import { ConfidenceDot } from "@/components/TrackedValue";

// Slim sitewide footer — the public-data caveat travels on every route, with the
// confidence legend always one glance away. Site chrome, not a feature section.
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line py-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="max-w-md">
          <Link href="/" className="font-serif text-lg lowercase tracking-tight text-ink">
            kerf
          </Link>
          <p className="mt-2 font-mono text-xs leading-relaxed text-ink/50">
            built from public data — filings, earnings calls, analyst reporting.
            figures estimated / modeled, not disclosed allocation data.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink/55">
            <span className="flex items-center gap-1.5">
              <ConfidenceDot confidence="disclosed" /> disclosed
            </span>
            <span className="flex items-center gap-1.5">
              <ConfidenceDot confidence="estimated" /> estimated
            </span>
            <span className="flex items-center gap-1.5">
              <ConfidenceDot confidence="modeled" /> modeled
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5 font-mono text-xs lowercase text-ink/55">
          <Link href="/" className="transition-colors hover:text-ink">overview</Link>
          <Link href="/network" className="transition-colors hover:text-ink">network</Link>
          <Link href="/case" className="transition-colors hover:text-ink">2021 case</Link>
          <Link href="/brief" className="transition-colors hover:text-ink">brief</Link>
        </nav>
      </div>

      {/* quiet builder credit */}
      <p className="mt-6 font-mono text-[11px] lowercase text-ink/40">
        built by{" "}
        <a
          href="https://github.com/nylaimanii"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 transition-colors hover:text-ink"
        >
          nyla
        </a>
      </p>
    </footer>
  );
}

