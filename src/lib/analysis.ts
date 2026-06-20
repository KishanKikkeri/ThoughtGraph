/**
 * ThoughtGraph — Insights orchestration layer.
 *
 * Thin glue between storage.ts (raw entries) and dna.ts (derived patterns).
 * UI components (Agent-2) consume buildInsights()/buildTimeline() rather than
 * calling storage and dna separately, so the dashboard always sees a
 * consistent, evidence-backed snapshot.
 */

import type { JournalEntry, StressDNA, InvisibleEnemy, TimelinePoint } from "@/types/mental";
import { generateStressDNA, findInvisibleEnemy } from "@/lib/dna";
import { loadEntries } from "@/lib/storage";

export interface InsightsBundle {
  entries: JournalEntry[];
  stressDNA: StressDNA;
  invisibleEnemy: InvisibleEnemy | null;
}

/**
 * Builds the full insights snapshot for the dashboard.
 * Pass `entries` explicitly in tests; defaults to localStorage in the app.
 */
export function buildInsights(entries: JournalEntry[] = loadEntries()): InsightsBundle {
  return {
    entries,
    stressDNA: generateStressDNA(entries),
    invisibleEnemy: findInvisibleEnemy(entries),
  };
}

/**
 * Groups entries (newest-first) into week-sized buckets, oldest week first,
 * for the Emotional Timeline view. Each bucket reports average mood/stress
 * and a one-word-ish summary derived from whichever moved most.
 */
export function buildTimeline(entries: JournalEntry[]): TimelinePoint[] {
  if (entries.length === 0) return [];

  const chronological = [...entries].reverse(); // oldest -> newest
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const start = new Date(chronological[0].createdAt).getTime();

  const buckets = new Map<number, JournalEntry[]>();
  for (const entry of chronological) {
    const elapsed = new Date(entry.createdAt).getTime() - start;
    const weekIndex = Math.max(0, Math.floor(elapsed / WEEK_MS));
    const bucket = buckets.get(weekIndex) ?? [];
    bucket.push(entry);
    buckets.set(weekIndex, bucket);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekIndex, weekEntries]) => {
      const averageMood =
        weekEntries.reduce((sum, e) => sum + e.mood, 0) / weekEntries.length;
      const averageStress =
        weekEntries.reduce((sum, e) => sum + e.analysis.stressLevel, 0) /
        weekEntries.length;

      return {
        label: `Week ${weekIndex + 1}`,
        summary: summarizeWeek(averageMood, averageStress),
        averageMood,
        averageStress,
      };
    });
}

function summarizeWeek(averageMood: number, averageStress: number): string {
  if (averageStress >= 7) return "High stress";
  if (averageMood >= 7) return "Motivated";
  if (averageMood <= 4) return "Low mood";
  return "Steady";
}

/** Generates a unique id for a new journal entry. */
export function createEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
