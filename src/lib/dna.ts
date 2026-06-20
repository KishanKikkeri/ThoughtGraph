/**
 * ThoughtGraph — Stress DNA & Invisible Enemy algorithms.
 *
 * Deliberately NOT powered by Gemini. Everything here is derived
 * deterministically from entry history so it is fully unit-testable
 * and never hallucinates a pattern that isn't backed by evidence.
 *
 * Convention: callers pass entries newest-first (the same order
 * lib/storage.ts#loadEntries returns).
 */

import type { JournalEntry, StressDNA, InvisibleEnemy } from "@/types/mental";
import {
  HIGH_STRESS_THRESHOLD,
  LOW_SLEEP_THRESHOLD,
  LOW_CONFIDENCE_THRESHOLD,
  HIGH_CONFIDENCE_THRESHOLD,
} from "@/constants";

const INSUFFICIENT_DATA = "Insufficient data";

// ─── Shared helpers ──────────────────────────────────────────

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Naive title case: capitalizes every word, e.g. "fear of x" -> "Fear Of X". */
function titleCase(s: string): string {
  return s.replace(
    /\w\S*/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}

/** Counts occurrences of each (lowercased) string, preserving first-seen order. */
function countFrequencies(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const key = raw.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Sorts a frequency map by count descending, stable on insertion order for ties. */
function rankByFrequency(counts: Map<string, number>): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// ─── Stress DNA ──────────────────────────────────────────────

export function generateStressDNA(entries: JournalEntry[]): StressDNA {
  if (entries.length === 0) {
    return {
      primaryTrigger: INSUFFICIENT_DATA,
      secondaryTrigger: INSUFFICIENT_DATA,
      confidenceDriver: INSUFFICIENT_DATA,
      recoveryStyle: INSUFFICIENT_DATA,
    };
  }

  // Primary / secondary trigger — most frequent stressTriggers across all entries.
  const allTriggers = entries.flatMap((e) => e.analysis.stressTriggers);
  const triggerRanking = rankByFrequency(countFrequencies(allTriggers));

  const primaryTrigger =
    triggerRanking.length > 0 ? titleCase(triggerRanking[0][0]) : INSUFFICIENT_DATA;
  const secondaryTrigger =
    triggerRanking.length > 1 ? titleCase(triggerRanking[1][0]) : INSUFFICIENT_DATA;

  // Confidence driver — most frequent topic among high-confidence entries.
  const highConfidenceEntries = entries.filter(
    (e) => e.analysis.confidenceScore >= HIGH_CONFIDENCE_THRESHOLD
  );
  const driverTopics = highConfidenceEntries.flatMap((e) => e.analysis.topics);
  const driverRanking = rankByFrequency(countFrequencies(driverTopics));
  const confidenceDriver =
    driverRanking.length > 0 ? titleCase(driverRanking[0][0]) : INSUFFICIENT_DATA;

  // Recovery style — compare confidence trend from earliest half to latest half.
  // Entries arrive newest-first, so reverse to chronological (oldest -> newest)
  // before splitting.
  const chronological = [...entries].reverse();
  const midpoint = Math.floor(chronological.length / 2);
  const earlyHalf = chronological.slice(0, midpoint);
  const lateHalf = chronological.slice(midpoint);

  let recoveryStyle: string;
  if (earlyHalf.length === 0 || lateHalf.length === 0) {
    recoveryStyle = INSUFFICIENT_DATA;
  } else {
    const earlyAvg = average(earlyHalf.map((e) => e.analysis.confidenceScore));
    const lateAvg = average(lateHalf.map((e) => e.analysis.confidenceScore));

    if (lateAvg > earlyAvg) {
      recoveryStyle = "Achievement Reinforcement";
    } else if (lateAvg < earlyAvg) {
      recoveryStyle = "Needs Renewed Support";
    } else {
      recoveryStyle = "Steady Consistency";
    }
  }

  return { primaryTrigger, secondaryTrigger, confidenceDriver, recoveryStyle };
}

// ─── Invisible Enemy ─────────────────────────────────────────

export function findInvisibleEnemy(entries: JournalEntry[]): InvisibleEnemy | null {
  if (entries.length === 0) return null;

  const highStressEntries = entries.filter(
    (e) => e.analysis.stressLevel >= HIGH_STRESS_THRESHOLD
  );
  if (highStressEntries.length === 0) return null;

  const triggerCounts = countFrequencies(
    highStressEntries.flatMap((e) => e.analysis.stressTriggers)
  );
  if (triggerCounts.size === 0) return null;

  const [topTrigger, occurrences] = rankByFrequency(triggerCounts)[0];

  const avgSleep = average(highStressEntries.map((e) => e.sleepHours));
  const avgConfidence = average(
    highStressEntries.map((e) => e.analysis.confidenceScore)
  );

  const associatedWith: string[] = [];
  if (avgSleep < LOW_SLEEP_THRESHOLD) associatedWith.push("Poor Sleep");
  if (avgConfidence < LOW_CONFIDENCE_THRESHOLD) associatedWith.push("Low Confidence");

  return {
    trigger: titleCase(topTrigger),
    occurrences,
    associatedWith,
  };
}
