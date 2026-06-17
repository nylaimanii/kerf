// ─────────────────────────────────────────────────────────────────────────────
// Groq client — SERVER ONLY.
//
// `import "server-only"` is a compile-time guardrail: if any client component
// (or anything in the client bundle) imports this file, the build FAILS. The
// GROQ_API_KEY is read here and never leaves the server. Never import this from
// a "use client" module.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";
import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

/** True only when a real key is configured. The UI degrades gracefully when false. */
export const groqEnabled = Boolean(apiKey && apiKey.trim().length > 0);

export const groq = groqEnabled ? new Groq({ apiKey }) : null;

// Two-tier strategy: instant model for short captions, versatile for deeper
// narrative reasoning over a cascade / concentration picture.
export const GROQ_MODELS = {
  fast: "llama-3.1-8b-instant",
  deep: "llama-3.3-70b-versatile",
} as const;

export type GroqDepth = keyof typeof GROQ_MODELS;
