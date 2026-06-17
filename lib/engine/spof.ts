// ─────────────────────────────────────────────────────────────────────────────
// Single points of failure.
//
// A chip's supply is a SET of facilities it all depends on at once (packaging
// AND memory — conjunctive, not substitutable). We ask: how concentrated is that
// dependency set in one operator, or one country?
//
// HONEST WEIGHTING CHOICE — read this:
//   We weight each dependency EQUALLY (by count), NOT by capacity. The dependent
//   facilities use incompatible units (CoWoS wafers/mo vs HBM stacks/mo), so
//   capacity-weighting would let the larger-unit facility dominate purely as a
//   unit artifact — e.g. a chip would look "Korea-concentrated" only because HBM
//   stacks are counted in bigger numbers than wafers. For conjunctive supply
//   chains, concentration-by-presence is the defensible, unit-clean measure.
//   topOperatorShare = 0.67 means "two of this chip's three dependencies sit with
//   one operator," not a capacity fraction.
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
  const deps = chip.dependsOn
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is PackagingFacility => Boolean(f));

  const n = deps.length;
  const byOperator: Record<string, number> = {};
  const byCountry: Record<string, number> = {};

  for (const f of deps) {
    byOperator[f.operator] = (byOperator[f.operator] ?? 0) + 1 / n;
    byCountry[f.country] = (byCountry[f.country] ?? 0) + 1 / n;
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
    weakestInput: weakestConfidence(
      deps.map((f) => f.monthlyCapacity.provenance.confidence),
    ),
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
        `${Math.round(exposure.topOperatorShare * 100)}% of dependencies on a single operator (${exposure.topOperator})`,
      );
    }
    if (exposure.topCountryShare > threshold && exposure.topCountry) {
      reasons.push(
        `${Math.round(exposure.topCountryShare * 100)}% of dependencies in a single country (${exposure.topCountry})`,
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
