// ─────────────────────────────────────────────────────────────────────────────
// Concentration — how few hands hold the supply.
//
// Pure, deterministic. The Herfindahl-Hirschman Index (HHI) is the standard
// regulator's measure of market concentration: the sum of squared percentage
// market shares. A monopoly (one player at 100%) = 100² = 10,000. Four equal
// players (25% each) = 4 × 25² = 2,500.
// ─────────────────────────────────────────────────────────────────────────────

import type { PackagingFacility } from "@/lib/types";
import { type Confidence, weakestConfidence } from "./confidence";

export type ConcentrationLabel =
  | "competitive"
  | "moderate"
  | "concentrated"
  | "highly concentrated";

/**
 * Herfindahl-Hirschman Index. Input is a list of PERCENTAGE shares (0–100).
 * Returns the sum of squared shares on the standard 0–10,000 scale.
 *
 * Note: we do NOT renormalize. If callers pass shares that sum to 100 (as the
 * helpers below do), the result is the textbook HHI.
 */
export function hhi(shares: number[]): number {
  return shares.reduce((sum, s) => sum + s * s, 0);
}

/**
 * Map an HHI to a label. Thresholds adapted from the US DOJ/FTC guidelines
 * (<1500 unconcentrated, 1500–2500 moderately concentrated, >2500 highly
 * concentrated), split into four bands so "highly concentrated" is reserved
 * for the genuinely extreme top end:
 *   <1500          competitive
 *   1500–2500      moderate
 *   2500–5000      concentrated
 *   >5000          highly concentrated
 */
export function concentrationLabel(value: number): ConcentrationLabel {
  if (value < 1500) return "competitive";
  if (value < 2500) return "moderate";
  if (value < 5000) return "concentrated";
  return "highly concentrated";
}

export interface OperatorConcentration {
  hhi: number;
  label: ConcentrationLabel;
  /** Operator → percentage share of total capacity in the pool. */
  byOperator: Record<string, number>;
  totalCapacity: number;
  /** "wafers/mo", "stacks/mo", or "mixed" if the pool spans incompatible units. */
  capacityUnit: string;
  /** True if the passed facilities mix capacity units (e.g. wafers + stacks),
   *  in which case the share math sums incompatible quantities — read with care. */
  mixedUnits: boolean;
  /** Weakest provenance confidence among the facility capacities consumed. */
  weakestInput: Confidence;
}

/**
 * Concentration of packaging supply ACROSS OPERATORS, weighted by capacity.
 *
 * Honesty note: capacity is summed in its native unit. If you pass facilities
 * with mixed units (CoWoS wafers/mo + HBM stacks/mo), the larger-unit facilities
 * dominate the shares as an artifact — so we flag `mixedUnits` and set
 * `capacityUnit: "mixed"`. For a meaningful number, pass one unit-class at a time.
 */
export function operatorConcentration(
  facilities: PackagingFacility[],
): OperatorConcentration {
  const units = new Set(facilities.map((f) => f.capacityUnit));
  const mixedUnits = units.size > 1;

  const capacityByOperator: Record<string, number> = {};
  let total = 0;
  for (const f of facilities) {
    const cap = f.monthlyCapacity.value;
    capacityByOperator[f.operator] = (capacityByOperator[f.operator] ?? 0) + cap;
    total += cap;
  }

  const byOperator: Record<string, number> = {};
  for (const [operator, cap] of Object.entries(capacityByOperator)) {
    byOperator[operator] = total > 0 ? (cap / total) * 100 : 0;
  }

  const value = hhi(Object.values(byOperator));

  return {
    hhi: value,
    label: concentrationLabel(value),
    byOperator,
    totalCapacity: total,
    capacityUnit: mixedUnits ? "mixed" : (facilities[0]?.capacityUnit ?? ""),
    mixedUnits,
    weakestInput: weakestConfidence(
      facilities.map((f) => f.monthlyCapacity.provenance.confidence),
    ),
  };
}
