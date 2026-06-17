// ─────────────────────────────────────────────────────────────────────────────
// The single store — kerf's keystone.
//
// One store holds the domain data + UI state. Every view subscribes to it; the
// engine is invoked ONLY from selectors.ts (never from components, never here).
// This file is pure state — no engine calls, no groq, no API keys.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";

import type {
  Booking,
  Chip,
  DisruptionScenario,
  PackagingFacility,
} from "@/lib/types";
import {
  bookings as seedBookings,
  chips as seedChips,
  facilities as seedFacilities,
} from "@/lib/data";

export interface KerfState {
  // ── loaded domain data (from the honest seeds) ──
  facilities: PackagingFacility[];
  bookings: Booking[];
  chips: Chip[];

  // ── what-if console state ──
  // null  = baseline (the real current world)
  // set   = the perturbed world; selectors recompute against it
  activeScenario: DisruptionScenario | null;

  // ── detail-view selection (for later UI) ──
  selectedChipId: string | null;
  selectedFacilityId: string | null;

  // ── last AI narrative the user generated (so it can travel into the brief).
  // contextKey ties it to the exact state it described, so a stale narrative is
  // never shown for a different scenario. ──
  lastExplanation: {
    contextKey: string;
    kind: string;
    text: string;
    tier: string;
  } | null;

  // ── actions ──
  setScenario: (scenario: DisruptionScenario) => void;
  clearScenario: () => void;
  selectChip: (id: string | null) => void;
  selectFacility: (id: string | null) => void;
  setExplanation: (e: KerfState["lastExplanation"]) => void;
}

export const useKerfStore = create<KerfState>((set) => ({
  facilities: seedFacilities,
  bookings: seedBookings,
  chips: seedChips,

  activeScenario: null,
  selectedChipId: null,
  selectedFacilityId: null,
  lastExplanation: null,

  setScenario: (scenario) => set({ activeScenario: scenario }),
  clearScenario: () => set({ activeScenario: null }),
  selectChip: (id) => set({ selectedChipId: id }),
  selectFacility: (id) => set({ selectedFacilityId: id }),
  setExplanation: (e) => set({ lastExplanation: e }),
}));
