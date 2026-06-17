"use client";

// ─────────────────────────────────────────────────────────────────────────────
// ScenarioConsole — the what-if instrument.
//
// Constructs a DisruptionScenario and drives it through the EXISTING store state
// (setScenario / clearScenario). The graph and every selector already react. No
// new engine logic — this is controls + a live, honestly-framed impact readout.
//
// Scenarios are MODELED PROJECTIONS from public-data inputs, never forecasts —
// every number keeps its confidence, and the readout says so out loud.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

import type { DisruptionScenario, PackagingFacility } from "@/lib/types";
import {
  selectActiveCascade,
  selectBaselineOperatorConcentration,
  selectOperatorConcentration,
  useKerfStore,
} from "@/lib/store";
import { CascadeReadout } from "@/components/CascadeReadout";
import { ExportBriefButton } from "@/components/ExportBriefButton";
import { ExplanationPanel } from "@/components/ai/ExplanationPanel";

function facLabel(f: PackagingFacility) {
  const ap = f.name.match(/AP\d[\d/]*/)?.[0];
  const head = ap ? `${f.operator} ${ap}` : f.operator;
  return `${head} · ${f.technology}`;
}

interface Preset {
  key: string;
  label: string;
  facilityId: string;
  delta: number;
}

// Single-facility presets, grounded in real seed lines. (The scenario model is
// one facility per scenario, so we name the real chokepoint rather than imply a
// multi-site event we don't model.)
const PRESETS: Preset[] = [
  { key: "cowos-l", label: "CoWoS-L line down", facilityId: "tsmc-ap6-chiayi", delta: -100 },
  { key: "hbm", label: "HBM shortage — SK hynix", facilityId: "skhynix-icheon-kr", delta: -30 },
  { key: "export", label: "export control — TSMC AP5", facilityId: "tsmc-ap5-zhunan", delta: -50 },
  { key: "amkor", label: "Amkor Vietnam outage", facilityId: "amkor-bacninh-vn", delta: -100 },
];

export function ScenarioConsole() {
  const facilities = useKerfStore((s) => s.facilities);
  const activeScenario = useKerfStore((s) => s.activeScenario);
  const setScenario = useKerfStore((s) => s.setScenario);
  const clearScenario = useKerfStore((s) => s.clearScenario);
  const cascade = useKerfStore(selectActiveCascade);
  const effConc = useKerfStore(selectOperatorConcentration);
  const baseConc = useKerfStore(selectBaselineOperatorConcentration);

  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [delta, setDelta] = useState(-30);

  // keep the controls in sync with whatever scenario is active (preset, etc.)
  useEffect(() => {
    if (activeScenario) {
      setFacilityId(activeScenario.facilityId);
      setDelta(activeScenario.capacityDeltaPct);
    }
  }, [activeScenario]);

  const facilityById = (id: string) => facilities.find((f) => f.id === id);

  const apply = () => {
    const f = facilityById(facilityId);
    if (!f) return;
    const scenario: DisruptionScenario = {
      id: `s-${facilityId}-${delta}`,
      label: `${facLabel(f)} ${delta}%`,
      facilityId,
      capacityDeltaPct: delta,
    };
    setScenario(scenario);
  };

  const applyPreset = (p: Preset) => {
    const f = facilityById(p.facilityId);
    if (!f) return;
    // sync the controls to the preset IMMEDIATELY (no desync window where the
    // slider/dropdown lag the applied scenario) before committing it.
    setFacilityId(p.facilityId);
    setDelta(p.delta);
    setScenario({
      id: `preset-${p.key}`,
      label: p.label,
      facilityId: p.facilityId,
      capacityDeltaPct: p.delta,
    });
  };

  return (
    <aside className="flex flex-col gap-5 rounded-xl border border-line bg-bone p-5">
      <header>
        <p className="font-sans text-xs lowercase tracking-[0.2em] text-ink/50">
          what-if console
        </p>
        <h2 className="mt-1 font-serif text-xl text-ink">disrupt a line</h2>
      </header>

      {/* presets */}
      <div>
        <p className="mb-2 font-sans text-xs text-ink/55">one-click scenarios</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const active = activeScenario?.id === `preset-${p.key}`;
            return (
              <button
                key={p.key}
                onClick={() => applyPreset(p)}
                className={[
                  "rounded-md border px-3 py-2 text-left font-mono text-[11px] leading-tight transition-colors",
                  active
                    ? "border-rose/70 bg-rose/10 text-rose"
                    : "border-line text-ink/80 hover:border-green hover:bg-green/5",
                ].join(" ")}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* custom builder */}
      <div className="space-y-3 border-t border-line pt-4">
        <p className="font-sans text-xs text-ink/55">build your own</p>

        <label className="block">
          <span className="mb-1 block font-mono text-[11px] text-ink/50">
            facility
          </span>
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            className="w-full rounded-md border border-line bg-bone px-2 py-2 font-mono text-xs text-ink focus:border-green focus:outline-none"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {facLabel(f)} — {f.country}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 flex items-baseline justify-between font-mono text-[11px] text-ink/50">
            <span>capacity lost</span>
            <span className="text-base text-ink">{delta}%</span>
          </span>
          <input
            type="range"
            min={-100}
            max={0}
            step={5}
            value={delta}
            onChange={(e) => setDelta(Number(e.target.value))}
            className="w-full accent-green"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button
            onClick={apply}
            disabled={delta === 0}
            title={delta === 0 ? "set a capacity loss below 0% first" : undefined}
            className="flex-1 rounded-md bg-ink px-3 py-2 font-mono text-xs text-bone transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            apply scenario
          </button>
          <button
            onClick={() => clearScenario()}
            disabled={!activeScenario}
            className="rounded-md border border-line px-3 py-2 font-mono text-xs text-ink/70 transition-colors hover:border-green disabled:cursor-not-allowed disabled:opacity-40"
          >
            reset
          </button>
        </div>
      </div>

      {/* impact readout */}
      <ImpactReadout
        cascade={cascade}
        baseHhi={baseConc.hhi}
        effHhi={effConc.hhi}
        scenarioId={activeScenario?.id}
      />

      <div className="flex justify-end">
        <ExportBriefButton />
      </div>
    </aside>
  );
}

function ImpactReadout({
  cascade,
  baseHhi,
  effHhi,
  scenarioId,
}: {
  cascade: ReturnType<typeof selectActiveCascade>;
  baseHhi: number;
  effHhi: number;
  scenarioId?: string;
}) {
  if (!cascade) {
    return (
      <div className="rounded-lg border border-dashed border-line p-4 font-mono text-xs text-ink/45">
        no scenario active — showing baseline. apply one to model the cascade.
      </div>
    );
  }

  return (
    <CascadeReadout cascade={cascade} baselineHhi={baseHhi} scenarioHhi={effHhi}>
      {/* AI narrative over the computed figures (visually distinct, green) */}
      <ExplanationPanel
        key={scenarioId ? `cascade:${scenarioId}` : "cascade:none"}
        kind="cascade"
        depth="deep"
        idleLabel="explain this scenario"
        contextKey={scenarioId ? `cascade:${scenarioId}` : undefined}
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
          scenarioHhi: effHhi,
        })}
      />
    </CascadeReadout>
  );
}
