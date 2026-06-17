// Shared cascade impact readout — used by the what-if console and the 2021 case
// study. Renders the computed figures (mono, with confidence dots); the parent
// supplies an ExplanationPanel via `children`. Numbers are primary; AI is below.

import type { CascadeResult } from "@/lib/engine";
import { ConfidenceDot } from "@/components/TrackedValue";

const num = (n: number, d = 0) =>
  n.toLocaleString(undefined, { maximumFractionDigits: d });

export function CascadeReadout({
  cascade,
  baselineHhi,
  scenarioHhi,
  children,
}: {
  cascade: CascadeResult;
  baselineHhi: number;
  scenarioHhi: number;
  children?: React.ReactNode;
}) {
  const deltaHhi = scenarioHhi - baselineHhi;
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
            {num(baselineHhi)} <span className="text-ink/40">{arrow}</span> {num(scenarioHhi)}
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

      {children}
    </div>
  );
}
