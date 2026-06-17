"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CascadeGraph — the dependency + cascade network.
//
// Design choices (deliberate, noted in the build report):
//  • DETERMINISTIC preset layout. Positions are computed here, not force-laid —
//    so the graph is stable and legible, never a jittery hairball. Facilities are
//    grouped into COUNTRY compound boxes (Taiwan's lines sit together).
//  • Mounted ONCE via cytoscape core (NOT react-cytoscapejs — its per-render
//    element diff resets node classes, which would wipe the hl/dim/struck classes
//    we apply imperatively on hover/selection/scenario). Direct cytoscape keeps
//    the instance untouched across React re-renders.
//  • Scenario / selection / hover are applied imperatively through the cy
//    instance, so nothing ever re-runs the layout.
//  • Risk is rose, structure is green/ink. Edge thickness = dependency weight.
//  • Reads the store/selectors only — no engine or store logic here.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape from "cytoscape";
import type { Core, EventObject, NodeSingular } from "cytoscape";

// cytoscape's CSS option types are stricter than we need; use a light local type
type CyStyle = { selector: string; style: Record<string, unknown> };

import type { Chip, PackagingFacility } from "@/lib/types";
import {
  selectActiveCascade,
  selectSPOFs,
  useKerfStore,
} from "@/lib/store";
import { ConfidenceDot, TrackedValue } from "@/components/TrackedValue";
import type { Confidence } from "@/lib/engine";

// kerf palette (canvas can't read CSS vars — mirror the hex here)
const C = {
  bone: "#FAF8F4",
  ink: "#1A1A1A",
  green: "#1B4332",
  rose: "#C98B9B",
  roseBg: "#F4E4E8",
  line: "#E5E0D8",
  faintBorder: "#CBC4B8",
  edge: "#C2BAA9",
  ink60: "#6B6862",
};

const COUNTRY_ORDER = ["Taiwan", "South Korea", "Vietnam", "USA"];
const BAND_Y: Record<string, number> = {
  Taiwan: 60,
  "South Korea": 340,
  Vietnam: 520,
  USA: 680,
};
const FAC_X0 = 720; // facilities start to the right of the chip column
const FAC_DX = 200; // horizontal gap between facilities in a band
const CHIP_X = 0;
const CHIP_DY = 135;

const countryId = (country: string) =>
  "country-" + country.toLowerCase().replace(/\s+/g, "-");

// keep node labels tight: drop parentheticals and anything after a slash
const shortChip = (name: string) =>
  name.split("/")[0].replace(/\s*\(.*\)\s*/, "").trim();

function facilityLabel(f: PackagingFacility) {
  const ap = f.name.match(/AP\d[\d/]*/)?.[0];
  const head = ap ? `${f.operator} ${ap}` : f.operator;
  return `${head}\n${f.technology}`;
}

// per-unit min–max so wafer fabs and HBM plants size comparably (mixing units
// would let HBM's bigger raw numbers dwarf everything — dishonest sizing).
function facilitySizer(facilities: PackagingFacility[]) {
  const range: Record<string, { min: number; max: number }> = {};
  for (const f of facilities) {
    const v = f.monthlyCapacity.value;
    const r = (range[f.capacityUnit] ??= { min: v, max: v });
    r.min = Math.min(r.min, v);
    r.max = Math.max(r.max, v);
  }
  return (f: PackagingFacility) => {
    const r = range[f.capacityUnit];
    const t = r.max === r.min ? 1 : (f.monthlyCapacity.value - r.min) / (r.max - r.min);
    return 48 + Math.sqrt(t) * 46; // 48–94px
  };
}

interface ElementDef {
  data: Record<string, unknown>;
  position?: { x: number; y: number };
  classes?: string;
}

