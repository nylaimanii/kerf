// ─────────────────────────────────────────────────────────────────────────────
// Derived selectors — the ONLY bridge between app state and the engine.
//
// Components never import the engine. They read these selectors, which call the
// pure engine and return ref-stable results. Memoization here is not just for
// speed: zustand v5 uses useSyncExternalStore, which demands that a selector
// return the SAME reference for unchanged state — otherwise it warns / loops.
//
// The baseline-vs-scenario spine:
//   selectEffectiveFacilities() returns the baseline facilities when no scenario
//   is active, or a perturbed copy (one facility's capacity adjusted by the
//   scenario delta) when one is. Concentration, SPOFs, and headroom all build on
//   it — so the what-if console later just sets/clears activeScenario and the
//   whole downstream world recomputes. The cascade RESULT itself runs against
//   baseline data (simulateDisruption computes the loss from current capacity).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Booking,
  DisruptionScenario,
  PackagingFacility,
} from "@/lib/types";
import {
  type CascadeResult,
  type Confidence,
  type ConcentrationLabel,
  type SPOF,
  operatorConcentration,
  findSPOFs,
  simulateDisruption,
  weakestConfidence,
} from "@/lib/engine";
import type { KerfState } from "./useKerfStore";

// ── memoize-one: cache the last call, keyed on shallow Object.is of args ──────
// Inputs are referentially stable (seed arrays are set once; scenario changes by
// reference), so this gives ref-stable outputs across renders for free.
function memoizeArgs<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  let lastArgs: Args | null = null;
  let lastResult: R;
  return (...args: Args): R => {
    if (
      lastArgs !== null &&
      lastArgs.length === args.length &&
      lastArgs.every((a, i) => Object.is(a, args[i]))
    ) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}

// ── effective (baseline OR perturbed) facilities ──────────────────────────────
// Apply a scenario's capacity delta to the one struck facility, preserving its
// Tracked provenance. Memoized on (facilities, scenario) refs so the perturbed
// array has a STABLE reference until either input changes — which keeps every
// downstream memo stable too.
const _effectiveFacilities = memoizeArgs(
  (
    facilities: PackagingFacility[],
    scenario: DisruptionScenario | null,
  ): PackagingFacility[] => {
    if (!scenario) return facilities;
    const factor = Math.max(0, 1 + scenario.capacityDeltaPct / 100);
    return facilities.map((f) =>
      f.id === scenario.facilityId
        ? {
            ...f,
            monthlyCapacity: {
              ...f.monthlyCapacity,
              value: f.monthlyCapacity.value * factor,
            },
          }
        : f,
    );
  },
);

export const selectEffectiveFacilities = (
  state: KerfState,
): PackagingFacility[] =>
  _effectiveFacilities(state.facilities, state.activeScenario);

// ── operator concentration (baseline or perturbed) ───────────────────────────
export interface OperatorConcentrationView {
  hhi: number;
  label: ConcentrationLabel;
  weakestInput: Confidence;
  byOperator: Record<string, number>;
  mixedUnits: boolean;
  /** restricted to a single comparable unit so the headline number is honest */
  capacityUnit: string;
}

// The meaningful concentration number is the packaging (wafers/mo) pool — mixing
// wafer and stack units would let HBM dominate as an artifact. We pick the
// largest single-unit pool to report on.
function computeConcentration(
  facilities: PackagingFacility[],
): OperatorConcentrationView {
  const byUnit = new Map<string, PackagingFacility[]>();
  for (const f of facilities) {
    const arr = byUnit.get(f.capacityUnit) ?? [];
    arr.push(f);
    byUnit.set(f.capacityUnit, arr);
  }
  // pick the pool with the most facilities (the packaging pool in our seed)
  let pool: PackagingFacility[] = facilities;
  let best = -1;
  for (const arr of byUnit.values()) {
    if (arr.length > best) {
      best = arr.length;
      pool = arr;
    }
  }
  const c = operatorConcentration(pool);
  return {
    hhi: c.hhi,
    label: c.label,
    weakestInput: c.weakestInput,
    byOperator: c.byOperator,
    mixedUnits: c.mixedUnits,
    capacityUnit: c.capacityUnit,
  };
}

// Two SEPARATE memo caches so the perturbed and baseline numbers can both be
// read in the same render (the console shows them side by side). Sharing one
// memoize-one cache would thrash when called with two different facility arrays.
const _effConcentration = memoizeArgs(computeConcentration);
const _baseConcentration = memoizeArgs(computeConcentration);

export const selectOperatorConcentration = (
  state: KerfState,
): OperatorConcentrationView =>
  _effConcentration(selectEffectiveFacilities(state));

/** Always the baseline (un-perturbed) concentration, even with a scenario active
 *  — for before→after comparison in the what-if console. */
export const selectBaselineOperatorConcentration = (
  state: KerfState,
): OperatorConcentrationView => _baseConcentration(state.facilities);

// ── single points of failure (baseline or perturbed) ─────────────────────────
const _spofs = memoizeArgs(
  (
    chips: KerfState["chips"],
    facilities: PackagingFacility[],
    bookings: Booking[],
  ): SPOF[] => findSPOFs(chips, facilities, bookings),
);

export const selectSPOFs = (state: KerfState): SPOF[] =>
  _spofs(state.chips, selectEffectiveFacilities(state), state.bookings);

// ── active cascade — runs only when a scenario is set, against baseline data ──
const _cascade = memoizeArgs(
  (
    scenario: DisruptionScenario,
    facilities: PackagingFacility[],
    bookings: Booking[],
    chips: KerfState["chips"],
  ): CascadeResult =>
    simulateDisruption(scenario.facilityId, scenario.capacityDeltaPct, {
      facilities,
      bookings,
      chips,
    }),
);

export const selectActiveCascade = (state: KerfState): CascadeResult | null =>
  state.activeScenario
    ? _cascade(
        state.activeScenario,
        state.facilities,
        state.bookings,
        state.chips,
      )
    : null;

// ── facilities joined with bookings + computed headroom ──────────────────────
export interface FacilityWithBookings {
  facility: PackagingFacility;
  bookings: Booking[];
  bookedPct: number; // sum of customer shares (may exceed 100 if overbooked)
  freePct: number; // 100 - bookedPct, floored at 0
  bookedCapacity: number; // in the facility's capacityUnit
  freeCapacity: number; // floored at 0
  overbooked: boolean;
  weakestInput: Confidence;
}

const _facilitiesWithBookings = memoizeArgs(
  (
    facilities: PackagingFacility[],
    bookings: Booking[],
  ): FacilityWithBookings[] =>
    facilities.map((facility) => {
      const facBookings = bookings.filter((b) => b.facilityId === facility.id);
      const bookedPct = facBookings.reduce((s, b) => s + b.sharePct.value, 0);
      const freePct = Math.max(0, 100 - bookedPct);
      const cap = facility.monthlyCapacity.value;
      const bookedCapacity = cap * (Math.min(bookedPct, 100) / 100);
      const freeCapacity = Math.max(0, cap - bookedCapacity);
      return {
        facility,
        bookings: facBookings,
        bookedPct,
        freePct,
        bookedCapacity,
        freeCapacity,
        overbooked: bookedPct > 100,
        weakestInput: weakestConfidence([
          facility.monthlyCapacity.provenance.confidence,
          ...facBookings.map((b) => b.sharePct.provenance.confidence),
        ]),
      };
    }),
);

export const selectFacilitiesWithBookings = (
  state: KerfState,
): FacilityWithBookings[] =>
  _facilitiesWithBookings(selectEffectiveFacilities(state), state.bookings);
