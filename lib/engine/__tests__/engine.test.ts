import { describe, expect, it } from "vitest";

import type { Booking, Chip, PackagingFacility } from "@/lib/types";
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

  it("trips a chip whose whole dependency set is one operator/country", () => {
    const chip: Chip = {
      id: "z",
      name: "Z",
      vendor: "NVIDIA",
      dependsOn: ["f-tw-1", "f-tw-2", "f-tw-3"],
    };
    const spofs = findSPOFs([chip], facs, []);
    expect(spofs).toHaveLength(1);
    expect(spofs[0].topOperator).toBe("TSMC");
    expect(spofs[0].topOperatorShare).toBe(1);
    expect(spofs[0].topCountry).toBe("Taiwan");
    expect(spofs[0].reasons.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT trip a chip split 50/50 across two countries", () => {
    const chip: Chip = {
      id: "y",
      name: "Y",
      vendor: "NVIDIA",
      dependsOn: ["f-tw-1", "f-kr"],
    };
    expect(findSPOFs([chip], facs, [])).toHaveLength(0);
  });

  it("seed data flags H200, B200 and MI300X (Taiwan concentration)", () => {
    const flagged = findSPOFs(seedChips, seedFacilities, seedBookings).map(
      (s) => s.chipId,
    );
    expect(flagged).toContain("nvda-h200");
    expect(flagged).toContain("nvda-b200");
    expect(flagged).toContain("amd-mi300x");
    // a 50/50 split chip should NOT be flagged
    expect(flagged).not.toContain("nvda-h100");
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
  const chips: Chip[] = [
    { id: "Z", name: "Z", vendor: "NVIDIA", dependsOn: ["A", "B"] },
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

  it("a dependent chip takes a proportional (1/N) hit", () => {
    expect(result.affectedChips).toHaveLength(1);
    // lostFraction 0.5 × reliance 1/2 × 100 = 25%
    expect(result.affectedChips[0].estimatedCapacityHitPct).toBe(25);
  });

  it("rolls up a deterministic systemic severity", () => {
    // pool = wafers/mo only (A); directLoss 500/1000 = 0.5; breadth 1/1 = 1
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
    expect(r.affectedChips[0].estimatedCapacityHitPct).toBe(0);
  });
});

describe("SPOF_THRESHOLD", () => {
  it("is documented as 0.6", () => {
    expect(SPOF_THRESHOLD).toBe(0.6);
  });
});
