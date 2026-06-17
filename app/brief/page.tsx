"use client";

// ─────────────────────────────────────────────────────────────────────────────
// /brief — a print-optimized, shareable risk brief.
//
// Path (b): no OAuth, no secrets — a clean print route the user saves as PDF.
// Reflects the CURRENT store state (baseline vs active scenario). Carries ONLY
// computed/engine figures + reported case facts — no new numbers — and prints
// its own provenance footer so the honesty caveats travel with the document.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import {
  selectActiveCascade,
  selectBaselineOperatorConcentration,
  selectOperatorConcentration,
  selectSPOFs,
  useKerfStore,
} from "@/lib/store";
import { CascadeReadout } from "@/components/CascadeReadout";
import { ConfidenceDot, CONFIDENCE_META } from "@/components/TrackedValue";
import type { Confidence } from "@/lib/engine";

const num = (n: number, d = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits: d });

export default function BriefPage() {
  const activeScenario = useKerfStore((s) => s.activeScenario);
  const conc = useKerfStore(selectOperatorConcentration);
  const baseConc = useKerfStore(selectBaselineOperatorConcentration);
  const spofs = useKerfStore(selectSPOFs);
  const cascade = useKerfStore(selectActiveCascade);
  const lastExplanation = useKerfStore((s) => s.lastExplanation);

  // date is client-only (avoids hydration mismatch)
  const [date, setDate] = useState("");
  useEffect(() => setDate(new Date().toISOString().slice(0, 10)), []);

  const contextKey = activeScenario
    ? `cascade:${activeScenario.id}`
    : "concentration:baseline";
  const narrative =
    lastExplanation && lastExplanation.contextKey === contextKey
      ? lastExplanation
      : null;

  const operatorRows = Object.entries(conc.byOperator).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-bone">
      {/* toolbar — screen only */}
      <div className="no-print mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href={activeScenario ? "/network" : "/"}
          className="inline-flex items-center gap-2 font-mono text-xs text-ink/60 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" strokeWidth={1.75} /> back
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-mono text-xs text-bone transition-opacity hover:opacity-90"
        >
          <Printer className="size-3.5" strokeWidth={1.75} /> save as pdf
        </button>
      </div>

      {/* the document */}
      <article className="brief print-exact mx-auto w-full max-w-3xl space-y-7 px-5 pb-20 sm:px-8">
        {/* header */}
        <header className="border-b border-line pb-5">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="font-serif text-3xl lowercase tracking-tight text-ink">
              kerf risk brief
            </h1>
            <span className="font-mono text-xs text-ink/50">{date}</span>
          </div>
          <p className="mt-2 font-mono text-sm text-ink/70">
            {activeScenario ? activeScenario.label : "baseline assessment"}
            {" · "}
            advanced packaging
          </p>
        </header>

        {/* headline */}
        <section className="break-inside-avoid">
          <p className="font-sans text-xs lowercase tracking-[0.2em] text-ink/50">
            {activeScenario ? "concentration · before → after" : "operator concentration"}
          </p>
          {activeScenario ? (
            <p className="mt-2 font-serif text-4xl text-ink">
              {num(baseConc.hhi)}{" "}
              <span className="text-2xl text-ink/40">
                {conc.hhi > baseConc.hhi + 0.5 ? "↑" : conc.hhi < baseConc.hhi - 0.5 ? "↓" : "→"}
              </span>{" "}
              {num(conc.hhi)}
            </p>
          ) : (
            <p className="mt-2 flex items-baseline gap-3">
              <span className="font-serif text-5xl text-ink">{num(conc.hhi)}</span>
              <span className="rounded-full border border-rose/60 bg-rose/10 px-3 py-1 font-sans text-xs lowercase text-rose">
                {conc.label}
              </span>
            </p>
          )}
          <p className="mt-2 inline-flex items-center gap-2 font-mono text-xs text-ink/55">
            <ConfidenceDot confidence={conc.weakestInput} />
            rests on {conc.weakestInput} data
          </p>
        </section>

        {/* concentration breakdown */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 font-serif text-lg lowercase text-ink">
            capacity share by operator
          </h2>
          <ul className="space-y-1">
            {operatorRows.map(([op, share]) => (
              <li key={op} className="flex justify-between gap-3 font-mono text-sm">
                <span className="text-ink/70">{op}</span>
                <span className="flex items-center gap-1.5 text-ink">
                  {share.toFixed(1)}%
                  <ConfidenceDot confidence={conc.weakestInput} />
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[11px] text-ink/40">
            shares shown to 1 decimal; HHI is computed from unrounded shares.
          </p>
        </section>

        {/* SPOFs */}
        <section className="break-inside-avoid">
          <h2 className="mb-2 font-serif text-lg lowercase text-ink">
            single points of failure ({spofs.length})
          </h2>
          {spofs.length === 0 ? (
            <p className="font-mono text-sm text-ink/45">none flagged</p>
          ) : (
            <ul className="space-y-2">
              {spofs.map((s) => (
                <li key={s.chipId} className="border-l-2 border-rose/50 pl-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-sans text-sm font-medium text-ink">
                      {s.chipName}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono text-xs text-rose">
                      {Math.round(Math.max(s.topCountryShare, s.topOperatorShare) * 100)}%
                      <ConfidenceDot confidence={s.exposure.weakestInput} />
                    </span>
                  </div>
                  {s.reasons.map((r) => (
                    <p key={r} className="font-sans text-xs text-ink/55">
                      {r}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* cascade (scenario only) */}
        {cascade && (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-serif text-lg lowercase text-ink">
              modeled cascade impact
            </h2>
            <CascadeReadout
              cascade={cascade}
              baselineHhi={baseConc.hhi}
              scenarioHhi={conc.hhi}
            />
          </section>
        )}

        {/* AI narrative (if generated for this exact state) */}
        {narrative && (
          <section className="break-inside-avoid rounded-lg border border-green/30 bg-green/[0.04] p-4">
            <p className="mb-2 font-sans text-xs lowercase tracking-[0.15em] text-green">
              ai explanation
            </p>
            <p className="font-sans text-sm leading-relaxed text-ink/85">
              {narrative.text}
            </p>
            <p className="mt-3 border-t border-green/15 pt-2 font-mono text-[11px] leading-snug text-ink/45">
              narrative generated by AI from the figures above — the numbers are
              computed deterministically; the words are not.
            </p>
          </section>
        )}

        {/* provenance footer — travels with the document */}
        <footer className="break-inside-avoid border-t border-line pt-5">
          <p className="font-sans text-xs lowercase tracking-[0.2em] text-green">
            provenance
          </p>
          <p className="mt-2 max-w-2xl font-sans text-xs leading-relaxed text-ink/65">
            kerf is built entirely from public information — earnings calls,
            filings, trade press, and analyst coverage. It is{" "}
            <span className="text-ink">not real allocation data</span>: no company
            discloses plant-level capacity or customer shares. Figures are
            estimated or modeled, never disclosed allocation data. Each number
            carries the confidence below.
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
            {(["disclosed", "estimated", "modeled"] as Confidence[]).map((c) => (
              <div key={c} className="flex items-center gap-2">
                <ConfidenceDot confidence={c} />
                <dt className="font-mono text-xs text-ink">
                  {CONFIDENCE_META[c].label}
                </dt>
                <dd className="font-sans text-xs text-ink/50">
                  — {CONFIDENCE_META[c].blurb}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 font-mono text-[11px] text-ink/40">
            generated by kerf · kerf-kappa.vercel.app · figures are computed
            deterministically from public-data inputs
          </p>
        </footer>
      </article>
    </div>
  );
}
