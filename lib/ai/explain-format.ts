// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers for /api/explain — payload validation + prompt formatting.
//
// Kept free of `server-only` (and of the groq client) so it can be unit-tested.
// The route owns the key + the model call; this file owns the contract that the
// model only ever sees figures the engine actually produced. NO external numbers
// (regulatory thresholds, conventions, benchmarks) are ever added here.
// ─────────────────────────────────────────────────────────────────────────────

export interface CascadePayload {
  kind: "cascade";
  trigger: {
    name: string;
    operator: string;
    capacityDeltaPct: number;
    capacityUnit: string;
  };
  directLoss: { lostCapacity: number; lostFraction: number };
  systemicSeverity: number;
  severityLabel: string;
  affectedChips: { name: string; estimatedCapacityHitPct: number }[];
  weakestInput: string;
  baselineHhi: number;
  scenarioHhi: number;
}

export interface ConcentrationPayload {
  kind: "concentration";
  hhi: number;
  label: string;
  capacityUnit: string;
  byOperator: Record<string, number>;
  weakestInput: string;
  spofs: { chipName: string; reasons: string[] }[];
}

export type Payload = CascadePayload | ConcentrationPayload;

export type ValidationResult =
  | { ok: true; payload: Payload }
  | { ok: false; error: string };

// ── shape guards ──
const isNum = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string";
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Validate an UNTRUSTED request payload into a typed Payload, or return a clear
 * error. Anything malformed → ok:false (the route turns this into a clean 400),
 * so a bad shape can never reach a `.toFixed` and crash with a 500/502.
 */
export function validatePayload(input: unknown): ValidationResult {
  if (!isObj(input)) return { ok: false, error: "payload must be an object" };

  if (input.kind === "cascade") {
    const t = input.trigger;
    if (!isObj(t) || !isStr(t.name) || !isStr(t.operator) || !isStr(t.capacityUnit) || !isNum(t.capacityDeltaPct))
      return { ok: false, error: "cascade.trigger malformed" };
    const dl = input.directLoss;
    if (!isObj(dl) || !isNum(dl.lostCapacity) || !isNum(dl.lostFraction))
      return { ok: false, error: "cascade.directLoss malformed" };
    if (!isNum(input.systemicSeverity)) return { ok: false, error: "cascade.systemicSeverity must be a number" };
    if (!isStr(input.severityLabel)) return { ok: false, error: "cascade.severityLabel must be a string" };
    if (!isNum(input.baselineHhi) || !isNum(input.scenarioHhi))
      return { ok: false, error: "cascade hhi fields must be numbers" };
    if (!isStr(input.weakestInput)) return { ok: false, error: "cascade.weakestInput must be a string" };
    if (!Array.isArray(input.affectedChips)) return { ok: false, error: "cascade.affectedChips must be an array" };
    for (const c of input.affectedChips) {
      if (!isObj(c) || !isStr(c.name) || !isNum(c.estimatedCapacityHitPct))
        return { ok: false, error: "cascade.affectedChips entry malformed" };
    }
    return { ok: true, payload: input as unknown as CascadePayload };
  }

  if (input.kind === "concentration") {
    if (!isNum(input.hhi)) return { ok: false, error: "concentration.hhi must be a number" };
    if (!isStr(input.label)) return { ok: false, error: "concentration.label must be a string" };
    if (!isStr(input.capacityUnit)) return { ok: false, error: "concentration.capacityUnit must be a string" };
    if (!isStr(input.weakestInput)) return { ok: false, error: "concentration.weakestInput must be a string" };
    // byOperator must be a plain object of operator → finite number (NOT an
    // array, NOT objects-as-values — that was the latent .toFixed crash).
    if (!isObj(input.byOperator)) return { ok: false, error: "concentration.byOperator must be an object" };
    const entries = Object.entries(input.byOperator);
    if (entries.length === 0) return { ok: false, error: "concentration.byOperator is empty" };
    for (const [op, share] of entries) {
      if (!isNum(share))
        return { ok: false, error: `concentration.byOperator["${op}"] must be a number, got ${typeof share}` };
    }
    if (!Array.isArray(input.spofs)) return { ok: false, error: "concentration.spofs must be an array" };
    for (const s of input.spofs) {
      if (!isObj(s) || !isStr(s.chipName) || !Array.isArray(s.reasons) || !s.reasons.every(isStr))
        return { ok: false, error: "concentration.spofs entry malformed" };
    }
    return { ok: true, payload: input as unknown as ConcentrationPayload };
  }

  return { ok: false, error: "payload.kind must be 'cascade' or 'concentration'" };
}

const pct = (n: number, d = 1) => `${Number(n).toFixed(d)}%`;
const round = (n: number) => Math.round(Number(n)).toLocaleString();

/**
 * Flatten a validated payload into the EXACT figures the model may discuss.
 * Contains only engine-computed values — never a regulatory threshold or any
 * external benchmark.
 */
export function formatPayload(p: Payload): string {
  if (p.kind === "cascade") {
    return [
      `SCENARIO: ${p.trigger.name} (${p.trigger.operator}) capacity change ${p.trigger.capacityDeltaPct}%.`,
      `Direct capacity lost: ${round(p.directLoss.lostCapacity)} ${p.trigger.capacityUnit} (${pct(p.directLoss.lostFraction * 100, 0)} of that line).`,
      `Systemic severity: ${Number(p.systemicSeverity).toFixed(2)} on a 0–1 scale (label: ${p.severityLabel}).`,
      `Market concentration (HHI) before: ${round(p.baselineHhi)}; after this scenario: ${round(p.scenarioHhi)}.`,
      p.affectedChips.length
        ? `Affected chips and their estimated output hit: ${p.affectedChips
            .map((c) => `${c.name} ${pct(c.estimatedCapacityHitPct)}`)
            .join(", ")}.`
        : `No modeled chip depends on this line.`,
      `Weakest input confidence across these figures: ${p.weakestInput}.`,
    ].join("\n");
  }
  // concentration — note: the qualitative label is included, but NO numeric
  // threshold/convention. The model must not attach an external number.
  const ops = Object.entries(p.byOperator)
    .sort((a, b) => b[1] - a[1])
    .map(([o, s]) => `${o} ${pct(s)}`)
    .join(", ");
  const spofs = p.spofs.length
    ? p.spofs.map((s) => `${s.chipName} (${s.reasons.join("; ")})`).join("; ")
    : "none flagged";
  return [
    `Operator concentration of advanced packaging (${p.capacityUnit} pool).`,
    `HHI: ${round(p.hhi)}. Qualitative label assigned by the engine: "${p.label}".`,
    `Capacity share by operator: ${ops}.`,
    `Single points of failure (chips concentrated past threshold): ${spofs}.`,
    `Weakest input confidence across these figures: ${p.weakestInput}.`,
  ].join("\n");
}
