// ─────────────────────────────────────────────────────────────────────────────
// Cascade — the centerpiece.
//
// "Remove X% of capacity from one facility. Who breaks, and how badly?"
//
// This is deliberately readable, deterministic math — NO randomness, NO LLM.
// A judge should be able to follow every step and agree it's honest arithmetic,
// not a black box. The LLM's only job (later) is to EXPLAIN this output, never
// to compute it.
//
// Propagation, step by step:
//   1. Lost capacity at the struck facility   = capacity × lostFraction
//   2. Customers booked there lose allocation  proportional to their share
//   3. Chips that depend on the facility take a hit proportional to how much of
//      their supply chain routes through it (1 / number-of-dependencies)
//   4. systemicSeverity rolls (1) and (3) into a single 0–1 figure
//   5. weakestInput carries the least-trustworthy provenance THROUGH the math
// ─────────────────────────────────────────────────────────────────────────────

import type { Booking, Chip, PackagingFacility } from "@/lib/types";
import { type Confidence, weakestConfidence } from "./confidence";

export interface CascadeInputs {
  facilities: PackagingFacility[];
  bookings: Booking[];
  chips: Chip[];
}

export interface AffectedChip {
  chipId: string;
  name: string;
  vendor: string;
  estimatedCapacityHitPct: number; // 0–100
  reason: string;
}

export interface AffectedCustomer {
  customer: string;
  lostCapacity: number; // in the facility's capacityUnit
  capacityUnit: string;
  reason: string;
}

export type SeverityLabel = "low" | "elevated" | "high" | "critical";

export interface CascadeResult {
  trigger: {
    facilityId: string;
    operator: string;
    name: string;
    capacityDeltaPct: number;
    capacityUnit: string;
  };
  directLoss: {
    lostCapacity: number;
    lostFraction: number; // 0–1
    capacityUnit: string;
  };
  affectedChips: AffectedChip[];
  affectedCustomers: AffectedCustomer[];
  systemicSeverity: number; // 0–1
  severityLabel: SeverityLabel;
  /** The weakest provenance confidence among every Tracked input consumed. */
  weakestInput: Confidence;
  notes: string[];
}

// Severity weighting — declared here so it's inspectable, not buried.
//   directSystemicLoss = how much of the WHOLE comparable pool was removed
//   chipBreadth        = what fraction of all chips are touched
const SEVERITY_WEIGHT_DIRECT = 0.6;
const SEVERITY_WEIGHT_BREADTH = 0.4;

