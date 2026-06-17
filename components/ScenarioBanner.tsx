"use client";

import { useKerfStore } from "@/lib/store";

// Compact "a scenario is perturbing these numbers" indicator. When active, the
// dashboard's hero HHI already shows the perturbed value (selectors run on the
// effective world) — this makes that explicit and offers a one-click reset.
export function ScenarioBanner() {
  const activeScenario = useKerfStore((s) => s.activeScenario);
  const clearScenario = useKerfStore((s) => s.clearScenario);

  if (!activeScenario) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose/60 bg-rose/10 px-4 py-3">
      <p className="font-mono text-xs text-rose">
        <span className="font-medium">scenario active</span> · {activeScenario.label}{" "}
        <span className="text-rose/70">
          — numbers below are a modeled projection, not baseline
        </span>
      </p>
      <button
        onClick={() => clearScenario()}
        className="rounded-md border border-rose/50 px-3 py-1 font-mono text-xs text-rose transition-colors hover:bg-rose/15"
      >
        clear scenario
      </button>
    </div>
  );
}
