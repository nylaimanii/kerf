import { CONFIDENCE_META, ConfidenceDot } from "@/components/TrackedValue";
import type { Confidence } from "@/lib/engine";

const ORDER: Confidence[] = ["disclosed", "estimated", "modeled"];

export function HonestyFooter() {
  return (
    <section className="mt-4 rounded-xl border border-line bg-ink/[0.02] p-7 sm:p-9">
      <p className="font-sans text-xs lowercase tracking-[0.2em] text-green">
        the honesty layer
      </p>
      <h2 className="mt-3 max-w-2xl text-balance font-serif text-2xl leading-snug text-ink">
        every number here carries where it came from, and how much to trust it.
      </h2>
      <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-ink/70">
        kerf is built entirely from public information — earnings calls, filings,
        trade press, and analyst coverage. It is{" "}
        <span className="text-ink">not real allocation data</span>: no company
        discloses plant-level capacity or customer shares. So nothing here is
        labeled <span className="font-mono">disclosed</span> unless a genuine
        first-party disclosure exists. The rest is estimated or modeled — and
        every figure says which, out loud.
      </p>

      <dl className="mt-7 grid gap-4 sm:grid-cols-3">
        {ORDER.map((c) => (
          <div
            key={c}
            className="flex items-start gap-3 rounded-lg border border-line bg-bone p-4"
          >
            <ConfidenceDot confidence={c} className="mt-1" />
            <div>
              <dt className="font-mono text-sm text-ink">
                {CONFIDENCE_META[c].label}
              </dt>
              <dd className="mt-0.5 font-sans text-xs leading-snug text-ink/60">
                {CONFIDENCE_META[c].blurb}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
