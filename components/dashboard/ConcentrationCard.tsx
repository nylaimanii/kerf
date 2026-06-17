import type { OperatorConcentrationView } from "@/lib/store";
import { ConfidenceDot } from "@/components/TrackedValue";

// Operator → accent. TSMC is the story, so it gets the deep-green fill that
// reads as "the incumbent"; everyone else is a quiet ink. Length carries the
// message — TSMC's bar is ~7× Intel's.
function fillFor(operator: string) {
  return operator === "TSMC" ? "bg-green" : "bg-ink/70";
}

export function ConcentrationCard({
  conc,
}: {
  conc: OperatorConcentrationView;
}) {
  const ranked = Object.entries(conc.byOperator).sort((a, b) => b[1] - a[1]);
  const max = ranked[0]?.[1] ?? 100;

  return (
    <article className="rounded-xl border border-line bg-bone p-6">
      <header className="mb-1 flex items-baseline justify-between">
        <h2 className="font-serif text-xl lowercase text-ink">concentration</h2>
        <span className="font-mono text-xs text-ink/45">
          {conc.capacityUnit}
        </span>
      </header>
      <p className="mb-6 font-sans text-sm text-ink/55">
        share of packaging capacity, by operator
      </p>

      {/* the supply spectrum — one bar, the whole pool, segmented */}
      <div className="mb-7 flex h-2 w-full overflow-hidden rounded-full">
        {ranked.map(([op, share]) => (
          <div
            key={op}
            className={fillFor(op)}
            style={{ width: `${share}%` }}
            title={`${op} ${share.toFixed(1)}%`}
          />
        ))}
      </div>

      <ul className="space-y-4">
        {ranked.map(([op, share]) => (
          <li key={op} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3">
            <span className="truncate font-sans text-sm text-ink">{op}</span>
            <span className="h-1.5 w-full rounded-full bg-line/70">
              <span
                className={`block h-full rounded-full ${fillFor(op)}`}
                style={{ width: `${(share / max) * 100}%` }}
              />
            </span>
            <span className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-ink">
              {share.toFixed(1)}
              <span className="text-ink/45">%</span>
              <ConfidenceDot confidence={conc.weakestInput} />
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 font-mono text-[11px] leading-snug text-ink/40">
        shares shown to 1 decimal; HHI is computed from unrounded shares (so it
        won&rsquo;t reproduce exactly from the rounded figures above).
      </p>
    </article>
  );
}
