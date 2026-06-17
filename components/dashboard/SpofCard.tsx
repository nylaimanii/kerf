import type { SPOF } from "@/lib/engine";
import { ConfidenceDot } from "@/components/TrackedValue";

// show a dependency split (operator or country → share) as a compact mono line
function splitLine(rec: Record<string, number>) {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
    .join(" · ");
}

export function SpofCard({
  spofs,
  selectedChipId,
  onSelect,
}: {
  spofs: SPOF[];
  selectedChipId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <article className="rounded-xl border border-line bg-bone p-6">
      <header className="mb-1 flex items-baseline justify-between">
        <h2 className="font-serif text-xl lowercase text-ink">
          single points of failure
        </h2>
        <span className="font-mono text-xs text-rose">{spofs.length}</span>
      </header>
      <p className="mb-6 font-sans text-sm text-ink/55">
        chips whose supply concentrates past a single operator or country —
        select one for its exposure breakdown
      </p>

      {spofs.length === 0 ? (
        <p className="font-mono text-sm text-ink/45">none flagged</p>
      ) : (
        <ul className="space-y-2">
          {spofs.map((s) => {
            const active = s.chipId === selectedChipId;
            const topShare = Math.max(s.topCountryShare, s.topOperatorShare);
            return (
              <li key={s.chipId}>
                <button
                  type="button"
                  onClick={() => onSelect(active ? null : s.chipId)}
                  aria-pressed={active}
                  aria-expanded={active}
                  className={[
                    "group flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
                    active
                      ? "border-rose/70 bg-rose/10"
                      : "border-line hover:border-rose/50 hover:bg-rose/5",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="mt-1 h-8 w-0.5 shrink-0 rounded-full bg-rose/60 transition-all group-hover:h-9"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-sans text-sm font-medium text-ink">
                        {s.chipName}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-rose">
                        {Math.round(topShare * 100)}%
                      </span>
                    </span>
                    {s.reasons.map((r) => (
                      <span
                        key={r}
                        className="mt-1 block font-sans text-xs leading-snug text-ink/60"
                      >
                        {r}
                      </span>
                    ))}

                    {/* exposure breakdown — the honest payoff of the click */}
                    {active && (
                      <span className="mt-3 block space-y-1 border-t border-rose/20 pt-3 font-mono text-[11px] text-ink/70">
                        <span className="block">
                          <span className="text-ink/45">by operator: </span>
                          {splitLine(s.exposure.byOperator)}
                        </span>
                        <span className="block">
                          <span className="text-ink/45">by country: </span>
                          {splitLine(s.exposure.byCountry)}
                        </span>
                        <span className="flex items-center gap-1.5 pt-0.5 text-ink/45">
                          rests on
                          <ConfidenceDot confidence={s.exposure.weakestInput} />
                          {s.exposure.weakestInput}
                        </span>
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
