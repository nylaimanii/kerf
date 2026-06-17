import { describe, expect, it } from "vitest";

import type {
  Booking,
  Chip,
  ChipDependency,
  PackagingFacility,
} from "@/lib/types";
import {
  chips as seedChips,
  facilities as seedFacilities,
  bookings as seedBookings,
} from "@/lib/data";
import {
  concentrationLabel,
  hhi,
  operatorConcentration,
  weakestConfidence,
} from "@/lib/engine";
import { findSPOFs, SPOF_THRESHOLD } from "@/lib/engine/spof";
import { simulateDisruption } from "@/lib/engine/cascade";

// ── small fixture builders ───────────────────────────────────────────────────
const fac = (
  id: string,
  operator: PackagingFacility["operator"],
  country: string,
  value: number,
  confidence: "disclosed" | "estimated" | "modeled" = "disclosed",
  capacityUnit = "wafers/mo",
): PackagingFacility => ({
  id,
  operator,
  name: id,
  country,
  technology: "CoWoS-S",
  capacityUnit,
  monthlyCapacity: {
    value,
    provenance: { source: "test", confidence, asOf: "2026-01-01" },
  },
});

// weighted chip dependency
const wdep = (facilityId: string, weight: number): ChipDependency => ({
  facilityId,
  weight: {
    value: weight,
    provenance: { source: "test", confidence: "modeled", asOf: "2026-01-01" },
  },
});

describe("hhi", () => {
  it("a monopoly is 10,000", () => {
    expect(hhi([100])).toBe(10000);
  });

  it("four equal quarters is 2,500", () => {
    expect(hhi([25, 25, 25, 25])).toBe(2500);
  });

  it("is the sum of squared shares", () => {
    expect(hhi([50, 50])).toBe(5000);
  });
});

describe("concentrationLabel", () => {
  it("bands map as documented", () => {
    expect(concentrationLabel(1000)).toBe("competitive");
    expect(concentrationLabel(2000)).toBe("moderate");
    expect(concentrationLabel(3000)).toBe("concentrated");
    expect(concentrationLabel(6000)).toBe("highly concentrated");
  });
});

describe("weakestConfidence", () => {
  it("modeled is weaker than estimated is weaker than disclosed", () => {
    expect(weakestConfidence(["disclosed", "estimated", "modeled"])).toBe(
      "modeled",
    );
    expect(weakestConfidence(["disclosed", "estimated"])).toBe("estimated");
    expect(weakestConfidence(["disclosed"])).toBe("disclosed");
    expect(weakestConfidence([])).toBe("disclosed");
  });
});

describe("operatorConcentration", () => {
  it("a single operator is a monopoly (HHI 10,000, highly concentrated)", () => {
    const facs = [
      fac("a", "TSMC", "Taiwan", 100),
      fac("b", "TSMC", "Taiwan", 100),
    ];
    const r = operatorConcentration(facs);
    expect(r.byOperator["TSMC"]).toBe(100);
    expect(r.hhi).toBe(10000);
    expect(r.label).toBe("highly concentrated");
    expect(r.mixedUnits).toBe(false);
  });

  it("flags mixed units", () => {
    const facs = [
      fac("a", "TSMC", "Taiwan", 100, "disclosed", "wafers/mo"),
      fac("b", "SK hynix", "South Korea", 100, "disclosed", "stacks/mo"),
    ];
    expect(operatorConcentration(facs).mixedUnits).toBe(true);
    expect(operatorConcentration(facs).capacityUnit).toBe("mixed");
  });
});

