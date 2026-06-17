// ─────────────────────────────────────────────────────────────────────────────
// Honesty propagation.
//
// Every engine result that consumes Tracked<T> inputs must surface the WEAKEST
// confidence among those inputs. A cascade computed from one "modeled" number is
// only as trustworthy as that number — the result says so out loud, so the UI
// can render "this rests on modeled data" later.
// ─────────────────────────────────────────────────────────────────────────────

import type { Provenance, Tracked } from "@/lib/types";

export type Confidence = Provenance["confidence"];

// Strongest → weakest. Higher rank = weaker = less trustworthy.
const RANK: Record<Confidence, number> = {
  disclosed: 0,
  estimated: 1,
  modeled: 2,
};

/** The weakest (least trustworthy) confidence in a set. Defaults to "disclosed"
 *  for an empty set (no inputs consumed → nothing to weaken the result). */
export function weakestConfidence(confidences: Confidence[]): Confidence {
  let worst: Confidence = "disclosed";
  for (const c of confidences) {
    if (RANK[c] > RANK[worst]) worst = c;
  }
  return worst;
}

/** Pull the weakest confidence out of a set of Tracked values. */
export function weakestOf(...tracked: Tracked<unknown>[]): Confidence {
  return weakestConfidence(tracked.map((t) => t.provenance.confidence));
}
