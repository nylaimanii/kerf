// ─────────────────────────────────────────────────────────────────────────────
// SOURCES & HONESTY NOTE — chips
//
// Built from PUBLIC reporting. Chip names, vendors, and the GENERAL packaging +
// HBM dependencies are well established in public coverage (spec sheets, launch
// disclosures, teardown/analyst reporting). The specific FACILITY links
// (dependsOn) are OUR mapping of each chip to the lines in facilities.ts that
// run the matching technology — a modeling choice, not a disclosed supply route.
//
// No Tracked<number> values live here (dependsOn is structure, not a metric), so
// there is no capacity figure to grade — but the dependency MAPPING is modeled.
// This is not real supply-chain routing data.
// ─────────────────────────────────────────────────────────────────────────────

import type { Chip } from "@/lib/types";

export const chips: Chip[] = [
  {
    id: "nvda-h100",
    name: "H100",
    vendor: "NVIDIA",
    dependsOn: ["tsmc-ap5-zhunan", "skhynix-icheon-kr"],
    notes:
      "CoWoS-S interposer + HBM3. Mapped to TSMC CoWoS-S and SK hynix HBM — the historically reported supply base.",
  },
  {
    id: "nvda-h200",
    name: "H200",
    vendor: "NVIDIA",
    dependsOn: ["tsmc-ap5-zhunan", "skhynix-icheon-kr", "micron-taichung-tw"],
    notes:
      "Same CoWoS-S package as H100 but higher HBM3E content; HBM dual-sourced SK hynix + Micron per public reporting.",
  },
  {
    id: "nvda-b200",
    name: "B200 (Blackwell)",
    vendor: "NVIDIA",
    dependsOn: ["tsmc-ap6-chiayi", "skhynix-icheon-kr", "micron-taichung-tw"],
    notes:
      "Dual-die, large package — needs CoWoS-L (larger interposer), mapped to the Chiayi CoWoS-L line. HBM3E from SK hynix + Micron.",
  },
  {
    id: "amd-mi300x",
    name: "MI300X",
    vendor: "AMD",
    dependsOn: ["tsmc-ap5-zhunan", "tsmc-ap8-tainan", "skhynix-icheon-kr"],
    notes:
      "3.5D design: SoIC (3D stacking) on top of a CoWoS base, plus HBM3. Mapped to TSMC CoWoS-S + SoIC (Tainan) and SK hynix HBM.",
  },
  {
    id: "google-tpu-v5",
    name: "TPU v5p / Trillium",
    vendor: "Google",
    dependsOn: ["tsmc-ap6-chiayi", "skhynix-icheon-kr"],
    notes:
      "Google TPU is a Broadcom-designed ASIC built at TSMC with CoWoS + HBM. Facility links are modeled to the CoWoS-L line + SK hynix HBM.",
  },
  {
    id: "amzn-trainium2",
    name: "Trainium2",
    vendor: "Amazon",
    dependsOn: ["tsmc-ap5-zhunan", "skhynix-icheon-kr"],
    notes:
      "AWS in-house accelerator (Marvell/Alchip-assisted) on TSMC CoWoS-class packaging + HBM. Facility links modeled.",
  },
];
