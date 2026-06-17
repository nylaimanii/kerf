"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  findSPOFs,
  operatorConcentration,
  simulateDisruption,
} from "@/lib/engine";
import {
  CASE_SCENARIO,
  caseBookings,
  caseChips,
  caseFacilities,
  reportedFacts,
} from "@/lib/data/case2021";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CascadeReadout } from "@/components/CascadeReadout";
import { ExplanationPanel } from "@/components/ai/ExplanationPanel";
import { ConfidenceDot } from "@/components/TrackedValue";

const num = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function CasePage() {
  // everything below is the SAME deterministic engine, run on the scoped 2021
  // case dataset (computed once — pure).
  const { conc, spofs, cascade, baseHhi, scenarioHhi } = useMemo(() => {
    const conc = operatorConcentration(caseFacilities);
    const spofs = findSPOFs(caseChips, caseFacilities, caseBookings);
    const cascade = simulateDisruption(
      CASE_SCENARIO.facilityId,
      CASE_SCENARIO.capacityDeltaPct,
      { facilities: caseFacilities, bookings: caseBookings, chips: caseChips },
    );
    const factor = 1 + CASE_SCENARIO.capacityDeltaPct / 100;
    const perturbed = caseFacilities.map((f) =>
      f.id === CASE_SCENARIO.facilityId
        ? { ...f, monthlyCapacity: { ...f.monthlyCapacity, value: f.monthlyCapacity.value * factor } }
        : f,
    );
    return {
      conc,
      spofs,
      cascade,
      baseHhi: conc.hhi,
      scenarioHhi: operatorConcentration(perturbed).hhi,
    };
  }, []);

  const TODAY_PACKAGING_HHI = 5783;

  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
        <SiteNav />

        <main className="space-y-16 pb-24 pt-10 sm:pt-14">
          {/* ── hero ── */}
          <section>
            <p className="font-sans text-xs lowercase tracking-[0.2em] text-ink/50">
              case study · historical
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
              the 2021 chip shortage,
              <br />
              reconstructed
            </h1>
            <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-ink/75">
              A documented crisis — a class of cheap chips idled hundreds of
              billions in finished vehicles. kerf maps it with the same engine it
              runs on advanced packaging today, to show the cascade was{" "}
              <span className="italic">foreseeable structure</span>, not bad luck.
            </p>

            <HonestyKey />
          </section>

          {/* ── 1. the setup ── */}
          <Section eyebrow="01 — the setup" title="what was documented">
            <p className="mb-6 max-w-xl font-sans text-base leading-relaxed text-ink/75">
              In 2021, a different chip class than today&rsquo;s — mature-node
              automotive microcontrollers, power and analog ICs — went short.
              Just-in-time inventories had no slack, and automakers had visibility
              into their tier-1 suppliers but not the tier-2 and tier-3 fabs
              underneath. Chips costing about a dollar held up vehicles worth tens
              of thousands.
            </p>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {reportedFacts.map((f) => (
                <div key={f.label} className="rounded-lg border border-line bg-bone p-4">
                  <dt className="font-mono text-2xl text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      {f.display}
                      <ConfidenceDot confidence={f.value.provenance.confidence} />
                    </span>
                  </dt>
                  <dd className="mt-1 font-sans text-xs leading-snug text-ink/55">
                    {f.label}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 font-mono text-[11px] text-ink/45">
              all four are widely reported public/analyst figures (
              <span className="inline-block size-[7px] translate-y-px rounded-full border border-ink/45" />{" "}
              estimated) — sourced in the data file, not first-party disclosures.
            </p>
          </Section>

          {/* ── 2. the mechanism ── */}
          <Section eyebrow="02 — the mechanism" title="why it cascaded">
            <p className="mb-6 max-w-xl font-sans text-base leading-relaxed text-ink/75">
              The same three forces kerf measures everywhere: supply{" "}
              <strong className="font-medium text-ink">concentrated</strong> in a
              few foundries, individual chips{" "}
              <strong className="font-medium text-ink">single-sourced</strong> on
              one of them, and a disruption that{" "}
              <strong className="font-medium text-ink">cascaded</strong> downstream
              before anyone could see it coming.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-bone p-5">
                <p className="font-sans text-xs lowercase tracking-[0.15em] text-green">
                  concentration
                </p>
                <p className="mt-2 font-mono text-3xl text-ink">{num(conc.hhi)}</p>
                <p className="mt-1 font-mono text-xs text-ink/55">
                  hhi · {conc.label}
                </p>
                <p className="mt-3 font-sans text-xs leading-snug text-ink/60">
                  Mature-node auto foundry capacity, by operator — modeled, with
                  TSMC the dominant source.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bone p-5">
                <p className="font-sans text-xs lowercase tracking-[0.15em] text-rose">
                  single points of failure
                </p>
                <p className="mt-2 font-mono text-3xl text-rose">{spofs.length}</p>
                <p className="mt-1 font-mono text-xs text-ink/55">
                  auto chip families flagged
                </p>
                <ul className="mt-3 space-y-1">
                  {spofs.map((s) => (
                    <li key={s.chipId} className="font-sans text-xs leading-snug text-ink/65">
                      <span className="text-ink">{s.chipName}</span> —{" "}
                      {s.reasons[0]}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          {/* ── 3. the kerf lens ── */}
          <Section eyebrow="03 — the kerf lens" title="run the disruption">
            <p className="mb-6 max-w-xl font-sans text-base leading-relaxed text-ink/75">
              The documented trigger was foundry capacity pulled toward consumer
              electronics. Run that as a kerf scenario —{" "}
              <span className="font-mono text-sm text-ink">{CASE_SCENARIO.label}</span>{" "}
              — and the cascade falls out of the structure: the most TSMC-bound
              MCU families take the deepest hit.
            </p>
            <CascadeReadout cascade={cascade} baselineHhi={baseHhi} scenarioHhi={scenarioHhi}>
              <ExplanationPanel
                kind="cascade"
                depth="deep"
                idleLabel="explain this historical cascade"
                getPayload={() => ({
                  trigger: {
                    name: cascade.trigger.name,
                    operator: cascade.trigger.operator,
                    capacityDeltaPct: cascade.trigger.capacityDeltaPct,
                    capacityUnit: cascade.trigger.capacityUnit,
                  },
                  directLoss: {
                    lostCapacity: cascade.directLoss.lostCapacity,
                    lostFraction: cascade.directLoss.lostFraction,
                  },
                  systemicSeverity: cascade.systemicSeverity,
                  severityLabel: cascade.severityLabel,
                  affectedChips: cascade.affectedChips.map((c) => ({
                    name: c.name,
                    estimatedCapacityHitPct: c.estimatedCapacityHitPct,
                  })),
                  weakestInput: cascade.weakestInput,
                  baselineHhi: baseHhi,
                  scenarioHhi,
                })}
              />
            </CascadeReadout>
            <p className="mt-3 font-mono text-[11px] leading-snug text-ink/45">
              the cascade above is kerf&rsquo;s modeled reconstruction (
              <span className="inline-block size-[7px] translate-y-px rounded-full border border-rose bg-rose" />{" "}
              modeled) — the structure is reported, the magnitudes are ours.
            </p>
          </Section>

          {/* ── 4. the takeaway ── */}
          <Section eyebrow="04 — today" title="the same shape, more concentrated">
            <p className="max-w-xl font-sans text-base leading-relaxed text-ink/75">
              2021 was concentration nobody had mapped. The same dynamic now sits
              in AI&rsquo;s advanced packaging — except more concentrated: today&rsquo;s
              packaging HHI is{" "}
              <span className="font-mono text-ink">{num(TODAY_PACKAGING_HHI)}</span>{" "}
              versus this case&rsquo;s{" "}
              <span className="font-mono text-ink">{num(conc.hhi)}</span>. Different
              chips, identical structure — and this time it is mapped.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-md bg-ink px-4 py-2 font-mono text-xs text-bone transition-opacity hover:opacity-90"
              >
                see today&rsquo;s concentration →
              </Link>
              <Link
                href="/network"
                className="rounded-md border border-line px-4 py-2 font-mono text-xs text-ink/70 transition-colors hover:border-green"
              >
                open the network →
              </Link>
            </div>
          </Section>

          <SiteFooter />
        </main>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="font-mono text-xs lowercase text-ink/45">{eyebrow}</p>
      <h2 className="mb-5 mt-1 font-serif text-2xl tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

// The 3-way honesty distinction, front and center.
function HonestyKey() {
  return (
    <div className="mt-8 rounded-xl border border-line bg-ink/[0.02] p-5">
      <p className="font-sans text-xs lowercase tracking-[0.2em] text-green">
        how to read this page
      </p>
      <ul className="mt-3 space-y-2 font-sans text-sm text-ink/70">
        <li className="flex items-start gap-2.5">
          <span className="mt-1.5 inline-block size-[7px] shrink-0 rounded-full border border-ink/45" />
          <span>
            <span className="text-ink">reported fact</span> — widely reported
            public / analyst figures (the macro numbers). Estimates, not
            disclosures.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-1.5 inline-block size-[7px] shrink-0 rounded-full border border-rose bg-rose" />
          <span>
            <span className="text-ink">kerf reconstruction</span> — the foundry
            capacities, dependency weights and cascade. Structure is reported;
            magnitudes are modeled.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-1.5 inline-block size-[7px] shrink-0 rounded-full bg-green" />
          <span>
            <span className="text-ink">today-analogy</span> — the tie to current
            packaging data, drawn explicitly in the takeaway. kerf has no
            proprietary 2021 allocation data.
          </span>
        </li>
      </ul>
    </div>
  );
}
