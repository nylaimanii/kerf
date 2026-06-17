"use client";

import {
  selectOperatorConcentration,
  selectSPOFs,
  useKerfStore,
} from "@/lib/store";
import { SiteNav } from "@/components/SiteNav";
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
        <SiteNav />

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
