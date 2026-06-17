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
import { ConfidenceDot } from "@/components/TrackedValue";
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

const num = (n: number, d = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits: d });

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
            className="flex-1 rounded-md bg-ink px-3 py-2 font-mono text-xs text-bone transition-opacity hover:opacity-90"
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
      <ImpactReadout cascade={cascade} baseHhi={baseConc.hhi} effHhi={effConc.hhi} />
    </aside>
  );
}

function ImpactReadout({
  cascade,
  baseHhi,
  effHhi,
}: {
  cascade: ReturnType<typeof selectActiveCascade>;
  baseHhi: number;
  effHhi: number;
}) {
  if (!cascade) {
    return (
      <div className="rounded-lg border border-dashed border-line p-4 font-mono text-xs text-ink/45">
        no scenario active — showing baseline. apply one to model the cascade.
      </div>
    );
  }

  const deltaHhi = effHhi - baseHhi;
  const worsens = deltaHhi > 0.5; // more concentrated = risk worse
  const eases = deltaHhi < -0.5;
  const arrow = worsens ? "↑" : eases ? "↓" : "→";

  return (
    <div className="space-y-4 rounded-lg border border-rose/40 bg-rose/[0.04] p-4">
      <p className="font-sans text-xs lowercase tracking-[0.15em] text-rose">
        modeled impact
      </p>

      <div className="space-y-1.5 font-mono text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-ink/55">direct capacity lost</span>
          <span className="flex items-center gap-1.5 text-ink">
            {num(cascade.directLoss.lostCapacity)} {cascade.directLoss.capacityUnit}{" "}
            <span className="text-ink/45">
              ({num(cascade.directLoss.lostFraction * 100)}%)
            </span>
            <ConfidenceDot confidence={cascade.weakestInput} />
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-ink/55">systemic severity</span>
          <span className="flex items-center gap-1.5 text-rose">
            {num(cascade.systemicSeverity, 2)} · {cascade.severityLabel}
            <ConfidenceDot confidence={cascade.weakestInput} />
          </span>
        </div>
      </div>

      {/* before → after concentration */}
      <div className="border-t border-rose/20 pt-3">
        <div className="flex items-baseline justify-between font-mono text-xs">
          <span className="text-ink/55">concentration (hhi)</span>
          <span className={worsens ? "text-rose" : "text-ink"}>
            {num(baseHhi)} <span className="text-ink/40">{arrow}</span> {num(effHhi)}
          </span>
        </div>
        <p className="mt-1 font-sans text-[11px] leading-snug text-ink/45">
          {worsens
            ? "concentration rises — the disruption shifts share to the dominant operator."
            : eases
              ? "concentration falls because the struck supplier loses share — the supply hit is the severity above, not this number."
              : "concentration roughly unchanged."}
        </p>
      </div>

      {/* affected chips */}
      <div className="border-t border-rose/20 pt-3">
        <p className="mb-2 font-mono text-[11px] text-ink/55">
          affected chips ({cascade.affectedChips.length})
        </p>
        {cascade.affectedChips.length === 0 ? (
          <p className="font-mono text-[11px] text-ink/45">
            none — no modeled chip depends on this line
          </p>
        ) : (
          <ul className="space-y-1.5">
            {cascade.affectedChips
              .slice()
              .sort((a, b) => b.estimatedCapacityHitPct - a.estimatedCapacityHitPct)
              .map((c) => (
                <li
                  key={c.chipId}
                  className="flex items-center justify-between gap-3 font-mono text-xs"
                >
                  <span className="flex items-center gap-2 text-ink">
                    <ConfidenceDot confidence={cascade.weakestInput} />
                    {c.name}
                  </span>
                  <span className="text-rose">
                    −{num(c.estimatedCapacityHitPct, 1)}%
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* honesty */}
      <p className="border-t border-rose/20 pt-3 font-mono text-[11px] leading-snug text-ink/50">
        modeled projection from public-data inputs — not a forecast. rests on{" "}
        <span className="text-rose">{cascade.weakestInput}</span> data.
      </p>

      {/* AI narrative over the computed figures (visually distinct, green) */}
      <ExplanationPanel
        kind="cascade"
        depth="deep"
        idleLabel="explain this scenario"
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
    </div>
  );
}
