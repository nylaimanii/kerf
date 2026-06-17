// ─────────────────────────────────────────────────────────────────────────────
// SOURCES & HONESTY NOTE — facilities
//
// This file is built ENTIRELY from public knowledge: company expansion
// announcements, earnings-call commentary, trade press, and analyst coverage
// (e.g. TrendForce / sell-side estimates as widely reported). It is NOT real
// allocation data and contains no confidential or first-party capacity figures.
//
// Why nothing here is "disclosed":
//   Advanced-packaging capacity (CoWoS, SoIC, InFO, HBM stacking) is almost
//   never disclosed at a clean per-facility monthly number. Companies give
//   DIRECTIONAL guidance ("we will more than double CoWoS capacity in 2025")
//   but not plant-level wafer counts. So:
//     - "estimated" = a rounded plant-level figure inferred from public
//        reporting / analyst totals. Treat as order-of-magnitude, not exact.
//     - "modeled"   = OUR split of an estimated company-wide total across the
//        specific lines we list. The softest grade. Always noted.
//   Zero capacity figures in this file are labeled "disclosed", on purpose.
//
// The facility NAMES and LOCATIONS are real and publicly reported; it is the
// per-line capacity NUMBERS that are estimated/modeled.
// ─────────────────────────────────────────────────────────────────────────────

import type { PackagingFacility } from "@/lib/types";

export const facilities: PackagingFacility[] = [
  // ── TSMC — the CoWoS bottleneck. Total CoWoS capacity is widely estimated by
  //    analysts at roughly ~70-80k wafers/mo exiting 2025; TSMC itself only
  //    gives directional "more than doubling" commentary. The per-AP-fab splits
  //    below are OUR model of that estimated total, hence "modeled".
  {
    id: "tsmc-ap6-chiayi",
    operator: "TSMC",
    name: "AP6/AP7 — Chiayi Science Park",
    country: "Taiwan",
    technology: "CoWoS-L",
    monthlyCapacity: {
      value: 25000,
      provenance: {
        source:
          "TSMC Chiayi advanced-packaging expansion announcements + analyst CoWoS total estimates",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "Newest large CoWoS-L capacity; our split of the estimated ~70-80k wafers/mo TSMC CoWoS total. Order-of-magnitude only.",
      },
    },
    capacityUnit: "wafers/mo",
  },
  {
    id: "tsmc-ap5-zhunan",
    operator: "TSMC",
    name: "AP5 — Zhunan, Miaoli",
    country: "Taiwan",
    technology: "CoWoS-S",
    monthlyCapacity: {
      value: 20000,
      provenance: {
        source: "Analyst CoWoS capacity estimates (as widely reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "Established CoWoS-S line; modeled split of TSMC's estimated CoWoS total.",
      },
    },
    capacityUnit: "wafers/mo",
  },
  {
    id: "tsmc-ap3-longtan",
    operator: "TSMC",
    name: "AP3 — Longtan, Taoyuan",
    country: "Taiwan",
    technology: "InFO",
    monthlyCapacity: {
      value: 15000,
      provenance: {
        source: "Analyst advanced-packaging estimates (as widely reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "Older AP site, InFO + some CoWoS; modeled figure.",
      },
    },
    capacityUnit: "wafers/mo",
  },
  {
    id: "tsmc-ap8-tainan",
    operator: "TSMC",
    name: "AP8 — Tainan",
    country: "Taiwan",
    technology: "SoIC",
    monthlyCapacity: {
      value: 10000,
      provenance: {
        source:
          "TSMC SoIC / 3D Fabric expansion commentary + analyst estimates",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "SoIC (3D stacking) capacity, smaller than CoWoS lines; modeled.",
      },
    },
    capacityUnit: "wafers/mo",
  },

  // ── Amkor — leading OSAT, real second source for advanced packaging.
  {
    id: "amkor-bacninh-vn",
    operator: "Amkor",
    name: "Bac Ninh advanced packaging campus",
    country: "Vietnam",
    technology: "InFO",
    monthlyCapacity: {
      value: 8000,
      provenance: {
        source: "Amkor Vietnam facility announcements + trade press",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "Amkor does not disclose plant-level wafer capacity; rounded estimate of advanced-packaging-equivalent output.",
      },
    },
    capacityUnit: "wafers/mo",
  },
  {
    id: "amkor-peoria-az",
    operator: "Amkor",
    name: "Peoria advanced packaging fab",
    country: "USA",
    technology: "CoWoS-S",
    monthlyCapacity: {
      value: 3000,
      provenance: {
        source: "Amkor ~$2B Peoria, Arizona advanced-packaging announcement",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "ANNOUNCED / RAMPING — not yet at volume (production targeted later this decade). Placeholder near-term figure; treat as ~0 today.",
      },
    },
    capacityUnit: "wafers/mo",
  },

  // ── Samsung — 2.5D I-Cube (its CoWoS analog), mapped into the CoWoS-S bucket
  //    so it's comparable in the model. Tech label is an approximation; note says so.
  {
    id: "samsung-cheonan-kr",
    operator: "Samsung",
    name: "Cheonan advanced packaging (I-Cube)",
    country: "South Korea",
    technology: "CoWoS-S",
    monthlyCapacity: {
      value: 8000,
      provenance: {
        source: "Samsung AVP (Advanced Package) commentary + analyst estimates",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "Samsung's tech is I-Cube (2.5D), not CoWoS; mapped to the CoWoS-S bucket for comparison. Capacity is a rough estimate.",
      },
    },
    capacityUnit: "wafers/mo",
  },

  // ── Intel Foundry — Foveros (3D) / EMIB (2.5D), mapped to the SoIC bucket.
  {
    id: "intel-riorancho-nm",
    operator: "Intel",
    name: "Fab 9 / advanced packaging — Rio Rancho, New Mexico",
    country: "USA",
    technology: "SoIC",
    monthlyCapacity: {
      value: 5000,
      provenance: {
        source: "Intel Foundry Foveros/EMIB advanced-packaging commentary",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "Foveros/EMIB mapped to the SoIC (3D) bucket; serves Intel + foundry customers. Rough estimate.",
      },
    },
    capacityUnit: "wafers/mo",
  },

  // ── HBM stacking — the memory half of the bottleneck. Output is in DRAM
  //    stacks, not interposer wafers, so capacityUnit differs. HBM unit output
  //    is NOT cleanly disclosed; these are heavily rounded estimates.
  {
    id: "skhynix-icheon-kr",
    operator: "SK hynix",
    name: "Icheon / Cheongju HBM stacking",
    country: "South Korea",
    technology: "HBM-stack",
    monthlyCapacity: {
      value: 300000,
      provenance: {
        source: "SK hynix HBM leadership commentary + analyst HBM output estimates",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "HBM market leader. Stacks/mo is a very rough estimate — companies report HBM in revenue/bit share, not clean unit counts.",
      },
    },
    capacityUnit: "stacks/mo",
  },
  {
    id: "micron-taichung-tw",
    operator: "Micron",
    name: "Taichung HBM assembly",
    country: "Taiwan",
    technology: "HBM-stack",
    monthlyCapacity: {
      value: 100000,
      provenance: {
        source: "Micron HBM ramp commentary + analyst estimates",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "Smaller HBM share than SK hynix/Samsung. Stacks/mo is a rough estimate, same caveat as above.",
      },
    },
    capacityUnit: "stacks/mo",
  },
];
