// ─────────────────────────────────────────────────────────────────────────────
// Single points of failure.
//
// A chip's supply is a SET of facilities it all depends on at once (packaging
// AND memory — conjunctive, not substitutable). We ask: how concentrated is that
// dependency set in one operator, or one country?
//
// HONEST WEIGHTING CHOICE — read this:
//   Each dependency carries an explicit MODELED weight (ChipDependency.weight) =
//   the share of the chip's supply exposure that routes through it. We do NOT
//   weight by facility capacity: the dependent facilities use incompatible units
//   (CoWoS wafers/mo vs HBM stacks/mo), so capacity-weighting would let the
//   larger-unit facility dominate purely as a unit artifact. The per-chip weights
//   live in lib/data/chips.ts and are graded estimated/modeled, never disclosed.
//   topOperatorShare = 0.62 means "~62% of this chip's supply exposure sits with
//   one operator," summed from those weights (normalized to the resolved set).
// ─────────────────────────────────────────────────────────────────────────────

import type { Booking, Chip, PackagingFacility } from "@/lib/types";
import { type Confidence, weakestConfidence } from "./confidence";

/** Default SPOF threshold: flag a chip if any single operator OR country holds
 *  more than this fraction of its dependency set. 0.6 = "most of the chip's
 *  supply dependencies route through one operator/country." */
export const SPOF_THRESHOLD = 0.6;

export interface ChipExposure {
  chipId: string;
  /** Operator → fraction (0–1) of the chip's dependency count. */
  byOperator: Record<string, number>;
  /** Country → fraction (0–1) of the chip's dependency count. */
  byCountry: Record<string, number>;
  topOperator: string | null;
  topOperatorShare: number;
  topCountry: string | null;
  topCountryShare: number;
  /** Weakest provenance among the facility capacities the chip leans on. */
  weakestInput: Confidence;
}

function topEntry(rec: Record<string, number>): [string | null, number] {
  let key: string | null = null;
  let share = 0;
  for (const [k, v] of Object.entries(rec)) {
    if (v > share) {
      key = k;
      share = v;
    }
  }
  return [key, share];
}

/**
 * For one chip: what fraction of its (count-weighted) dependency set sits with a
 * single operator / single country.
 */
export function chipExposure(
  chip: Chip,
  facilities: PackagingFacility[],
  _bookings: Booking[],
): ChipExposure {
  // resolve each weighted dependency to its facility (drop any unknown ids)
  const deps = chip.dependsOn
    .map((d) => {
      const facility = facilities.find((f) => f.id === d.facilityId);
      return facility
        ? {
            facility,
            weight: d.weight.value,
            weightConfidence: d.weight.provenance.confidence,
          }
        : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  // normalize by the resolved weight total so shares stay 0–1 even if a weight
  // resolved away (in seed data the weights already sum to ~1).
  const total = deps.reduce((s, d) => s + d.weight, 0) || 1;

  const byOperator: Record<string, number> = {};
  const byCountry: Record<string, number> = {};

  for (const { facility, weight } of deps) {
    const share = weight / total;
    byOperator[facility.operator] =
      (byOperator[facility.operator] ?? 0) + share;
    byCountry[facility.country] = (byCountry[facility.country] ?? 0) + share;
  }

  const [topOperator, topOperatorShare] = topEntry(byOperator);
  const [topCountry, topCountryShare] = topEntry(byCountry);

  return {
    chipId: chip.id,
    byOperator,
    byCountry,
    topOperator,
    topOperatorShare,
    topCountry,
    topCountryShare,
    // honesty propagates: the exposure rests on BOTH the facility capacities and
    // the modeled dependency weights — surface the weakest of all of them.
    weakestInput: weakestConfidence([
      ...deps.map((d) => d.facility.monthlyCapacity.provenance.confidence),
      ...deps.map((d) => d.weightConfidence),
    ]),
  };
}

export interface SPOF {
  chipId: string;
  chipName: string;
  /** Which dimension tripped: operator concentration, country concentration, or both. */
  reasons: string[];
  topOperator: string | null;
  topOperatorShare: number;
  topCountry: string | null;
  topCountryShare: number;
  exposure: ChipExposure;
}

/**
 * Find every chip whose dependency set is concentrated past the threshold in a
 * single operator or single country. Each result carries WHY.
 */
export function findSPOFs(
  chips: Chip[],
  facilities: PackagingFacility[],
  bookings: Booking[],
  threshold: number = SPOF_THRESHOLD,
): SPOF[] {
  const out: SPOF[] = [];

  for (const chip of chips) {
    const exposure = chipExposure(chip, facilities, bookings);
    const reasons: string[] = [];

    if (exposure.topOperatorShare > threshold && exposure.topOperator) {
      reasons.push(
        `${Math.round(exposure.topOperatorShare * 100)}% of supply exposure on a single operator (${exposure.topOperator})`,
      );
    }
    if (exposure.topCountryShare > threshold && exposure.topCountry) {
      reasons.push(
        `${Math.round(exposure.topCountryShare * 100)}% of supply exposure in a single country (${exposure.topCountry})`,
      );
    }

    if (reasons.length > 0) {
      out.push({
        chipId: chip.id,
        chipName: chip.name,
        reasons,
        topOperator: exposure.topOperator,
        topOperatorShare: exposure.topOperatorShare,
        topCountry: exposure.topCountry,
        topCountryShare: exposure.topCountryShare,
        exposure,
      });
    }
  }

  return out;
}
