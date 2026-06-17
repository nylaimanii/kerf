import type { OperatorConcentrationView } from "@/lib/store";
import { ConfidenceDot } from "@/components/TrackedValue";
import { CONFIDENCE_META } from "@/components/TrackedValue";

// The canonical regulatory line: US DOJ/FTC treat HHI > 2,500 as "highly
// concentrated". We state how far past that line packaging supply sits.
const HIGHLY_CONCENTRATED_THRESHOLD = 2500;

export function Hero({ conc }: { conc: OperatorConcentrationView }) {
  const multiple = conc.hhi / HIGHLY_CONCENTRATED_THRESHOLD;

  return (
    <section className="border-b border-line py-12 sm:py-16">
      <p className="font-sans text-xs lowercase tracking-[0.2em] text-ink/50">
        operator concentration · advanced packaging
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        <span className="font-serif text-7xl leading-none tracking-tight text-ink tabular-nums sm:text-8xl">
          {Math.round(conc.hhi).toLocaleString()}
        </span>
        <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose/60 bg-rose/10 px-3 py-1 font-sans text-xs lowercase tracking-wide text-rose">
          {conc.label}
        </span>
      </div>

      <p className="mt-5 max-w-xl text-pretty font-sans text-base leading-relaxed text-ink/80">
        advanced-packaging supply sits at{" "}
        <span className="font-mono text-ink">{multiple.toFixed(1)}×</span> the{" "}
        <span className="font-mono text-ink">
          {HIGHLY_CONCENTRATED_THRESHOLD.toLocaleString()}
        </span>{" "}
        mark regulators treat as{" "}
        <span className="italic">&ldquo;highly concentrated.&rdquo;</span>
      </p>

      <p className="mt-4 font-mono text-xs leading-relaxed text-ink/60">
        <ConfidenceDot
          confidence={conc.weakestInput}
          className="mr-2 inline-block align-middle"
        />
        rests on: {conc.weakestInput} data{" "}
        <span className="text-ink/35">
          — {CONFIDENCE_META[conc.weakestInput].blurb}
        </span>
      </p>
    </section>
  );
}