describe("findSPOFs", () => {
  const facs = [
    fac("f-tw-1", "TSMC", "Taiwan", 100),
    fac("f-tw-2", "TSMC", "Taiwan", 100),
    fac("f-tw-3", "TSMC", "Taiwan", 100),
    fac("f-kr", "SK hynix", "South Korea", 100, "disclosed", "stacks/mo"),
  ];

  it("trips a chip whose weighted exposure concentrates in one operator/country", () => {
    const chip: Chip = {
      id: "z",
      name: "Z",
      vendor: "NVIDIA",
      dependsOn: [wdep("f-tw-1", 0.5), wdep("f-tw-2", 0.3), wdep("f-tw-3", 0.2)],
    };
    const spofs = findSPOFs([chip], facs, []);
    expect(spofs).toHaveLength(1);
    expect(spofs[0].topOperator).toBe("TSMC");
    expect(spofs[0].topOperatorShare).toBe(1); // all weight on TSMC/Taiwan
    expect(spofs[0].topCountry).toBe("Taiwan");
    expect(spofs[0].reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("reads weights, not counts: a Taiwan-heavy 70/30 split trips on country", () => {
    // 70% weight on a Taiwan facility, 30% on Korea → Taiwan 0.7 > 0.6 threshold,
    // even though it's a 50/50 split BY COUNT.
    const chip: Chip = {
      id: "w",
      name: "W",
      vendor: "NVIDIA",
      dependsOn: [wdep("f-tw-1", 0.7), wdep("f-kr", 0.3)],
    };
    const spofs = findSPOFs([chip], facs, []);
    expect(spofs).toHaveLength(1);
    expect(spofs[0].topCountry).toBe("Taiwan");
    expect(spofs[0].topCountryShare).toBeCloseTo(0.7, 10);
  });

  it("does NOT trip a chip whose top exposure is 50/50 (at, not past, threshold)", () => {
    const chip: Chip = {
      id: "y",
      name: "Y",
      vendor: "NVIDIA",
      dependsOn: [wdep("f-tw-1", 0.5), wdep("f-kr", 0.5)],
    };
    expect(findSPOFs([chip], facs, [])).toHaveLength(0);
  });

  it("seed data: differentiated exposures flag H100/H200/B200/MI300X, not TPU/Trainium2", () => {
    // After differentiating supply geographies, the top exposures spread:
    //   B200 ~76% TW · H200 ~70% TW · MI300X ~65% TSMC · H100 ~62% TW  → trip
    //   Trainium2 ~55% · TPU ~40% (diversified)                        → do not
    const flagged = findSPOFs(seedChips, seedFacilities, seedBookings).map(
      (s) => s.chipId,
    );
    expect(flagged).toContain("nvda-h100");
    expect(flagged).toContain("nvda-h200");
    expect(flagged).toContain("nvda-b200");
    expect(flagged).toContain("amd-mi300x");
    // the diversified hyperscaler ASICs stay below the threshold
    expect(flagged).not.toContain("google-tpu-v5");
    expect(flagged).not.toContain("amzn-trainium2");
  });

  it("seed data: B200 is the highest-exposure standout (~76% Taiwan)", () => {
    const spofs = findSPOFs(seedChips, seedFacilities, seedBookings);
    const b200 = spofs.find((s) => s.chipId === "nvda-b200")!;
    expect(b200.topCountry).toBe("Taiwan");
    expect(b200.topCountryShare).toBeCloseTo(0.76, 10);
    const maxShare = Math.max(
      ...spofs.map((s) => Math.max(s.topCountryShare, s.topOperatorShare)),
    );
    expect(Math.max(b200.topCountryShare, b200.topOperatorShare)).toBe(maxShare);
  });
});

describe("simulateDisruption (cascade)", () => {
  const facilities = [
    fac("A", "TSMC", "Taiwan", 1000, "disclosed", "wafers/mo"),
    fac("B", "SK hynix", "South Korea", 1000, "disclosed", "stacks/mo"),
  ];
  const bookings: Booking[] = [
    {
      id: "bk",
      facilityId: "A",
      customer: "NVIDIA",
      sharePct: {
        value: 50,
        // weaker than the facility's "disclosed" — must surface in the result
        provenance: { source: "test", confidence: "modeled", asOf: "2026-01-01" },
      },
      throughYear: {
        value: 2026,
        provenance: { source: "test", confidence: "estimated", asOf: "2026-01-01" },
      },
    },
  ];
  // Z leans 50% on A; W leans 80% on A — to prove cascade reads the weight.
  const chips: Chip[] = [
    { id: "Z", name: "Z", vendor: "NVIDIA", dependsOn: [wdep("A", 0.5), wdep("B", 0.5)] },
    { id: "W", name: "W", vendor: "AMD", dependsOn: [wdep("A", 0.8), wdep("B", 0.2)] },
  ];

  const result = simulateDisruption("A", -50, { facilities, bookings, chips });

  it("computes direct loss = capacity × lostFraction", () => {
    expect(result.directLoss.lostFraction).toBe(0.5);
    expect(result.directLoss.lostCapacity).toBe(500);
  });

  it("a booked customer loses share × lost capacity", () => {
    expect(result.affectedCustomers).toHaveLength(1);
    expect(result.affectedCustomers[0].lostCapacity).toBe(250); // 50% of 500
  });

  it("a dependent chip's hit scales with its dependency WEIGHT", () => {
    expect(result.affectedChips).toHaveLength(2);
    const z = result.affectedChips.find((c) => c.chipId === "Z")!;
    const w = result.affectedChips.find((c) => c.chipId === "W")!;
    // lostFraction 0.5 × weight 0.5 × 100 = 25%
    expect(z.estimatedCapacityHitPct).toBe(25);
    // lostFraction 0.5 × weight 0.8 × 100 = 40% — heavier reliance, bigger hit
    expect(w.estimatedCapacityHitPct).toBe(40);
  });

  it("rolls up a deterministic systemic severity", () => {
    // pool = wafers/mo only (A); directLoss 500/1000 = 0.5; breadth 2/2 = 1
    // severity = 0.6×0.5 + 0.4×1 = 0.7  → critical
    expect(result.systemicSeverity).toBeCloseTo(0.7, 10);
    expect(result.severityLabel).toBe("critical");
  });

  it("carries the WEAKEST input confidence through the math (honesty)", () => {
    // facility A is disclosed, but the booking share is modeled → modeled wins
    expect(result.weakestInput).toBe("modeled");
  });

  it("throws on an unknown facility", () => {
    expect(() =>
      simulateDisruption("nope", -50, { facilities, bookings, chips }),
    ).toThrow(/unknown facilityId/);
  });

  it("a non-negative delta removes nothing", () => {
    const r = simulateDisruption("A", 10, { facilities, bookings, chips });
    expect(r.directLoss.lostCapacity).toBe(0);
    expect(r.affectedChips.every((c) => c.estimatedCapacityHitPct === 0)).toBe(
      true,
    );
  });
});

describe("SPOF_THRESHOLD", () => {
  it("is documented as 0.6", () => {
    expect(SPOF_THRESHOLD).toBe(0.6);
  });
});
