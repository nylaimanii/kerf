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

/** The three-way honesty grade, extracted for convenience. */
export type Confidence = Provenance["confidence"];

/**
 * THE pattern. A value bound to its provenance.
 * Every capacity, share, and year in kerf is a Tracked<T> — never bare.
 */
export interface Tracked<T> {
  value: T;
  provenance: Provenance;
}

// Open unions: the known advanced-packaging operators keep autocomplete, but the
// engine is general — the 2021 auto case study carries foundry/IDM labels too.
// (`& {}` keeps literal suggestions while allowing any string. No math depends on
// the specific value — it's only ever used as a grouping key / display label.)
export type Operator =
  | "TSMC"
  | "Amkor"
  | "Samsung"
  | "Intel"
  | "SK hynix"
  | "Micron"
  | (string & {});

export type PackagingTechnology =
  | "CoWoS-S"
  | "CoWoS-L"
  | "CoWoS-R"
  | "InFO"
  | "SoIC"
  | "HBM-stack"
  | (string & {}); // open — the 2021 case uses mature-node logic labels

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
  | "Microsoft"
  | (string & {}); // open — the 2021 case uses auto chipmaker labels

export interface Booking {
  id: string;
  facilityId: string;
  customer: Customer;
  sharePct: Tracked<number>; // share of the facility's capacity this customer holds
  throughYear: Tracked<number>; // "booked through" year
}

/**
 * One supply dependency of a chip: a facility it relies on, plus how much of the
 * chip's overall supply exposure routes through it. Weights for a chip are
 * authored to sum to ~1.0, so weight.value reads directly as that facility's
 * share of the chip's supply chain. The weight is always a modeled/estimated
 * split (no vendor discloses exact sourcing magnitudes) — hence Tracked.
 */
export interface ChipDependency {
  facilityId: string;
  weight: Tracked<number>; // share of the chip's supply exposure (0–1)
}

export interface Chip {
  id: string;
  name: string; // e.g. "H100"
  vendor: Customer;
  dependsOn: ChipDependency[]; // weighted facility dependencies
  notes?: string;
}

/** For the what-if console (built later). */
export interface DisruptionScenario {
  id: string;
  label: string;
  facilityId: string;
  capacityDeltaPct: number; // e.g. -30 means a 30% capacity loss at that facility
}
