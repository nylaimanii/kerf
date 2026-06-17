import { NextResponse } from "next/server";

import { GROQ_MODELS, type GroqDepth, groq, groqEnabled } from "@/lib/ai/groq";
import { formatPayload, validatePayload } from "@/lib/ai/explain-format";

// ─────────────────────────────────────────────────────────────────────────────
// /api/explain — narrate ALREADY-COMPUTED engine output. Never computes.
//
// The request body carries the numbers the deterministic engine produced. This
// route does no math: it validates + formats those exact figures and asks the
// model to explain them, under a system prompt that forbids introducing ANY
// number not in the input — including real-world thresholds/conventions, even
// true ones. If groq is unavailable, it fails gracefully (UI keeps the numbers).
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are KERF's narrator. KERF is a semiconductor advanced-packaging and HBM supply-risk model. The figures you are given have ALREADY been computed by a deterministic engine.

HARD RULES — these define your integrity:
1. Explain ONLY the numbers present in the data provided below.
2. NEVER introduce, estimate, infer, or compute any figure that is not in the input — no new percentages, capacities, shares, dates, counts, or rankings.
3. This explicitly includes EXTERNAL numbers: real-world thresholds, regulatory conventions, industry benchmarks, "commonly cited" or "rule of thumb" figures. Do NOT state any external numeric value even if it is factually accurate (for example, do not mention a numeric HHI threshold for "high concentration"). You may describe a level qualitatively using the label provided, but never attach an external number to it.
4. Never recompute, round differently, or "correct" a number. Quote the figures exactly as given.
5. If the user might want something the data does not contain, say plainly that it is not in this data.
6. Surface confidence honestly. If the inputs are marked "modeled" or "estimated", state that the result rests on modeled/estimated public-data inputs and is a projection, not a certainty or forecast.
7. Tone: calm, precise, analyst. 2–4 sentences. No hype, no investment advice, no dramatic language beyond what the numbers support.

You are commentary on computed facts. The numbers are the truth; you only put them in words.`;

export async function POST(req: Request) {
  let body: { depth?: GroqDepth; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  // Validate the shape up front — a bad payload returns a clean 400 and can
  // never reach a `.toFixed` to crash with a 500/502.
  const result = validatePayload(body.payload);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const payload = result.payload;

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
