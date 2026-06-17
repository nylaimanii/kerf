import { describe, expect, it } from "vitest";

import { formatPayload, validatePayload } from "@/lib/ai/explain-format";

const goodConcentration = {
  kind: "concentration",
  hhi: 5783,
  label: "highly concentrated",
  capacityUnit: "wafers/mo",
  byOperator: { TSMC: 74.5, Amkor: 11.7, Samsung: 8.5, Intel: 5.3 },
  weakestInput: "modeled",
  spofs: [
    { chipName: "B200 (Blackwell)", reasons: ["76% of supply exposure in a single country (Taiwan)"] },
  ],
};

const goodCascade = {
  kind: "cascade",
  trigger: { name: "TSMC AP5", operator: "TSMC", capacityDeltaPct: -50, capacityUnit: "wafers/mo" },
  directLoss: { lostCapacity: 10000, lostFraction: 0.5 },
  systemicSeverity: 0.33,
  severityLabel: "elevated",
  affectedChips: [{ name: "H100", estimatedCapacityHitPct: 31 }],
  weakestInput: "modeled",
  baselineHhi: 5783,
  scenarioHhi: 5400,
};

describe("validatePayload — bad shapes return ok:false (→ clean 400, never a crash)", () => {
  it("rejects byOperator as an array of objects (the latent .toFixed crash)", () => {
    const r = validatePayload({ ...goodConcentration, byOperator: [{ TSMC: 74.5 }] });
    expect(r.ok).toBe(false);
  });

  it("rejects byOperator whose values are objects, not numbers", () => {
    const r = validatePayload({ ...goodConcentration, byOperator: { TSMC: { share: 74.5 } } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/byOperator/);
  });

  it("rejects a cascade missing numeric fields", () => {
    const r = validatePayload({ ...goodCascade, systemicSeverity: "high" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown kind", () => {
    expect(validatePayload({ kind: "nope" }).ok).toBe(false);
    expect(validatePayload(null).ok).toBe(false);
    expect(validatePayload(42).ok).toBe(false);
  });

  it("accepts well-formed cascade and concentration payloads", () => {
    expect(validatePayload(goodCascade).ok).toBe(true);
    expect(validatePayload(goodConcentration).ok).toBe(true);
  });
});

describe("formatPayload — never injects an external number", () => {
  it("concentration text contains NO external HHI threshold / convention", () => {
    const r = validatePayload(goodConcentration);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const text = formatPayload(r.payload);
    expect(text).not.toMatch(/2,?500/); // the leaked figure must be gone
    expect(text).not.toMatch(/regulator/i);
    // the engine's own figures ARE present
    expect(text).toContain("5,783");
    expect(text).toContain("74.5%");
  });

  it("both kinds carry the weakest-confidence line for the model to surface", () => {
    const c = validatePayload(goodCascade);
    const k = validatePayload(goodConcentration);
    expect(c.ok && k.ok).toBe(true);
    if (c.ok) expect(formatPayload(c.payload)).toMatch(/Weakest input confidence.*modeled/);
    if (k.ok) expect(formatPayload(k.payload)).toMatch(/Weakest input confidence.*modeled/);
  });
});
