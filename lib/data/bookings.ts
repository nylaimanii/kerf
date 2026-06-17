// ─────────────────────────────────────────────────────────────────────────────
// SOURCES & HONESTY NOTE — bookings (allocation signals)
//
// Built from PUBLIC reporting only. These are NOT real booking contracts — no
// company discloses customer-level capacity shares. They are the widely
// reported allocation SIGNALS ("NVIDIA holds the majority of TSMC CoWoS",
// "CoWoS booked/sold out through 2026", "NVIDIA takes most of SK hynix HBM3E
// output") rendered as numbers so the model can reason about them.
//
// Confidence grades here:
//   - "estimated" = a share/year directly supported by repeated public
//        reporting (still rounded; not first-party).
//   - "modeled"   = OUR allocation of capacity across customers, consistent
//        with public framing but not individually reported. The softest grade.
//   Nothing here is "disclosed" — customer allocation shares are never disclosed.
//
// sharePct is the customer's share of THAT facility's capacity. Shares per
// facility are illustrative and need not sum to 100 (unbooked headroom exists).
// ─────────────────────────────────────────────────────────────────────────────

import type { Booking } from "@/lib/types";

export const bookings: Booking[] = [
  // ── NVIDIA — the dominant CoWoS buyer. Trade press / analysts repeatedly put
  //    NVIDIA at roughly half-or-more of TSMC CoWoS. Split across CoWoS lines.
  {
    id: "bk-nvda-chiayi",
    facilityId: "tsmc-ap6-chiayi",
    customer: "NVIDIA",
    sharePct: {
      value: 55,
      provenance: {
        source:
          "Widely reported NVIDIA ~50-60% share of TSMC CoWoS (analyst/trade press)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "NVIDIA's CoWoS dominance is well reported; the per-line split is ours.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "TSMC CoWoS widely reported booked/sold out into 2026",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },
  {
    id: "bk-nvda-zhunan",
    facilityId: "tsmc-ap5-zhunan",
    customer: "NVIDIA",
    sharePct: {
      value: 50,
      provenance: {
        source: "NVIDIA dominant CoWoS share (analyst/trade press)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "Modeled per-line allocation.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "TSMC CoWoS booked into 2026 (reported)",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },

  // ── AMD — MI300/MI325 CoWoS allocation, second after NVIDIA.
  {
    id: "bk-amd-zhunan",
    facilityId: "tsmc-ap5-zhunan",
    customer: "AMD",
    sharePct: {
      value: 15,
      provenance: {
        source: "AMD Instinct MI300-series CoWoS demand (reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "AMD is a known CoWoS customer; share is modeled.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "CoWoS booked into 2026 (reported)",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },
  {
    id: "bk-amd-chiayi",
    facilityId: "tsmc-ap6-chiayi",
    customer: "AMD",
    sharePct: {
      value: 12,
      provenance: {
        source: "AMD CoWoS-L demand for MI300-series (reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "Modeled per-line allocation.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "CoWoS booked into 2026 (reported)",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },

  // ── Apple — the dominant InFO customer at TSMC (its SoC packaging), not a
  //    CoWoS competitor for AI accelerators but a real claim on AP capacity.
  {
    id: "bk-aapl-longtan",
    facilityId: "tsmc-ap3-longtan",
    customer: "Apple",
    sharePct: {
      value: 60,
      provenance: {
        source: "Apple is the anchor InFO customer at TSMC (long reported)",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "Apple's InFO anchor role is well established; share rounded.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "Ongoing annual SoC volume (modeled forward)",
        confidence: "modeled",
        asOf: "2025-12-31",
      },
    },
  },

  // ── Merchant-ASIC buyers — Broadcom (Google TPU / Meta MTIA), Amazon
  //    (Trainium/Inferentia). Real CoWoS claimants beyond NVIDIA/AMD.
  {
    id: "bk-avgo-chiayi",
    facilityId: "tsmc-ap6-chiayi",
    customer: "Broadcom",
    sharePct: {
      value: 10,
      provenance: {
        source: "Broadcom custom-AI-ASIC CoWoS demand (Google TPU, Meta) reported",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "Broadcom is a known CoWoS user for hyperscaler ASICs; share modeled.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "CoWoS booked into 2026 (reported)",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },
  {
    id: "bk-amzn-zhunan",
    facilityId: "tsmc-ap5-zhunan",
    customer: "Amazon",
    sharePct: {
      value: 8,
      provenance: {
        source: "AWS Trainium/Inferentia advanced-packaging demand (reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "AWS in-house silicon uses CoWoS-class packaging; share modeled.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "Multi-year hyperscaler silicon programs (modeled forward)",
        confidence: "modeled",
        asOf: "2025-12-31",
      },
    },
  },

  // ── HBM allocation — the memory side. NVIDIA reportedly absorbs the majority
  //    of SK hynix HBM3E output; this is the second chokepoint after CoWoS.
  {
    id: "bk-nvda-skhynix-hbm",
    facilityId: "skhynix-icheon-kr",
    customer: "NVIDIA",
    sharePct: {
      value: 60,
      provenance: {
        source:
          "NVIDIA reported to take the majority of SK hynix HBM3E output (analyst/trade press)",
        confidence: "estimated",
        asOf: "2025-12-31",
        note: "NVIDIA's outsized HBM claim is repeatedly reported; share rounded.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "SK hynix HBM widely reported sold out into 2026",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },
  {
    id: "bk-amd-skhynix-hbm",
    facilityId: "skhynix-icheon-kr",
    customer: "AMD",
    sharePct: {
      value: 15,
      provenance: {
        source: "AMD MI300-series HBM3E sourcing from SK hynix (reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "AMD is a known SK hynix HBM customer; share modeled.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "HBM sold out into 2026 (reported)",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },
  {
    id: "bk-nvda-micron-hbm",
    facilityId: "micron-taichung-tw",
    customer: "NVIDIA",
    sharePct: {
      value: 40,
      provenance: {
        source: "Micron HBM3E qualified into NVIDIA platforms (reported)",
        confidence: "modeled",
        asOf: "2025-12-31",
        note: "NVIDIA is diversifying HBM supply to Micron; share modeled.",
      },
    },
    throughYear: {
      value: 2026,
      provenance: {
        source: "Micron HBM reported sold out into 2026",
        confidence: "estimated",
        asOf: "2025-12-31",
      },
    },
  },
];
