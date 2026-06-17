// ─────────────────────────────────────────────────────────────────────────────
// KERF — core domain model
//
// The honesty layer is structural. Every meaningful number in kerf is a
// Tracked<number>, never a bare number. A Tracked value cannot exist without
// its Provenance — that is the whole point: you can never read a figure in this
// model without also reading where it came from and how much to trust it.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Where a number came from and how much to trust it.
 *
 * confidence is a strict three-way honesty grade:
 *  - "disclosed" — a real, public, first-party disclosure (earnings call,
 *    filing, official spec sheet). Use ONLY when a genuine disclosure exists.
 *  - "estimated" — a reasonable figure built from public reporting / analyst
 *    coverage, but not a hard first-party number. Round, and say so.
 *  - "modeled"   — inferred or derived by us (e.g. allocation splits implied by
 *    public framing). The softest grade. Always carries a note.
 */
export interface Provenance {
  source: string; // e.g. "TSMC Q4'25 earnings call"
  sourceUrl?: string;
  confidence: "disclosed" | "estimated" | "modeled";
  asOf: string; // ISO date, e.g. "2025-01-16"
  note?: string;
}

/**
 * THE pattern. A value bound to its provenance.
 * Every capacity, share, and year in kerf is a Tracked<T> — never bare.
 */
export interface Tracked<T> {
  value: T;
  provenance: Provenance;
}

export type Operator = "TSMC" | "Amkor" | "Samsung" | "Intel" | "SK hynix" | "Micron";

export type PackagingTechnology =
  | "CoWoS-S"
  | "CoWoS-L"
  | "CoWoS-R"
  | "InFO"
  | "SoIC"
  | "HBM-stack";

export interface PackagingFacility {
  id: string;
  operator: Operator;
  name: string;
  country: string;
  technology: PackagingTechnology;
  monthlyCapacity: Tracked<number>; // in capacityUnit, per month
  capacityUnit: string; // e.g. "wafers/mo" | "stacks/mo"
}

export type Customer =
  | "NVIDIA"
  | "AMD"
  | "Apple"
  | "Google"
  | "Amazon"
  | "Broadcom"
  | "Microsoft";

export interface Booking {
  id: string;
  facilityId: string;
  customer: Customer;
  sharePct: Tracked<number>; // share of the facility's capacity this customer holds
  throughYear: Tracked<number>; // "booked through" year
}

export interface Chip {
  id: string;
  name: string; // e.g. "H100"
  vendor: Customer;
  dependsOn: string[]; // facilityIds this chip's supply depends on
  notes?: string;
}

/** For the what-if console (built later). */
export interface DisruptionScenario {
  id: string;
  label: string;
  facilityId: string;
  capacityDeltaPct: number; // e.g. -30 means a 30% capacity loss at that facility
}
