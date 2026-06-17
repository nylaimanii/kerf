"use client";

import {
  selectOperatorConcentration,
  selectSPOFs,
  useKerfStore,
} from "@/lib/store";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ScenarioBanner } from "@/components/ScenarioBanner";
import { ExportBriefButton } from "@/components/ExportBriefButton";
import { ExplanationPanel } from "@/components/ai/ExplanationPanel";
import { LandingHero } from "@/components/landing/LandingHero";
import { Hero } from "@/components/dashboard/Hero";
import { ConcentrationCard } from "@/components/dashboard/ConcentrationCard";
import { SpofCard } from "@/components/dashboard/SpofCard";
import { HonestyFooter } from "@/components/dashboard/HonestyFooter";

export default function Dashboard() {
  const conc = useKerfStore(selectOperatorConcentration);
  const spofs = useKerfStore(selectSPOFs);
  const selectedChipId = useKerfStore((s) => s.selectedChipId);
  const selectChip = useKerfStore((s) => s.selectChip);
  const activeScenario = useKerfStore((s) => s.activeScenario);

  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <SiteNav />

        <main>
          {/* framing for a cold visitor — thesis flows into the live data below */}
          <LandingHero />

          {/* the assessment — the live deterministic output */}
          <section id="assessment" className="scroll-mt-4 pb-16 pt-12">
            <p className="mb-1 font-sans text-xs lowercase tracking-[0.2em] text-ink/45">
              the assessment
            </p>
            <ScenarioBanner />
            <Hero conc={conc} />

            <div className="mt-2 flex justify-end">
              <ExportBriefButton />
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <ConcentrationCard conc={conc} />
            <SpofCard
              spofs={spofs}
              selectedChipId={selectedChipId}
              onSelect={selectChip}
            />
          </div>

            {/* AI narrative over the computed concentration + SPOF picture */}
            <div className="mt-5">
              <ExplanationPanel
                kind="concentration"
                depth="deep"
                idleLabel="explain the concentration"
                contextKey={`concentration:${activeScenario?.id ?? "baseline"}`}
                getPayload={() => ({
                  hhi: conc.hhi,
                  label: conc.label,
                  capacityUnit: conc.capacityUnit,
                  byOperator: conc.byOperator,
                  weakestInput: conc.weakestInput,
                  spofs: spofs.map((s) => ({
                    chipName: s.chipName,
                    reasons: s.reasons,
                  })),
                })}
              />
            </div>

            <HonestyFooter />
          </section>

          <SiteFooter />
        </main>
      </div>
    </div>
  );
}
