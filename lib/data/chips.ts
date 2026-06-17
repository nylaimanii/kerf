// ─────────────────────────────────────────────────────────────────────────────
// SOURCES & HONESTY NOTE — chips
//
// Built from PUBLIC reporting. Chip names, vendors, and the GENERAL packaging +
// HBM sourcing are well established in public coverage (spec sheets, launch
// disclosures, teardown/analyst reporting). What is MODELED is the numeric
// WEIGHT on each dependency — how much of a chip's supply exposure routes
// through a given facility. No vendor discloses exact sourcing magnitudes, so
// every weight is a Tracked<number> graded estimated/modeled, never "disclosed".
// Weights for each chip are authored to sum to ~1.0.
//
// Per-chip reasoning (what's grounded vs modeled):
//   H100   — packages on TSMC CoWoS-S; HBM3 led near-exclusively by SK hynix in
//            the Hopper era. Most single-sourced of the set. Routing well
//            reported; the 0.62/0.38 packaging-vs-HBM split is modeled.
//   H200   — same CoWoS-S package; HBM3E dual-sourced SK hynix + Micron (Micron
//            HBM into H200 is reported). SK-hynix-leaning split is modeled.
//   B200   — CoWoS-L, which is effectively TSMC-EXCLUSIVE (no second source for
//            the large interposer) → its standout Taiwan exposure is structural,
//            not invented. HBM3E SK hynix + a larger Micron share than H200.
//   MI300X — 3.5D design: TSMC SoIC stacked on a TSMC CoWoS base (TWO TSMC
//            packaging steps) + SK hynix HBM3. Its concentration shows up as
//            single-OPERATOR (TSMC), not just single-country.
//   TPU    — Broadcom-designed, built at TSMC but the hyperscaler-ASIC world
//            deliberately multi-sources OSATs (Broadcom is a major Amkor
//            customer). Modeled Amkor diversification makes it the LEAST
//            concentrated — it does not trip the SPOF threshold.
//   Train2 — AWS/Marvell ASIC, mostly TSMC + SK hynix but with some OSAT
//            diversification. Lands below the threshold too.
//
// THINNEST SPOTS (most modeled, least directly reported): the Amkor
// diversification weights on TPU and Trainium2, and all HBM split magnitudes.
// These are flagged "modeled" with notes.
// ─────────────────────────────────────────────────────────────────────────────

import type { Chip, ChipDependency, Confidence } from "@/lib/types";

// small helper to keep the weight literals readable
function dep(
  facilityId: string,
  value: number,
  confidence: Confidence,
  note: string,
): ChipDependency {
  return {
    facilityId,
    weight: {
      value,
      provenance: {
        source: "public sourcing reporting + kerf supply model",
        confidence,
        asOf: "2025-12-31",
        note,
      },
    },
  };
}