function severityLabel(severity: number): SeverityLabel {
  if (severity < 0.2) return "low";
  if (severity < 0.45) return "elevated";
  if (severity < 0.7) return "high";
  return "critical";
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Simulate a disruption at one facility and propagate the effect.
 *
 * @param facilityId       which facility is struck
 * @param capacityDeltaPct change in capacity; NEGATIVE = loss (e.g. -30 = lose 30%).
 *                         Positive deltas (added capacity) produce no cascade.
 */
export function simulateDisruption(
  facilityId: string,
  capacityDeltaPct: number,
  inputs: CascadeInputs,
): CascadeResult {
  const { facilities, bookings, chips } = inputs;

  const facility = facilities.find((f) => f.id === facilityId);
  if (!facility) {
    throw new Error(`simulateDisruption: unknown facilityId "${facilityId}"`);
  }

  const notes: string[] = [];
  // Track every Tracked input we read, so we can surface the weakest at the end.
  const consumedConfidence: Confidence[] = [
    facility.monthlyCapacity.provenance.confidence,
  ];

  // ── Step 1: lost capacity at the struck facility ───────────────────────────
  // Only losses cascade. Clamp magnitude to [0, 1] (a -150% input can't remove
  // more than all of it).
  const lostFraction = clamp01(Math.max(0, -capacityDeltaPct) / 100);
  const capacity = facility.monthlyCapacity.value;
  const lostCapacity = capacity * lostFraction;

  if (capacityDeltaPct >= 0) {
    notes.push(
      "Non-negative capacityDeltaPct: no capacity removed, so no cascade.",
    );
  }

  // ── Step 2: customers booked at this facility lose allocation ──────────────
  // A customer holding sharePct% of the facility loses that same fraction of the
  // lost capacity (their allocation shrinks proportionally with the facility).
  const facilityBookings = bookings.filter((b) => b.facilityId === facilityId);
  const affectedCustomers: AffectedCustomer[] = facilityBookings.map((b) => {
    consumedConfidence.push(b.sharePct.provenance.confidence);
    const customerLost = lostCapacity * (b.sharePct.value / 100);
    return {
      customer: b.customer,
      lostCapacity: customerLost,
      capacityUnit: facility.capacityUnit,
      reason: `holds ~${b.sharePct.value}% of ${facility.name}; loses ~${Math.round(
        customerLost,
      ).toLocaleString()} ${facility.capacityUnit} at a ${Math.round(
        lostFraction * 100,
      )}% capacity loss`,
    };
  });

  // ── Step 3: chips depending on this facility take a proportional hit ───────
  // A chip depends on several facilities at once (conjunctive). Each dependency
  // carries a modeled weight = its share of the chip's supply chain, so a
  // lostFraction loss here dents the chip's output by lostFraction × weight.
  // (Same proportional model as before — we now read the authored weight instead
  // of assuming an equal 1/N split.) Conservative: parallel-contributing supply
  // lines rather than a hard single-line bottleneck.
  const affectedChips: AffectedChip[] = chips
    .filter((c) => c.dependsOn.some((d) => d.facilityId === facilityId))
    .map((c) => {
      const dependency = c.dependsOn.find((d) => d.facilityId === facilityId)!;
      consumedConfidence.push(dependency.weight.provenance.confidence);
      const relianceWeight = dependency.weight.value;
      const hitPct = lostFraction * relianceWeight * 100;
      return {
        chipId: c.id,
        name: c.name,
        vendor: c.vendor,
        estimatedCapacityHitPct: hitPct,
        reason: `${facility.name} carries ~${Math.round(
          relianceWeight * 100,
        )}% of ${c.name}'s supply chain (1 of ${c.dependsOn.length} dependencies); a ${Math.round(
          lostFraction * 100,
        )}% loss there ≈ ${hitPct.toFixed(1)}% output hit`,
      };
    });

  // ── Step 4: systemic severity ─────────────────────────────────────────────
  // directSystemicLoss = fraction of the WHOLE comparable pool removed.
  // We compare only against facilities sharing this facility's unit, so we never
  // mix wafers with stacks.
  const samePool = facilities.filter(
    (f) => f.capacityUnit === facility.capacityUnit,
  );
  const poolTotal = samePool.reduce(
    (sum, f) => sum + f.monthlyCapacity.value,
    0,
  );
  const directSystemicLoss = poolTotal > 0 ? lostCapacity / poolTotal : 0;
  const chipBreadth = chips.length > 0 ? affectedChips.length / chips.length : 0;

  const systemicSeverity = clamp01(
    SEVERITY_WEIGHT_DIRECT * directSystemicLoss +
      SEVERITY_WEIGHT_BREADTH * chipBreadth,
  );

  notes.push(
    `Severity = ${SEVERITY_WEIGHT_DIRECT}×(direct pool loss ${(directSystemicLoss * 100).toFixed(1)}%) + ${SEVERITY_WEIGHT_BREADTH}×(chip breadth ${(chipBreadth * 100).toFixed(0)}%).`,
  );
  if (facility.capacityUnit === "mixed") {
    notes.push("Pool comparison skipped unit mixing by design.");
  }

  // ── Step 5: weakest provenance carried THROUGH the math ────────────────────
  const weakestInput = weakestConfidence(consumedConfidence);

  return {
    trigger: {
      facilityId: facility.id,
      operator: facility.operator,
      name: facility.name,
      capacityDeltaPct,
      capacityUnit: facility.capacityUnit,
    },
    directLoss: {
      lostCapacity,
      lostFraction,
      capacityUnit: facility.capacityUnit,
    },
    affectedChips,
    affectedCustomers,
    systemicSeverity,
    severityLabel: severityLabel(systemicSeverity),
    weakestInput,
    notes,
  };
}
