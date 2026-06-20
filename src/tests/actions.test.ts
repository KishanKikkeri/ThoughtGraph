import { describe, it, expect } from "vitest";
import { generateAction } from "@/lib/actions";
import type { JournalEntry, StressDNA, InvisibleEnemy } from "@/types/mental";

// ─── Fixtures ─────────────────────────────────

const INSUFFICIENT_DNA: StressDNA = {
  primaryTrigger: "Insufficient data",
  secondaryTrigger: "Insufficient data",
  confidenceDriver: "Insufficient data",
  recoveryStyle: "Insufficient data",
};

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    mood: 5,
    sleepHours: 6,
    studyHours: 6,
    energyLevel: 5,
    examType: "JEE",
    journalText: "test entry",
    analysis: {
      sentiment: "neutral",
      stressLevel: 5,
      confidenceScore: 0.5,
      stressTriggers: [],
      topics: [],
      recommendedAction: "Take a short break after this session.",
      followupQuestion: "How did that feel?",
    },
    ...overrides,
  };
}

// ─── generateAction ───────────────────────────

describe("generateAction", () => {
  it("returns a safe no-data action when there are no entries", () => {
    const result = generateAction([], INSUFFICIENT_DNA, null);
    expect(result.action).toMatch(/first check-in/i);
  });

  it("uses the latest entry's recommendedAction as the action text", () => {
    const entries = [makeEntry({ analysis: { ...makeEntry().analysis, recommendedAction: "Review one weak topic for 20 minutes." } })];
    const result = generateAction(entries, INSUFFICIENT_DNA, null);
    expect(result.action).toBe("Review one weak topic for 20 minutes.");
  });

  it("flags a fallback (un-analyzed) latest entry honestly instead of fabricating a reason", () => {
    const entries = [
      makeEntry({
        analysis: {
          ...makeEntry().analysis,
          stressTriggers: [],
          topics: [],
          isFallback: true,
        },
      }),
    ];
    const result = generateAction(entries, INSUFFICIENT_DNA, null);
    expect(result.rationale).toMatch(/couldn't analyze/i);
  });

  it("grounds the rationale in the Invisible Enemy when today's entry matches it", () => {
    const entries = [
      makeEntry({ analysis: { ...makeEntry().analysis, stressTriggers: ["mock tests"] } }),
    ];
    const enemy: InvisibleEnemy = {
      trigger: "Mock Tests",
      occurrences: 5,
      associatedWith: ["Poor Sleep"],
    };
    const result = generateAction(entries, INSUFFICIENT_DNA, enemy);
    expect(result.rationale).toContain("Mock Tests");
    expect(result.rationale).toContain("5");
    expect(result.rationale).toContain("poor sleep");
  });

  it("falls back to the Stress DNA primary trigger when today's entry doesn't match the Invisible Enemy", () => {
    const entries = [
      makeEntry({ analysis: { ...makeEntry().analysis, stressTriggers: ["time management"] } }),
    ];
    const dna: StressDNA = { ...INSUFFICIENT_DNA, primaryTrigger: "Mock Tests" };
    const enemy: InvisibleEnemy = {
      trigger: "Sleep Deprivation",
      occurrences: 4,
      associatedWith: [],
    };
    const result = generateAction(entries, dna, enemy);
    expect(result.rationale).toMatch(/mock tests/i);
    expect(result.rationale).not.toContain("Sleep Deprivation");
  });

  it("gives a minimal honest rationale when there isn't enough data for either", () => {
    const entries = [makeEntry()];
    const result = generateAction(entries, INSUFFICIENT_DNA, null);
    expect(result.rationale).toMatch(/most recent check-in/i);
  });
});
