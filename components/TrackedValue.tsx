// ─────────────────────────────────────────────────────────────────────────────
// TrackedValue — kerf's honesty primitive.
//
// Every number in the product renders through here: the value in mono + a single
// confidence dot whose fill encodes how much to trust it. The same dot language
// appears in the footer legend, so the mark is learnable. Hover for the source.
//
// disclosed → filled green  (a real first-party disclosure)
// estimated → hollow ring    (public reporting / analyst estimate)
// modeled   → filled rose     (our own inference — softest)
// ─────────────────────────────────────────────────────────────────────────────

import type { Confidence } from "@/lib/engine";

export const CONFIDENCE_META: Record<
  Confidence,
  { label: string; dotClass: string; blurb: string }
> = {
  disclosed: {
    label: "disclosed",
    dotClass: "bg-green border border-green",
    blurb: "a real, public first-party disclosure",
  },
  estimated: {
    label: "estimated",
    dotClass: "bg-transparent border border-ink/45",
    blurb: "built from public reporting / analyst coverage — rounded",
  },
  modeled: {
    label: "modeled",
    dotClass: "bg-rose border border-rose",
    blurb: "inferred or derived by kerf — the softest grade",
  },
};

export function ConfidenceDot({
  confidence,
  className = "",
}: {
  confidence: Confidence;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block size-[7px] shrink-0 rounded-full ${CONFIDENCE_META[confidence].dotClass} ${className}`}
    />
  );
}

interface TrackedValueProps {
  value: number | string;
  confidence: Confidence;
  /** provenance for the hover title */
  source?: string;
  asOf?: string;
  note?: string;
  /** formatter for numeric values (default: locale string) */
  format?: (n: number) => string;
  unit?: string;
  className?: string;
  /** override the value's font (hero uses serif); defaults to mono */
  valueClassName?: string;
}

export function TrackedValue({
  value,
  confidence,
  source,
  asOf,
  note,
  format = (n) => n.toLocaleString(),
  unit,
  className = "",
  valueClassName = "font-mono",
}: TrackedValueProps) {
  const shown = typeof value === "number" ? format(value) : value;
  const meta = CONFIDENCE_META[confidence];
  const title = [
    meta.label,
    source && `source: ${source}`,
    asOf && `as of ${asOf}`,
    note,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 ${className}`}
    >
      <span className={valueClassName}>
        {shown}
        {unit ? <span className="text-ink/55">{unit}</span> : null}
      </span>
      <ConfidenceDot confidence={confidence} />
    </span>
  );
}
