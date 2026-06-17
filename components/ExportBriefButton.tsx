"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

// Client-side Link → /brief so the in-memory store (baseline vs active scenario,
// any generated narrative) travels with the user into the brief.
export function ExportBriefButton({
  variant = "outline",
  className = "",
}: {
  variant?: "outline" | "solid";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs transition-colors";
  const styles =
    variant === "solid"
      ? "bg-ink text-bone hover:opacity-90"
      : "border border-line text-ink/70 hover:border-green hover:text-ink";
  return (
    <Link href="/brief" className={`${base} ${styles} ${className}`}>
      <FileText className="size-3.5" strokeWidth={1.75} />
      export brief
    </Link>
  );
}
