/**
 * ThoughtGraph — Action Generator.
 *
 * Deliberately NOT a fresh Gemini call. Each entry already carries a
 * Gemini-suggested `recommendedAction` grounded in that entry's own text
 * (see lib/gemini.ts's prompt contract). This module's job is narrower:
 * pick which entry's action is most relevant *today*, and attach a
 * rationale built only from already-computed, evidence-backed data
 * (lib/dna.ts's StressDNA / InvisibleEnemy) — never a fabricated reason.
 */

import type {
  JournalEntry,
  PersonalizedAction,
  StressDNA,
  InvisibleEnemy,
} from "@/types/mental";

const NO_DATA_ACTION: PersonalizedAction = {
  action: "Log your first check-in to get a personalized action for today.",
  rationale:
    "Today's Action is generated from your check-in history — there isn't one yet.",
};

const FALLBACK_RATIONALE =
  "We couldn't analyze your latest entry, so this is a general suggestion rather than an evidence-backed one.";

/**
 * Builds today's PersonalizedAction.
 *
 * `entries` must be newest-first (the order lib/storage.ts#loadEntries
 * returns). `stressDNA` and `invisibleEnemy` should come from the same
 * snapshot (lib/analysis.ts#buildInsights) so the rationale stays
 * consistent with what the rest of the dashboard is showing.
 */
export function generateAction(
  entries: JournalEntry[],
  stressDNA: StressDNA,
  invisibleEnemy: InvisibleEnemy | null
): PersonalizedAction {
  if (entries.length === 0) return NO_DATA_ACTION;

  const latest = entries[0];

  if (latest.analysis.isFallback) {
    return { action: latest.analysis.recommendedAction, rationale: FALLBACK_RATIONALE };
  }

  return {
    action: latest.analysis.recommendedAction,
    rationale: buildRationale(latest, entries, stressDNA, invisibleEnemy),
  };
}

function buildRationale(
  latest: JournalEntry,
  entries: JournalEntry[],
  stressDNA: StressDNA,
  invisibleEnemy: InvisibleEnemy | null
): string {
  // Strongest case: today's entry itself names the trigger we already
  // have the most evidence for across high-stress entries.
  if (invisibleEnemy) {
    const matchesToday = latest.analysis.stressTriggers.some(
      (t) => t.trim().toLowerCase() === invisibleEnemy.trigger.toLowerCase()
    );
    if (matchesToday) {
      const associated =
        invisibleEnemy.associatedWith.length > 0
          ? ` and tends to show up alongside ${formatList(invisibleEnemy.associatedWith)}`
          : "";
      return `"${invisibleEnemy.trigger}" has come up in ${invisibleEnemy.occurrences} of your high-stress entries${associated}.`;
    }
  }

  // Next best: ground it in the most frequent trigger across history.
  if (stressDNA.primaryTrigger !== "Insufficient data") {
    const count = entries.length;
    return `Based on what's come up most often across your ${count} check-in${count === 1 ? "" : "s"} so far — ${stressDNA.primaryTrigger.toLowerCase()}.`;
  }

  return "Based on your most recent check-in.";
}

function formatList(items: string[]): string {
  const lower = items.map((i) => i.toLowerCase());
  if (lower.length === 1) return lower[0];
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}
