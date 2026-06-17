"use client";

// ⚠ TEMPORARY debug dump — delete once the real dashboard exists. Its only job is
// to prove the store → engine wiring is live in the browser, baseline + scenario.

import type { DisruptionScenario } from "@/lib/types";
import {
  selectActiveCascade,
  selectFacilitiesWithBookings,
  selectOperatorConcentration,
  selectSPOFs,
  useKerfStore,
} from "@/lib/store";

const TEST_SCENARIO: DisruptionScenario = {
  id: "debug-ap3-30",
  label: "TSMC AP3 (Longtan) −30%",
  facilityId: "tsmc-ap3-longtan",
  capacityDeltaPct: -30,
};

const num = (n: number, d = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits: d });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-44 shrink-0 text-ink/50">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function DebugPage() {
  const activeScenario = useKerfStore((s) => s.activeScenario);
  const setScenario = useKerfStore((s) => s.setScenario);
  const clearScenario = useKerfStore((s) => s.clearScenario);

  const conc = useKerfStore(selectOperatorConcentration);
  const spofs = useKerfStore(selectSPOFs);
  const facilities = useKerfStore(selectFacilitiesWithBookings);
  const cascade = useKerfStore(selectActiveCascade);

  const isScenario = activeScenario !== null;

  return (
    <main className="min-h-screen bg-bone px-8 py-10 font-mono text-xs text-ink">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="font-serif text-2xl lowercase tracking-tight">
            kerf · debug
          </h1>
          <p className="text-ink/50">
            temporary store → engine wiring check. mode:{" "}
            <span className={isScenario ? "text-rose" : "text-green"}>
              {isScenario ? `scenario (${activeScenario.label})` : "baseline"}
            </span>
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setScenario(TEST_SCENARIO)}
              className="rounded-md bg-ink px-3 py-1.5 text-bone"
            >
              apply test scenario
            </button>
            <button
              onClick={() => clearScenario()}
              className="rounded-md border border-line px-3 py-1.5"
            >
              clear (baseline)
            </button>
          </div>
        </header>

        {/* operator concentration */}
        <section className="space-y-1">
          <h2 className="mb-2 font-serif text-base lowercase text-green">
            operator concentration
          </h2>
          <Row label="hhi">{num(conc.hhi)}</Row>
          <Row label="label">{conc.label}</Row>
          <Row label="pool unit">{conc.capacityUnit}</Row>
          <Row label="weakest input">
            <span className="text-rose">{conc.weakestInput}</span>
          </Row>
          <Row label="by operator">
            {Object.entries(conc.byOperator)
              .sort((a, b) => b[1] - a[1])
              .map(([o, p]) => `${o} ${num(p, 1)}%`)
              .join("  ·  ")}
          </Row>
        </section>

        {/* spofs */}
        <section className="space-y-1">
          <h2 className="mb-2 font-serif text-base lowercase text-green">
            single points of failure ({spofs.length})
          </h2>
          {spofs.length === 0 && <div className="text-ink/50">none flagged</div>}
          {spofs.map((s) => (
            <div key={s.chipId} className="border-l-2 border-rose/50 pl-3">
              <div className="font-semibold">{s.chipName}</div>
              {s.reasons.map((r) => (
                <div key={r} className="text-ink/60">
                  · {r}
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* active cascade */}
        <section className="space-y-1">
          <h2 className="mb-2 font-serif text-base lowercase text-green">
            active cascade
          </h2>
          {!cascade && (
            <div className="text-ink/50">
              null — no scenario active (baseline)
            </div>
          )}
          {cascade && (
            <div className="space-y-1">
              <Row label="trigger">
                {cascade.trigger.name} ({cascade.trigger.capacityDeltaPct}%)
              </Row>
              <Row label="direct loss">
                {num(cascade.directLoss.lostCapacity)}{" "}
                {cascade.directLoss.capacityUnit} (
                {num(cascade.directLoss.lostFraction * 100)}%)
              </Row>
              <Row label="severity">
                <span className="text-rose">
                  {num(cascade.systemicSeverity, 3)} · {cascade.severityLabel}
                </span>
              </Row>
              <Row label="weakest input">
                <span className="text-rose">{cascade.weakestInput}</span>
              </Row>
              <div className="pt-1">
                <div className="text-ink/50">affected chips</div>
                {cascade.affectedChips.map((c) => (
                  <div key={c.chipId} className="pl-3 text-ink/70">
                    · {c.name}: {num(c.estimatedCapacityHitPct, 1)}% hit
                  </div>
                ))}
              </div>
              <div className="pt-1">
                <div className="text-ink/50">affected customers</div>
                {cascade.affectedCustomers.map((c) => (
                  <div key={c.customer} className="pl-3 text-ink/70">
                    · {c.customer}: −{num(c.lostCapacity)} {c.capacityUnit}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* facilities with headroom */}
        <section className="space-y-1">
          <h2 className="mb-2 font-serif text-base lowercase text-green">
            facilities · booked / free headroom
          </h2>
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 gap-y-1">
            <div className="text-ink/50">facility</div>
            <div className="text-ink/50">cap</div>
            <div className="text-ink/50">booked</div>
            <div className="text-ink/50">free</div>
            <div className="text-ink/50">conf</div>
            {facilities.map((f) => (
              <FacilityRow key={f.facility.id} f={f} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function FacilityRow({
  f,
}: {
  f: ReturnType<typeof selectFacilitiesWithBookings>[number];
}) {
  return (
    <>
      <div className="truncate">{f.facility.name}</div>
      <div>
        {num(f.facility.monthlyCapacity.value)} {f.facility.capacityUnit}
      </div>
      <div className={f.overbooked ? "text-rose" : ""}>
        {num(f.bookedPct, 0)}%
      </div>
      <div className="text-green">{num(f.freePct, 0)}%</div>
      <div className="text-ink/50">{f.weakestInput}</div>
    </>
  );
}