function buildElements(
  facilities: PackagingFacility[],
  chips: Chip[],
  spofIds: Set<string>,
  spofTop: Map<string, { share: number; kind: string }>,
): ElementDef[] {
  const sizeOf = facilitySizer(facilities);

  // in-degree (how many chips lean on each facility) → hubs
  const inDegree: Record<string, number> = {};
  for (const c of chips)
    for (const d of c.dependsOn)
      inDegree[d.facilityId] = (inDegree[d.facilityId] ?? 0) + 1;

  const els: ElementDef[] = [];

  // country compound parents
  const usedCountries = new Set(facilities.map((f) => f.country));
  for (const country of COUNTRY_ORDER) {
    if (usedCountries.has(country))
      els.push({
        data: { id: countryId(country), label: country, type: "country" },
        classes: "country",
      });
  }

  // facility nodes, banded by country
  for (const country of COUNTRY_ORDER) {
    const inCountry = facilities
      .filter((f) => f.country === country)
      .sort((a, b) => b.monthlyCapacity.value - a.monthlyCapacity.value);
    inCountry.forEach((f, i) => {
      const deg = inDegree[f.id] ?? 0;
      const cls = ["facility"];
      if (deg >= 3) cls.push("hub");
      if (deg === 0) cls.push("unused");
      els.push({
        position: { x: FAC_X0 + i * FAC_DX, y: BAND_Y[country] },
        classes: cls.join(" "),
        data: {
          id: f.id,
          parent: countryId(country),
          type: "facility",
          label: facilityLabel(f),
          sizePx: sizeOf(f),
          inDegree: deg,
          // tooltip payload
          name: f.name,
          operator: f.operator,
          country: f.country,
          tech: f.technology,
          capValue: f.monthlyCapacity.value,
          capUnit: f.capacityUnit,
          capConf: f.monthlyCapacity.provenance.confidence,
          capSource: f.monthlyCapacity.provenance.source,
          capAsOf: f.monthlyCapacity.provenance.asOf,
          capNote: f.monthlyCapacity.provenance.note ?? "",
        },
      });
    });
  }

  // chips: SPOFs first (by exposure desc), then the rest
  const ordered = [...chips].sort((a, b) => {
    const sa = spofTop.get(a.id)?.share ?? -1;
    const sb = spofTop.get(b.id)?.share ?? -1;
    return sb - sa;
  });
  ordered.forEach((c, i) => {
    const isSpof = spofIds.has(c.id);
    const top = spofTop.get(c.id);
    const weakest = weakestWeight(c);
    els.push({
      position: { x: CHIP_X, y: i * CHIP_DY },
      classes: "chip" + (isSpof ? " spof" : ""),
      data: {
        id: c.id,
        type: "chip",
        label: shortChip(c.name),
        sizePx: isSpof ? 62 : 54,
        name: c.name,
        vendor: c.vendor,
        isSpof,
        topShare: top ? Math.round(top.share * 100) : null,
        topKind: top?.kind ?? null,
        weakest,
      },
    });
  });

  // weighted edges
  for (const c of chips)
    for (const d of c.dependsOn) {
      els.push({
        data: {
          id: `${c.id}__${d.facilityId}`,
          source: c.id,
          target: d.facilityId,
          weight: d.weight.value,
          width: 1.3 + d.weight.value * 10, // ~1.5–7.5px, weight differences pop
          hit: 0,
        },
      });
    }

  return els;
}

function weakestWeight(chip: Chip): Confidence {
  const rank: Record<Confidence, number> = {
    disclosed: 0,
    estimated: 1,
    modeled: 2,
  };
  let worst: Confidence = "disclosed";
  for (const d of chip.dependsOn) {
    const c = d.weight.provenance.confidence;
    if (rank[c] > rank[worst]) worst = c;
  }
  return worst;
}

function stylesheet(monoFamily: string): CyStyle[] {
  return [
    {
      selector: "node",
      style: {
        "background-color": C.bone,
        "border-width": 1.5,
        "border-color": C.line,
        label: "data(label)",
        color: C.ink,
        "font-family": monoFamily,
        "font-size": 11,
        "text-wrap": "wrap",
        "text-max-width": "100px",
        "text-valign": "center",
        "text-halign": "center",
      },
    },
    {
      // size only the data nodes (country compounds auto-size from padding)
      selector: "node.facility, node.chip",
      style: { width: "data(sizePx)", height: "data(sizePx)" },
    },
    {
      selector: "node.facility",
      style: { shape: "round-rectangle", "border-color": C.faintBorder },
    },
    {
      selector: "node.hub",
      style: { "border-color": C.green, "border-width": 3 },
    },
    {
      selector: "node.unused",
      style: { opacity: 0.4, "border-style": "dashed" },
    },
    {
      selector: "node.chip",
      style: {
        shape: "ellipse",
        "border-color": C.ink,
        "border-width": 1.5,
        "font-size": 13,
      },
    },
    {
      selector: "node.chip.spof",
      style: {
        "border-color": C.rose,
        "border-width": 2.5,
        "background-color": C.roseBg,
      },
    },
    {
      selector: "node.country",
      style: {
        shape: "round-rectangle",
        "background-color": C.green,
        "background-opacity": 0.03,
        "border-color": C.line,
        "border-width": 1,
        "border-style": "dashed",
        label: "data(label)",
        color: C.ink60,
        "font-family": monoFamily,
        "font-size": 11,
        "text-valign": "top",
        "text-halign": "center",
        "text-margin-y": -8,
        padding: "26px",
      },
    },
    {
      selector: "edge",
      style: {
        width: "data(width)",
        "line-color": C.edge,
        "curve-style": "bezier",
        opacity: 0.75,
        "target-arrow-shape": "none",
      },
    },
    // ── interaction ──
    { selector: ".dim", style: { opacity: 0.1 } },
    { selector: "node.hl", style: { "border-color": C.green, opacity: 1 } },
    {
      selector: "edge.hl",
      style: { "line-color": C.green, opacity: 1 },
    },
    // ── scenario ──
    {
      selector: "node.struck",
      style: {
        "background-color": C.rose,
        "border-color": C.rose,
        "border-style": "dashed",
        "border-width": 3,
        width: 44,
        height: 44,
        color: C.ink,
      },
    },
    {
      selector: "node[hitPct > 0]",
      style: { "border-color": C.rose, "border-width": 3.5 },
    },
    {
      selector: "edge[hit > 0]",
      style: {
        "line-color": C.rose,
        width: "mapData(hit, 0, 40, 2.5, 9)",
        opacity: 1,
      },
    },
  ];
}

