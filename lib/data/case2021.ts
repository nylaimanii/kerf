// ─────────────────────────────────────────────────────────────────────────────
// SOURCES & HONESTY NOTE — 2021 automotive semiconductor shortage (case study)
//
// This is a HISTORICAL case, a DIFFERENT chip class from kerf's main dataset:
// 2021 was about mature-node (≈28–90nm) automotive microcontrollers, power and
// analog ICs at foundries — NOT CoWoS/HBM advanced packaging. We reconstruct it
// so the SAME deterministic engine can run on it, to show the mechanism is
// general. Three honesty tiers, kept strictly separate:
//
//  • REPORTED (confidence "estimated") — widely reported public/analyst figures.
//    The macro facts: ~$210B of 2021 auto revenue lost and ~7.7M vehicles not
//    built (AlixPartners, 2021, widely reported); a modern vehicle uses ~1,000+
//    chips; chips costing ~$1 idled vehicles worth tens of thousands; TSMC was
//    reported to make a large majority (~70%) of the world's microcontrollers.
//    These are real reporting — but they are estimates, NOT first-party
//    disclosures, so they are graded "estimated", never "disclosed".
//
//  • MODELED (confidence "modeled") — the per-foundry capacities and per-chip
//    dependency WEIGHTS below. No one publishes 2021 auto wafer allocations at
//    this granularity. The STRUCTURE (auto chipmakers outsourcing mature-node
//    MCUs to a concentrated foundry base; IDMs like TI/ST/Infineon running
//    captive fabs) is reported; the magnitudes are kerf's model. "IDM captive"
//    is a modeled AGGREGATE of in-house IDM fabs, not one real plant.
//
//  • TODAY-ANALOGY — drawn in the UI only, never baked into these numbers.
//
// This is not real 2021 allocation data. It is a faithful reconstruction of a
// documented mechanism, with every magnitude marked modeled.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Booking,
  Chip,
  DisruptionScenario,
  PackagingFacility,
  Tracked,
} from "@/lib/types";

const modeled = (note: string) =>
  ({ source: "kerf supply model (2021 case)", confidence: "modeled", asOf: "2021-12-31", note }) as const;

const reported = (source: string, note?: string) =>
  ({ source, confidence: "estimated", asOf: "2021-12-31", note }) as const;

// ── foundries / captive fabs (mature-node, auto-relevant) ────────────────────
export const caseFacilities: PackagingFacility[] = [
  {
    id: "tsmc-mature",
    operator: "TSMC",
    name: "TSMC mature-node (auto logic)",
    country: "Taiwan",
    technology: "mature-node logic",
    capacityUnit: "wafers/mo",
    monthlyCapacity: {
      value: 100000,
      provenance: modeled(
        "TSMC was the dominant mature-node auto foundry; magnitude modeled. (Reported separately: ~70% of MCUs.)",
      ),
    },
  },
  {
    id: "idm-captive",
    operator: "IDM captive",
    name: "IDM captive fabs (Infineon/ST/TI/Renesas in-house)",
    country: "EU / US / Japan",
    technology: "mature-node logic",
    capacityUnit: "wafers/mo",
    monthlyCapacity: {
      value: 60000,
      provenance: modeled(
        "Aggregate of in-house IDM auto fabs — a modeled grouping, not one plant.",
      ),
    },
  },
  {
    id: "umc-mature",
    operator: "UMC",
    name: "UMC mature-node",
    country: "Taiwan",
    technology: "mature-node logic",
    capacityUnit: "wafers/mo",
    monthlyCapacity: { value: 22000, provenance: modeled("Second-source foundry; magnitude modeled.") },
  },
  {
    id: "globalfoundries-mature",
    operator: "GlobalFoundries",
    name: "GlobalFoundries mature-node",
    country: "USA / Singapore",
    technology: "mature-node logic",
    capacityUnit: "wafers/mo",
    monthlyCapacity: { value: 13000, provenance: modeled("Mature-node auto/analog; magnitude modeled.") },
  },
  {
    id: "samsung-mature",
    operator: "Samsung",
    name: "Samsung mature-node (foundry)",
    country: "South Korea",
    technology: "mature-node logic",
    capacityUnit: "wafers/mo",
    monthlyCapacity: { value: 10000, provenance: modeled("Minor auto mature-node share; magnitude modeled.") },
  },
];

// ── auto chip families (vendor = the chipmaker) ──────────────────────────────
// Weights = modeled share of each family's supply routed through that fab. The
// outsourcing-to-TSMC structure is reported; the exact splits are modeled.
const dep = (facilityId: string, value: number, note: string) => ({
  facilityId,
  weight: { value, provenance: modeled(note) } as Tracked<number>,
});