export const chips: Chip[] = [
  {
    id: "nvda-h100",
    name: "H100",
    vendor: "NVIDIA",
    dependsOn: [
      dep(
        "tsmc-ap5-zhunan",
        0.62,
        "estimated",
        "CoWoS-S at TSMC, effectively sole-source packaging for Hopper; weight rounded.",
      ),
      dep(
        "skhynix-icheon-kr",
        0.38,
        "estimated",
        "HBM3 led near-exclusively by SK hynix in the Hopper era; weight rounded.",
      ),
    ],
    notes:
      "Most single-sourced part of the set: TSMC CoWoS-S + SK hynix HBM3. ~62% Taiwan / ~62% TSMC.",
  },
  {
    id: "nvda-h200",
    name: "H200",
    vendor: "NVIDIA",
    dependsOn: [
      dep(
        "tsmc-ap5-zhunan",
        0.6,
        "estimated",
        "Same CoWoS-S package as H100, at TSMC; weight rounded.",
      ),
      dep(
        "skhynix-icheon-kr",
        0.3,
        "modeled",
        "Primary HBM3E source; SK-hynix-vs-Micron split is not disclosed — modeled.",
      ),
      dep(
        "micron-taichung-tw",
        0.1,
        "modeled",
        "Micron HBM3E qualified into H200 (reported); share modeled. Micron HBM assembly sits in Taiwan, adding to Taiwan exposure.",
      ),
    ],
    notes:
      "CoWoS-S + dual-sourced HBM3E (SK hynix + Micron). ~70% Taiwan (Micron HBM is Taiwan-based).",
  },
  {
    id: "nvda-b200",
    name: "B200 (Blackwell)",
    vendor: "NVIDIA",
    dependsOn: [
      dep(
        "tsmc-ap6-chiayi",
        0.6,
        "estimated",
        "CoWoS-L is effectively TSMC-exclusive (no second source for the large interposer) — structural Taiwan lock; weight rounded.",
      ),
      dep(
        "skhynix-icheon-kr",
        0.24,
        "modeled",
        "Primary Blackwell HBM3E; split magnitude modeled.",
      ),
      dep(
        "micron-taichung-tw",
        0.16,
        "modeled",
        "Larger Micron HBM3E role in Blackwell than H200 (reported); share modeled. Taiwan-based assembly.",
      ),
    ],
    notes:
      "Highest-risk standout: CoWoS-L TSMC-exclusive + Taiwan-based Micron HBM. ~76% Taiwan.",
  },
  {
    id: "amd-mi300x",
    name: "MI300X",
    vendor: "AMD",
    dependsOn: [
      dep(
        "tsmc-ap8-tainan",
        0.35,
        "modeled",
        "SoIC (3D stacking) step of the 3.5D design, at TSMC; SoIC-vs-CoWoS split modeled.",
      ),
      dep(
        "tsmc-ap5-zhunan",
        0.3,
        "modeled",
        "CoWoS base of the 3.5D design, at TSMC; split modeled.",
      ),
      dep(
        "skhynix-icheon-kr",
        0.35,
        "estimated",
        "MI300 launched on SK hynix HBM3 (reported); weight rounded.",
      ),
    ],
    notes:
      "Two TSMC packaging steps (SoIC + CoWoS) → single-OPERATOR concentration. ~65% TSMC / ~65% Taiwan.",
  },
  {
    id: "google-tpu-v5",
    name: "TPU v5p / Trillium",
    vendor: "Google",
    dependsOn: [
      dep(
        "tsmc-ap6-chiayi",
        0.4,
        "modeled",
        "Broadcom-designed TPU built at TSMC CoWoS (reported); weight modeled.",
      ),
      dep(
        "amkor-bacninh-vn",
        0.2,
        "modeled",
        "THIN: hyperscaler ASICs deliberately multi-source OSATs and Broadcom is a major Amkor customer — but TPU-specific Amkor routing is inferred, not reported. Modeled.",
      ),
      dep(
        "skhynix-icheon-kr",
        0.4,
        "modeled",
        "HBM sourced from SK hynix (and others); share modeled.",
      ),
    ],
    notes:
      "Most diversified: TSMC + Amkor (Vietnam) packaging + Korea HBM. ~40% top exposure — does NOT trip the SPOF threshold.",
  },
  {
    id: "amzn-trainium2",
    name: "Trainium2",
    vendor: "Amazon",
    dependsOn: [
      dep(
        "tsmc-ap5-zhunan",
        0.55,
        "modeled",
        "AWS/Marvell ASIC on TSMC CoWoS-class packaging (reported); weight modeled.",
      ),
      dep(
        "amkor-bacninh-vn",
        0.1,
        "modeled",
        "THIN: some OSAT diversification assumed for AWS silicon; inferred, not reported. Modeled.",
      ),
      dep(
        "skhynix-icheon-kr",
        0.35,
        "modeled",
        "HBM from SK hynix; share modeled.",
      ),
    ],
    notes:
      "Mostly TSMC + SK hynix with light OSAT diversification. ~55% top exposure — below the SPOF threshold.",
  },
];
