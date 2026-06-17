"use client";

import Link from "next/link";

import { selectBaselineOperatorConcentration, useKerfStore } from "@/lib/store";

// The framing a cold visitor reads before the live numbers. Thesis → hook →
// honest caveat → entry. Every figure is real: the HHI is kerf's computed
// baseline; the $210B is the reported 2021 figure (provenance lives on /case).
export function LandingHero() {
  const baseline = useKerfStore(selectBaselineOperatorConcentration);
  const hhi = Math.round(baseline.hhi).toLocaleString();

  return (
    <section className="border-b border-line py-14 sm:py-20">
      {/* definition */}
      <p className="max-w-md font-mono text-xs leading-relaxed text-ink/55">
        kerf <span className="text-ink/40">(n.)</span> — the slit a saw leaves;
        the material lost in the cut. also: the gap between supply and demand.
      </p>

      {/* thesis */}
      <h1 className="mt-7 max-w-3xl text-balance font-serif text-3xl leading-[1.12] tracking-tight text-ink sm:text-5xl">
        A modern AI chip crosses ~1,400 steps and a dozen countries. The single
        biggest bottleneck — advanced packaging and HBM — runs on spreadsheets,
        with no visibility past tier-1.
      </h1>
      <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-ink/70">
        kerf maps that chokepoint and shows where it breaks{" "}
        <span className="italic">before it breaks.</span>
      </p>

      {/* the hook — the signature moment: a kerf-cut rule down the side */}
      <div className="mt-9 max-w-2xl border-l-2 border-green pl-5">
        <p className="font-sans text-lg leading-relaxed text-ink/85 sm:text-xl">
          In{" "}
          <Link href="/case" className="text-green underline-offset-4 hover:underline">
            2021
          </Link>
          , a chip class costing about{" "}
          <span className="font-mono text-ink">$1</span> held up{" "}
          <span className="font-mono text-ink">$210B</span> in vehicles — a{" "}
          <span className="italic">less</span> concentrated supply chain than this
          one. Today&rsquo;s advanced-packaging HHI is{" "}
          <a href="#assessment" className="font-mono text-ink underline-offset-4 hover:underline">
            {hhi}
          </a>
          .
        </p>
        <p className="mt-3 font-serif text-xl text-ink sm:text-2xl">
          Different chips, identical structure — and this time it&rsquo;s mapped.
        </p>
      </div>

      {/* honest caveat */}
      <p className="mt-8 max-w-2xl font-mono text-xs leading-relaxed text-ink/50">
        built from public data — filings, earnings calls, analyst reporting.
        figures estimated / modeled, not disclosed allocation data.
      </p>

      {/* entry */}
      <div className="mt-7">
        <a
          href="#assessment"
          className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 font-mono text-sm text-bone transition-opacity hover:opacity-90"
        >
          see the assessment
          <span aria-hidden>↓</span>
        </a>
      </div>

      {/* how kerf works — a real pipeline, so the arrows carry meaning */}
      <div className="mt-14 border-t border-line pt-8">
        <p className="font-sans text-xs lowercase tracking-[0.2em] text-ink/45">
          how kerf works
        </p>
        <ol className="mt-4 grid gap-5 sm:grid-cols-3">
          {[
            {
              k: "map",
              t: "maps the dependency network",
              d: "every accelerator traced to the packaging and memory lines it actually depends on.",
            },
            {
              k: "flag",
              t: "flags concentration + single points of failure",
              d: "deterministic math — HHI and SPOF detection. no black box, every number inspectable.",
            },
            {
              k: "simulate",
              t: "simulates disruptions, then explains them",
              d: "perturb a line; the engine computes the cascade; AI narrates the result — it never computes.",
            },
          ].map((s, i) => (
            <li key={s.k} className="border-t border-ink/15 pt-3">
              <div className="flex items-baseline gap-2 font-mono text-xs text-green">
                <span>{i + 1}</span>
                <span className="text-ink/40">{i < 2 ? "→" : "·"}</span>
                <span className="text-ink/70">{s.k}</span>
              </div>
              <p className="mt-2 font-sans text-sm font-medium text-ink">{s.t}</p>
              <p className="mt-1 font-sans text-xs leading-snug text-ink/55">
                {s.d}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
