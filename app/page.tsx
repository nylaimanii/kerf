"use client";

import {
  selectOperatorConcentration,
  selectSPOFs,
  useKerfStore,
} from "@/lib/store";
import { Hero } from "@/components/dashboard/Hero";
import { ConcentrationCard } from "@/components/dashboard/ConcentrationCard";
import { SpofCard } from "@/components/dashboard/SpofCard";
import { HonestyFooter } from "@/components/dashboard/HonestyFooter";

export default function Dashboard() {
  const conc = useKerfStore(selectOperatorConcentration);
  const spofs = useKerfStore(selectSPOFs);
  const selectedChipId = useKerfStore((s) => s.selectedChipId);
  const selectChip = useKerfStore((s) => s.selectChip);

  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        {/* header band */}
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-5">
          <h1 className="font-serif text-2xl lowercase tracking-tight text-ink">
            kerf
          </h1>
          <p className="font-mono text-xs lowercase text-ink/55">
            the gap between supply and demand, mapped.
          </p>
        </header>

        <main className="pb-16">
          <Hero conc={conc} />

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <ConcentrationCard conc={conc} />
            <SpofCard
              spofs={spofs}
              selectedChipId={selectedChipId}
              onSelect={selectChip}
            />
          </div>

          <HonestyFooter />
        </main>
      </div>
    </div>
  );
}