export const caseChips: Chip[] = [
  {
    id: "renesas-mcu",
    name: "Renesas auto MCU",
    vendor: "Renesas",
    dependsOn: [
      dep("tsmc-mature", 0.7, "Renesas reported heavy MCU outsourcing to TSMC; split modeled."),
      dep("umc-mature", 0.3, "Secondary foundry; modeled."),
    ],
    notes: "Heavily single-sourced on TSMC mature node — the canonical 2021 SPOF.",
  },
  {
    id: "nxp-mcu",
    name: "NXP auto MCU",
    vendor: "NXP",
    dependsOn: [
      dep("tsmc-mature", 0.65, "NXP MCU/processor outsourcing to TSMC reported; split modeled."),
      dep("globalfoundries-mature", 0.35, "Secondary foundry; modeled."),
    ],
    notes: "Fabless-leaning; concentrated on TSMC mature node.",
  },
  {
    id: "infineon-power",
    name: "Infineon power/MCU",
    vendor: "Infineon",
    dependsOn: [
      dep("idm-captive", 0.5, "Significant in-house capacity; modeled."),
      dep("tsmc-mature", 0.4, "Outsources some logic to TSMC; modeled."),
      dep("umc-mature", 0.1, "Modeled."),
    ],
    notes: "Partly insulated by captive fabs, but still TSMC-exposed.",
  },
  {
    id: "stmicro-mixed",
    name: "STMicro auto mixed-signal",
    vendor: "STMicro",
    dependsOn: [
      dep("idm-captive", 0.55, "Large in-house fab base; modeled."),
      dep("tsmc-mature", 0.45, "Outsources advanced mature nodes to TSMC; modeled."),
    ],
    notes: "IDM with meaningful captive capacity.",
  },
  {
    id: "ti-analog",
    name: "TI auto analog",
    vendor: "Texas Instruments",
    dependsOn: [
      dep("idm-captive", 0.55, "TI ran predominantly in-house fabs — relatively insulated in 2021; modeled."),
      dep("tsmc-mature", 0.25, "Limited TSMC outsourcing; modeled."),
      dep("globalfoundries-mature", 0.2, "Some US mature-node sourcing; modeled."),
    ],
    notes: "Most diversified — captive-fab heavy and spread across regions, least single-point-exposed.",
  },
];

// ── bookings: chipmaker + consumer-electronics claims on TSMC mature node ─────
// (Consumer electronics reallocation is the documented trigger; shares modeled.)
export const caseBookings: Booking[] = [
  {
    id: "bk-consumer-tsmc",
    facilityId: "tsmc-mature",
    customer: "consumer electronics",
    sharePct: { value: 35, provenance: modeled("Pandemic demand shifted mature-node capacity to consumer electronics — the documented trigger; share modeled.") },
    throughYear: { value: 2021, provenance: reported("Widely reported 2020–21 demand whiplash") },
  },
  {
    id: "bk-renesas-tsmc",
    facilityId: "tsmc-mature",
    customer: "Renesas",
    sharePct: { value: 14, provenance: modeled("Modeled chipmaker allocation.") },
    throughYear: { value: 2021, provenance: modeled("Modeled.") },
  },
  {
    id: "bk-nxp-tsmc",
    facilityId: "tsmc-mature",
    customer: "NXP",
    sharePct: { value: 12, provenance: modeled("Modeled chipmaker allocation.") },
    throughYear: { value: 2021, provenance: modeled("Modeled.") },
  },
];

// The documented trigger, as a kerf scenario: foundry capacity pulled toward
// consumer electronics took ~a third of auto's mature-node supply offline.
export const CASE_SCENARIO: DisruptionScenario = {
  id: "case-2021-tsmc-reallocation",
  label: "TSMC mature-node reallocated to consumer electronics, −30%",
  facilityId: "tsmc-mature",
  capacityDeltaPct: -30,
};

// ── widely-reported macro facts (graded "estimated", never "disclosed") ──────
export interface ReportedFact {
  label: string;
  value: Tracked<number>;
  unit?: string;
  display: string; // pre-formatted headline
}

export const reportedFacts: ReportedFact[] = [
  {
    label: "auto revenue lost in 2021",
    display: "$210B",
    unit: "USD",
    value: {
      value: 210,
      provenance: reported("AlixPartners 2021 forecast (widely reported)", "Lost global automaker revenue, 2021."),
    },
  },
  {
    label: "vehicles not built in 2021",
    display: "~7.7M",
    unit: "vehicles",
    value: {
      value: 7.7,
      provenance: reported("AlixPartners 2021 forecast (widely reported)", "Units in millions."),
    },
  },
  {
    label: "chips in a modern vehicle",
    display: "~1,000+",
    unit: "chips",
    value: {
      value: 1000,
      provenance: reported("Industry / analyst reporting", "Hundreds to well over a thousand per vehicle."),
    },
  },
  {
    label: "TSMC share of microcontrollers",
    display: "~70%",
    unit: "of MCUs",
    value: {
      value: 70,
      provenance: reported("Analyst coverage, widely cited (2021)", "Reported estimate of TSMC's MCU foundry share."),
    },
  },
];
