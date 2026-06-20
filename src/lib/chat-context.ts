/**
 * ThoughtGraph — Companion Chat context builder.
 *
 * Pure and deterministic, like lib/dna.ts and lib/actions.ts: takes the
 * entries the client already has and formats them into the grounded
 * context the chat prompt is built from (lib/companion.ts). Never calls
 * Gemini itself, never invents anything not present in `entries`.
 */

import type { JournalEntry, StressDNA, InvisibleEnemy } from "@/types/mental";
import { generateStressDNA, findInvisibleEnemy } from "@/lib/dna";

/** Caps how much history rides along on every chat turn — keeps the
 *  prompt bounded and matches the doc's "last N entries" framing. */
const MAX_HISTORY_ENTRIES = 8;

export interface ChatContextSummary {
  hasAnyData: boolean;
  todaySummary: string;
  historyLines: string[];
  stressDNASummary: string;
  invisibleEnemySummary: string;
}

export function buildChatContext(entries: JournalEntry[]): ChatContextSummary {
  if (entries.length === 0) {
    return {
      hasAnyData: false,
      todaySummary: "No check-ins yet.",
      historyLines: [],
      stressDNASummary: "Not enough entries yet to identify a pattern.",
      invisibleEnemySummary: "No recurring high-stress pattern identified yet.",
    };
  }

  const capped = entries.slice(0, MAX_HISTORY_ENTRIES); // already newest-first
  const [today, ...history] = capped;

  return {
    hasAnyData: true,
    todaySummary: formatEntryLine(today),
    historyLines: history.map(formatEntryLine),
    stressDNASummary: formatStressDNA(generateStressDNA(entries)),
    invisibleEnemySummary: formatInvisibleEnemy(findInvisibleEnemy(entries)),
  };
}

function formatEntryLine(e: JournalEntry): string {
  const date = new Date(e.createdAt).toLocaleDateString();
  const triggers =
    e.analysis.stressTriggers.length > 0 ? e.analysis.stressTriggers.join(", ") : "none noted";
  const note = e.analysis.isFallback ? " (not analyzed)" : "";
  return `${date}: mood ${e.mood}/10, stress ${e.analysis.stressLevel}/10, triggers: ${triggers}${note}`;
}

function formatStressDNA(dna: StressDNA): string {
  if (dna.primaryTrigger === "Insufficient data") {
    return "Not enough entries yet to identify a pattern.";
  }
  return `Primary trigger: ${dna.primaryTrigger}. Secondary trigger: ${dna.secondaryTrigger}. Confidence driver: ${dna.confidenceDriver}. Recovery style: ${dna.recoveryStyle}.`;
}

function formatInvisibleEnemy(enemy: InvisibleEnemy | null): string {
  if (!enemy) return "No recurring high-stress pattern identified yet.";
  const associated =
    enemy.associatedWith.length > 0
      ? ` Often associated with: ${enemy.associatedWith.join(", ")}.`
      : "";
  return `"${enemy.trigger}" has appeared in ${enemy.occurrences} high-stress entries.${associated}`;
}
