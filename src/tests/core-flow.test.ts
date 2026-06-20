/**
 * Core-flow test — the full path a real check-in takes once Gemini has
 * already produced an AnalysisResult: save -> reload -> derive insights.
 * This is the flow Agent-2's CheckinForm will trigger on every submit, so
 * it's covered end-to-end here rather than only in isolated unit tests.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { saveEntry, loadEntries, clearAllEntries } from "@/lib/storage";
import { buildInsights, createEntryId } from "@/lib/analysis";
import type { AnalysisResult, JournalEntry } from "@/types/mental";

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    sentiment: "negative",
    stressLevel: 8,
    confidenceScore: 0.3,
    stressTriggers: ["mock tests"],
    topics: ["physics"],
    recommendedAction: "Take a 5-minute break after every 90 minutes of study.",
    followupQuestion: "What part of physics felt hardest this week?",
    ...overrides,
  };
}

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: createEntryId(),
    createdAt: new Date().toISOString(),
    mood: 4,
    sleepHours: 5,
    studyHours: 7,
    energyLevel: 4,
    examType: "JEE",
    journalText: "I scored poorly in my physics mock test again.",
    analysis: makeAnalysis(),
    ...overrides,
  };
}

beforeEach(() => {
  clearAllEntries();
});

describe("core check-in flow", () => {
  it("carries a check-in through save, reload, and Stress DNA generation without data loss", () => {
    const entry = makeEntry();
    saveEntry(entry);

    const stored = loadEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0].journalText).toBe(entry.journalText);
    expect(stored[0].analysis.stressTriggers).toEqual(["mock tests"]);

    const insights = buildInsights(stored);
    expect(insights.stressDNA.primaryTrigger.toLowerCase()).toBe("mock tests");
  });

  it("surfaces the Invisible Enemy once a stress trigger recurs across check-ins", () => {
    for (let i = 0; i < 3; i++) {
      saveEntry(
        makeEntry({
          createdAt: new Date(Date.now() - i * 1000).toISOString(),
          journalText: `Entry ${i}`,
        })
      );
    }

    const insights = buildInsights(loadEntries());
    expect(insights.invisibleEnemy).not.toBeNull();
    expect(insights.invisibleEnemy!.trigger.toLowerCase()).toBe("mock tests");
    expect(insights.invisibleEnemy!.occurrences).toBe(3);
  });

  it("upserts on resubmission instead of duplicating the entry", () => {
    const entry = makeEntry();
    saveEntry(entry);
    saveEntry({ ...entry, mood: 9 });

    const stored = loadEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0].mood).toBe(9);
  });

  it("stores each entry's analysis once — rereading it never re-runs Gemini", () => {
    const entry = makeEntry();
    saveEntry(entry);

    const firstRead = loadEntries()[0];
    const secondRead = loadEntries()[0];

    // Same persisted analysis both times: reading is a pure storage lookup,
    // not a fresh AI call, so the cached result is reused as-is.
    expect(firstRead.analysis).toEqual(entry.analysis);
    expect(secondRead.analysis).toEqual(entry.analysis);
  });

  it("produces an empty-but-safe insights bundle when there are no entries yet", () => {
    const insights = buildInsights(loadEntries());

    expect(insights.entries).toEqual([]);
    expect(insights.stressDNA.primaryTrigger).toBe("Insufficient data");
    expect(insights.invisibleEnemy).toBeNull();
  });

  it("still produces usable insights when an entry's analysis is a fallback result", () => {
    saveEntry(
      makeEntry({
        analysis: makeAnalysis({
          stressTriggers: [],
          topics: [],
          isFallback: true,
        }),
      })
    );

    expect(() => buildInsights(loadEntries())).not.toThrow();
  });
});
