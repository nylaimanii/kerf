"use client";

import dynamic from "next/dynamic";

import { SiteNav } from "@/components/SiteNav";

// cytoscape touches `window` — load the graph client-only.
const CascadeGraph = dynamic(
  () => import("@/components/graph/CascadeGraph"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[68vh] min-h-[420px] w-full items-center justify-center rounded-xl border border-line bg-bone font-mono text-xs text-ink/40">
        loading network…
      </div>
    ),
  },
);

export default function NetworkPage() {
  return (
    <div className="min-h-screen bg-bone">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <SiteNav />

        <main className="pb-16">
          <section className="py-10 sm:py-12">
            <p className="font-sans text-xs lowercase tracking-[0.2em] text-ink/50">
              dependency network
            </p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-ink sm:text-4xl">
              who depends on whom
            </h1>
            <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-ink/75">
              Every AI accelerator traced to the packaging and memory lines it
              relies on. Edge thickness is dependency weight; node size is
              capacity. Click a line to see{" "}
              <span className="italic">who is hit if it goes down.</span>
            </p>
          </section>

          <CascadeGraph />
        </main>
      </div>
    </div>
  );
}
