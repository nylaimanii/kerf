import { describe, expect, it } from "vitest";

import type { DisruptionScenario } from "@/lib/types";
import {
  bookings as seedBookings,
  chips as seedChips,
  facilities as seedFacilities,
} from "@/lib/data";
import type { KerfState } from "@/lib/store";
import {
  selectActiveCascade,
  selectFacilitiesWithBookings,
  selectOperatorConcentration,
  selectSPOFs,
} from "@/lib/store";

// Build a KerfState without the zustand hook — selectors only read data fields.
function makeState(scenario: DisruptionScenario | null = null): KerfState {
  return {
    facilities: seedFacilities,
    bookings: seedBookings,
    chips: seedChips,
    activeScenario: scenario,
    selectedChipId: null,
    selectedFacilityId: null,
    lastExplanation: null,
    setScenario: () => {},
    clearScenario: () => {},
    selectChip: () => {},
    selectFacility: () => {},
    setExplanation: () => {},
  };
}

const TEST_SCENARIO: DisruptionScenario = {
  id: "t",
  label: "TSMC AP3 −30%",
  facilityId: "tsmc-ap3-longtan",
  capacityDeltaPct: -30,
};

describe("baseline selectors", () => {
  const baseline = makeState(null);

  it("reports the seed operator HHI (~5783, highly concentrated)", () => {
    const c = selectOperatorConcentration(baseline);
    expect(Math.round(c.hhi)).toBe(5783);
    expect(c.label).toBe("highly concentrated");
    expect(c.capacityUnit).toBe("wafers/mo"); // single-unit pool, not mixed
  });

  it("flags the three seed SPOFs", () => {
    const ids = selectSPOFs(baseline).map((s) => s.chipId);
    expect(ids).toContain("nvda-h200");
    expect(ids).toContain("nvda-b200");
    expect(ids).toContain("amd-mi300x");
  });

  it("has no active cascade", () => {
    expect(selectActiveCascade(baseline)).toBeNull();
  });
});

describe("scenario perturbs the selectors", () => {
  const baseline = makeState(null);
  const scenario = makeState(TEST_SCENARIO);

  it("dropping a TSMC line lowers TSMC's share and shifts the HHI", () => {
    const before = selectOperatorConcentration(baseline);
    const after = selectOperatorConcentration(scenario);
    // removing TSMC capacity reduces its dominance → HHI falls
    expect(after.hhi).toBeLessThan(before.hhi);
    expect(after.byOperator["TSMC"]).toBeLessThan(before.byOperator["TSMC"]);
  });

  it("activates the cascade against baseline data", () => {
    const cascade = selectActiveCascade(scenario);
    expect(cascade).not.toBeNull();
    expect(cascade!.trigger.facilityId).toBe("tsmc-ap3-longtan");
    expect(cascade!.directLoss.lostFraction).toBeCloseTo(0.3, 10);
  });

  it("perturbs computed headroom for the struck facility", () => {
    const ap3Before = selectFacilitiesWithBookings(baseline).find(
      (f) => f.facility.id === "tsmc-ap3-longtan",
    )!;
    const ap3After = selectFacilitiesWithBookings(scenario).find(
      (f) => f.facility.id === "tsmc-ap3-longtan",
    )!;
    expect(ap3After.facility.monthlyCapacity.value).toBeCloseTo(
      ap3Before.facility.monthlyCapacity.value * 0.7,
      6,
    );
  });
});

describe("memoization (ref-stability across renders)", () => {
  it("returns the SAME reference for the same state object", () => {
    const s = makeState(null);
    // two reads of the same state must not recompute → identical references
    expect(selectSPOFs(s)).toBe(selectSPOFs(s));
    expect(selectOperatorConcentration(s)).toBe(selectOperatorConcentration(s));
    expect(selectFacilitiesWithBookings(s)).toBe(
      selectFacilitiesWithBookings(s),
    );
  });

  it("a scenario state yields a stable cascade reference", () => {
    const s = makeState(TEST_SCENARIO);
    expect(selectActiveCascade(s)).toBe(selectActiveCascade(s));
  });
});