// ── tooltip payload ──
interface Tip {
  x: number;
  y: number;
  kind: "facility" | "chip";
  d: Record<string, unknown>;
}

// ── module-level highlight helpers (no React identity churn) ──
function focusOn(cy: Core, node: NodeSingular) {
  const nb = node.closedNeighborhood();
  cy.batch(() => {
    cy.elements().addClass("dim");
    nb.removeClass("dim").addClass("hl");
  });
}

function clearFocus(cy: Core) {
  cy.batch(() => cy.elements().removeClass("dim hl"));
}

// Read the CURRENT selection from the store (not a stale closure) and reflect it.
function applySelection(cy: Core) {
  const { selectedChipId, selectedFacilityId } = useKerfStore.getState();
  const id = selectedFacilityId ?? selectedChipId;
  if (!id) return clearFocus(cy);
  const n = cy.getElementById(id);
  if (n.nonempty()) focusOn(cy, n as unknown as NodeSingular);
  else clearFocus(cy);
}

export default function CascadeGraph() {
  const facilities = useKerfStore((s) => s.facilities);
  const chips = useKerfStore((s) => s.chips);
  const spofs = useKerfStore(selectSPOFs);
  const cascade = useKerfStore(selectActiveCascade);
  const activeScenario = useKerfStore((s) => s.activeScenario);
  const selectedChipId = useKerfStore((s) => s.selectedChipId);
  const selectedFacilityId = useKerfStore((s) => s.selectedFacilityId);
  const selectChip = useKerfStore((s) => s.selectChip);
  const selectFacility = useKerfStore((s) => s.selectFacility);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  // Elements built ONCE from the baseline (spof tint frozen at mount). spofs is
  // intentionally excluded from deps so the structure never rebuilds — scenario &
  // selection are applied imperatively against the live cy instance.
  const elements = useMemo(() => {
    const spofIds = new Set(spofs.map((s) => s.chipId));
    const spofTop = new Map(
      spofs.map((s) => {
        const opTop = s.topOperatorShare >= s.topCountryShare;
        return [
          s.chipId,
          {
            share: Math.max(s.topOperatorShare, s.topCountryShare),
            kind: opTop ? `operator ${s.topOperator}` : `country ${s.topCountry}`,
          },
        ] as const;
      }),
    );
    return buildElements(facilities, chips, spofIds, spofTop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities, chips]);

  // ── mount cytoscape ONCE; wire events here. React re-renders never touch it. ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const monoFamily =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--font-mono")
        .trim() || "monospace";

    const cyOptions = {
      container,
      elements,
      layout: { name: "preset", fit: true, padding: 48 },
      style: stylesheet(`${monoFamily}, monospace`),
      minZoom: 0.2,
      maxZoom: 2.5,
      wheelSensitivity: 0.2,
    };
    const cy = cytoscape(cyOptions as unknown as cytoscape.CytoscapeOptions);
    cyRef.current = cy;
    cy.ready(() => cy.fit(undefined, 48));

    const showTip = (e: EventObject) => {
      const node = e.target as NodeSingular;
      if (node.hasClass("country")) return;
      const kind = node.hasClass("chip") ? "chip" : "facility";
      const p = node.renderedPosition();
      setTip({ x: p.x, y: p.y, kind, d: node.data() });
    };

    cy.on("mouseover", "node", (e) => {
      const node = e.target as NodeSingular;
      if (node.hasClass("country")) return;
      focusOn(cy, node);
      showTip(e);
    });
    cy.on("mouseout", "node", () => {
      setTip(null);
      applySelection(cy);
    });

    // click a chip → select it; click a facility → "who's hit if this dies".
    cy.on("tap", "node", (e) => {
      const node = e.target as NodeSingular;
      if (node.hasClass("country")) return;
      const { selectChip: sc, selectFacility: sf } = useKerfStore.getState();
      if (node.hasClass("chip")) {
        sf(null);
        sc(node.id());
      } else {
        sc(null);
        sf(node.id());
      }
      showTip(e);
    });
    cy.on("tap", (e) => {
      if (e.target === cy) {
        const { selectChip: sc, selectFacility: sf } = useKerfStore.getState();
        sc(null);
        sf(null);
        setTip(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // mount once: elements is ref-stable, helpers are module-level
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── selection (store) → highlight subtree ──
  useEffect(() => {
    const cy = cyRef.current;
    if (cy) applySelection(cy);
  }, [selectedChipId, selectedFacilityId]);

  // ── scenario → degrade struck node + light affected chips/edges ──
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.batch(() => {
      cy.nodes().removeClass("struck");
      cy.nodes().data("hitPct", 0);
      cy.edges().data("hit", 0);
      if (cascade) {
        cy.getElementById(cascade.trigger.facilityId).addClass("struck");
        for (const af of cascade.affectedChips) {
          cy.getElementById(af.chipId).data("hitPct", af.estimatedCapacityHitPct);
          cy.getElementById(`${af.chipId}__${cascade.trigger.facilityId}`).data(
            "hit",
            af.estimatedCapacityHitPct,
          );
        }
      }
    });
  }, [cascade]);

  const fit = () => cyRef.current?.fit(undefined, 48);
  const clearSelection = () => {
    selectChip(null);
    selectFacility(null);
  };

  return (
    <div className="relative">
      {/* controls */}
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          onClick={fit}
          className="rounded-md border border-line bg-bone/90 px-3 py-1.5 font-mono text-xs text-ink backdrop-blur transition-colors hover:border-green"
        >
          fit
        </button>
        <button
          onClick={clearSelection}
          className="rounded-md border border-line bg-bone/90 px-3 py-1.5 font-mono text-xs text-ink/70 backdrop-blur transition-colors hover:border-green"
        >
          clear
        </button>
      </div>

      {activeScenario && (
        <div className="absolute left-3 top-3 z-10 rounded-md border border-rose/60 bg-rose/10 px-3 py-1.5 font-mono text-xs text-rose">
          scenario: {activeScenario.label}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-[68vh] min-h-[420px] w-full touch-none rounded-xl border border-line bg-bone"
      />

      {tip && <GraphTooltip tip={tip} />}

      <Legend />
    </div>
  );
}

function GraphTooltip({ tip }: { tip: Tip }) {
  const d = tip.d;
  // keep the tooltip inside the canvas-ish bounds
  const style: React.CSSProperties = {
    left: Math.max(8, tip.x + 14),
    top: Math.max(8, tip.y + 14),
  };
  return (
    <div
      className="pointer-events-none absolute z-20 max-w-[240px] rounded-lg border border-line bg-bone/95 p-3 shadow-sm backdrop-blur"
      style={style}
    >
      {tip.kind === "facility" ? (
        <div className="space-y-1.5">
          <div className="font-sans text-sm font-medium text-ink">
            {String(d.name)}
          </div>
          <div className="font-mono text-xs text-ink/55">
            {String(d.operator)} · {String(d.country)} · {String(d.tech)}
          </div>
          <div className="font-mono text-xs text-ink">
            <TrackedValue
              value={Number(d.capValue)}
              confidence={d.capConf as Confidence}
              source={String(d.capSource)}
              asOf={String(d.capAsOf)}
              note={String(d.capNote)}
              unit={` ${String(d.capUnit)}`}
            />
          </div>
          <div className="font-mono text-xs text-ink/55">
            {Number(d.inDegree)} chip
            {Number(d.inDegree) === 1 ? "" : "s"} depend on this line
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="font-sans text-sm font-medium text-ink">
            {String(d.name)}
          </div>
          <div className="font-mono text-xs text-ink/55">
            {String(d.vendor)}
          </div>
          {d.isSpof ? (
            <div className="font-mono text-xs text-rose">
              spof · {Number(d.topShare)}% {String(d.topKind)}
            </div>
          ) : (
            <div className="font-mono text-xs text-green">
              below spof threshold
            </div>
          )}
          <div className="flex items-center gap-1.5 font-mono text-xs text-ink/55">
            rests on
            <ConfidenceDot confidence={d.weakest as Confidence} />
            {String(d.weakest)}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 grid gap-x-6 gap-y-2 rounded-xl border border-line bg-bone p-4 font-mono text-xs text-ink/70 sm:grid-cols-2">
      <div className="flex items-center gap-2">
        <span className="inline-block size-3 rounded-[3px] border border-[#CBC4B8] bg-bone" />
        facility (size = capacity) · <span className="text-green">green ring = hub</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-3 rounded-full border border-ink bg-bone" />
        chip · <span className="text-rose">rose = single point of failure</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-[3px] w-6 rounded bg-[#D8D2C6]" />
        edge thickness = dependency weight
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block size-3 rounded-[3px] border-2 border-dashed border-rose bg-rose/40" />
        scenario: struck line + chips hit (rose)
      </div>
    </div>
  );
}
