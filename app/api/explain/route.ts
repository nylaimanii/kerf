import { NextResponse } from "next/server";

import { GROQ_MODELS, type GroqDepth, groq, groqEnabled } from "@/lib/ai/groq";

// ─────────────────────────────────────────────────────────────────────────────
// /api/explain — narrate ALREADY-COMPUTED engine output. Never computes.
//
// The request body carries the numbers the deterministic engine produced. This
// route does no math: it formats those exact figures and asks the model to
// explain them, under a system prompt that forbids introducing any new number.
// If groq is unavailable, it fails gracefully (the UI keeps the numbers).
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are KERF's narrator. KERF is a semiconductor advanced-packaging and HBM supply-risk model. The figures you are given have ALREADY been computed by a deterministic engine.

HARD RULES — these define your integrity:
1. Explain ONLY the numbers present in the data provided below.
2. NEVER introduce, estimate, infer, or compute any figure that is not in the input — no new percentages, capacities, shares, dates, counts, or rankings.
3. Never recompute, round differently, or "correct" a number. Quote the figures exactly as given.
4. If the user might want something the data does not contain, say plainly that it is not in this data.
5. Surface confidence honestly. If the inputs are marked "modeled" or "estimated", state that the result rests on modeled/estimated public-data inputs and is a projection, not a certainty or forecast.
6. Tone: calm, precise, analyst. 2–4 sentences. No hype, no investment advice, no dramatic language beyond what the numbers support.

You are commentary on computed facts. The numbers are the truth; you only put them in words.`;

interface CascadePayload {
  kind: "cascade";
  trigger: { name: string; operator: string; capacityDeltaPct: number; capacityUnit: string };
  directLoss: { lostCapacity: number; lostFraction: number };
  systemicSeverity: number;
  severityLabel: string;
  affectedChips: { name: string; estimatedCapacityHitPct: number }[];
  weakestInput: string;
  baselineHhi: number;
  scenarioHhi: number;
}

interface ConcentrationPayload {
  kind: "concentration";
  hhi: number;
  label: string;
  capacityUnit: string;
  byOperator: Record<string, number>;
  weakestInput: string;
  spofs: { chipName: string; reasons: string[] }[];
}

type Payload = CascadePayload | ConcentrationPayload;

const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;
const round = (n: number) => Math.round(n).toLocaleString();

// Turn the structured engine result into a flat, unambiguous list of the EXACT
// figures the model is allowed to talk about.
function formatPayload(p: Payload): string {
  if (p.kind === "cascade") {
    const lines = [
      `SCENARIO: ${p.trigger.name} (${p.trigger.operator}) capacity change ${p.trigger.capacityDeltaPct}%.`,
      `Direct capacity lost: ${round(p.directLoss.lostCapacity)} ${p.trigger.capacityUnit} (${pct(p.directLoss.lostFraction * 100, 0)} of that line).`,
      `Systemic severity: ${p.systemicSeverity.toFixed(2)} on a 0–1 scale (label: ${p.severityLabel}).`,
      `Market concentration (HHI) before: ${round(p.baselineHhi)}; after this scenario: ${round(p.scenarioHhi)}.`,
      p.affectedChips.length
        ? `Affected chips and their estimated output hit: ${p.affectedChips
            .map((c) => `${c.name} ${pct(c.estimatedCapacityHitPct)}`)
            .join(", ")}.`
        : `No modeled chip depends on this line.`,
      `Weakest input confidence across these figures: ${p.weakestInput}.`,
    ];
    return lines.join("\n");
  }
  // concentration
  const ops = Object.entries(p.byOperator)
    .sort((a, b) => b[1] - a[1])
    .map(([o, s]) => `${o} ${pct(s)}`)
    .join(", ");
  const spofs = p.spofs.length
    ? p.spofs.map((s) => `${s.chipName} (${s.reasons.join("; ")})`).join("; ")
    : "none flagged";
  return [
    `Operator concentration of advanced packaging (${p.capacityUnit} pool).`,
    `HHI: ${round(p.hhi)} (label: ${p.label}). For reference, regulators treat HHI above 2,500 as "highly concentrated".`,
    `Capacity share by operator: ${ops}.`,
    `Single points of failure (chips concentrated past threshold): ${spofs}.`,
    `Weakest input confidence across these figures: ${p.weakestInput}.`,
  ].join("\n");
}

export async function POST(req: Request) {
  let body: { kind?: string; depth?: GroqDepth; payload?: Payload };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const payload = body.payload;
  if (!payload || (payload.kind !== "cascade" && payload.kind !== "concentration")) {
    return NextResponse.json({ error: "missing or invalid payload" }, { status: 400 });
  }

  // Graceful: no key configured → tell the client to keep showing the numbers.
  if (!groqEnabled || !groq) {
    return NextResponse.json(
      { error: "explanation service not configured", explanation: null },
      { status: 503 },
    );
  }

  const depth: GroqDepth = body.depth === "fast" ? "fast" : "deep";
  const model = GROQ_MODELS[depth];

  try {
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 320,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Explain the following computed figures to an analyst. Use only these numbers.\n\n${formatPayload(payload)}`,
        },
      ],
    });

    const explanation = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!explanation) {
      return NextResponse.json(
        { error: "empty completion", explanation: null },
        { status: 502 },
      );
    }
    return NextResponse.json({ explanation, tier: model });
  } catch (err) {
    // groq down / rate-limited / network — never crash the UI.
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: `explanation unavailable: ${message}`, explanation: null },
      { status: 502 },
    );
  }
}
