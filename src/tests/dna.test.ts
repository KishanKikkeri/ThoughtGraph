import { describe, it, expect } from "vitest";
import { generateStressDNA, findInvisibleEnemy } from "@/lib/dna";
import type { JournalEntry } from "@/types/mental";

// ─── Fixtures ─────────────────────────────────

function makeEntry(
  overrides: Partial<JournalEntry> & {
    stressTriggers?: string[];
    stressLevel?: number;
    confidenceScore?: number;
    topics?: string[];
    mood?: number;
    sleepHours?: number;
  }
): JournalEntry {
  const {
    stressTriggers = [],
    stressLevel = 5,
    confidenceScore = 0.5,
    topics = [],
    mood = 5,
    sleepHours = 7,
    ...rest
  } = overrides;

  return {
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    mood,
    sleepHours,
    studyHours: 6,
    energyLevel: 5,
    examType: "JEE",
    journalText: "test entry",
    analysis: {
      sentiment: stressLevel > 6 ? "negative" : "neutral",
      stressLevel,
      confidenceScore,
      stressTriggers,
      topics,
      recommendedAction: "Study for 90 minutes then break.",
      followupQuestion: "What went well today?",
    },
    ...rest,
  };
}

// ─── generateStressDNA ────────────────────────

describe("generateStressDNA", () => {
  it("returns 'Insufficient data' when given no entries", () => {
    const dna = generateStressDNA([]);
    expect(dna.primaryTrigger).toBe("Insufficient data");
  });

  it("correctly identifies the primary trigger as the most frequent one", () => {
    const entries = [
      makeEntry({ stressTriggers: ["mock tests", "sleep"] }),
      makeEntry({ stressTriggers: ["mock tests", "parental pressure"] }),
      makeEntry({ stressTriggers: ["mock tests"] }),
      makeEntry({ stressTriggers: ["sleep"] }),
    ];
    const dna = generateStressDNA(entries);
    expect(dna.primaryTrigger.toLowerCase()).toBe("mock tests");
  });

  it("correctly identifies the secondary trigger", () => {
    const entries = [
      makeEntry({ stressTriggers: ["mock tests", "time management"] }),
      makeEntry({ stressTriggers: ["mock tests", "time management"] }),
      makeEntry({ stressTriggers: ["parental pressure"] }),
    ];
    const dna = generateStressDNA(entries);
    expect(dna.secondaryTrigger.toLowerCase()).toBe("time management");
  });

  it("derives confidenceDriver from high-confidence entries", () => {
    const entries = [
      makeEntry({
        stressTriggers: ["mock tests"],
        confidenceScore: 0.8,
        topics: ["completed goals", "revision"],
      }),
      makeEntry({
        stressTriggers: ["mock tests"],
        confidenceScore: 0.75,
        topics: ["completed goals"],
      }),
      makeEntry({
        stressTriggers: ["sleep"],
        confidenceScore: 0.3,
        topics: ["fatigue"],
      }),
    ];
    const dna = generateStressDNA(entries);
    expect(dna.confidenceDriver.toLowerCase()).toContain("completed goals");
  });

  it("returns 'Achievement Reinforcement' when confidence is rising", () => {
    // Confidence rising: early entries low, later entries high
    const entries = [
      makeEntry({ stressTriggers: ["mock tests"], confidenceScore: 0.9 }),
      makeEntry({ stressTriggers: ["mock tests"], confidenceScore: 0.85 }),
      makeEntry({ stressTriggers: ["mock tests"], confidenceScore: 0.3 }),
      makeEntry({ stressTriggers: ["mock tests"], confidenceScore: 0.25 }),
    ];
    // entries[0] is newest; algorithm slices first half for "early", second half for "late"
    // With this ordering the second half has higher scores → "rising"
    const dna = generateStressDNA(entries);
    expect(dna.recoveryStyle).toBe("Achievement Reinforcement");
  });

  it("capitalises trigger labels correctly", () => {
    const entries = [
      makeEntry({ stressTriggers: ["fear of falling behind"] }),
      makeEntry({ stressTriggers: ["fear of falling behind"] }),
    ];
    const dna = generateStressDNA(entries);
    expect(dna.primaryTrigger).toBe("Fear Of Falling Behind");
  });
});

// ─── findInvisibleEnemy ───────────────────────

describe("findInvisibleEnemy", () => {
  it("returns null when there are no entries", () => {
    expect(findInvisibleEnemy([])).toBeNull();
  });

  it("returns null when no entries have high stress", () => {
    const entries = [
      makeEntry({ stressTriggers: ["exams"], stressLevel: 3 }),
      makeEntry({ stressTriggers: ["exams"], stressLevel: 4 }),
    ];
    expect(findInvisibleEnemy(entries)).toBeNull();
  });

  it("identifies the most common trigger in high-stress entries", () => {
    const entries = [
      makeEntry({ stressTriggers: ["mock tests"], stressLevel: 8 }),
      makeEntry({ stressTriggers: ["mock tests", "sleep"], stressLevel: 9 }),
      makeEntry({ stressTriggers: ["mock tests"], stressLevel: 7 }),
      makeEntry({ stressTriggers: ["sleep"], stressLevel: 8 }),
    ];
    const enemy = findInvisibleEnemy(entries);
    expect(enemy).not.toBeNull();
    expect(enemy!.trigger.toLowerCase()).toBe("mock tests");
    expect(enemy!.occurrences).toBe(3);
  });

  it("includes 'Poor Sleep' in associatedWith when avg sleep < 6", () => {
    const entries = [
      makeEntry({ stressTriggers: ["exams"], stressLevel: 8, sleepHours: 4 }),
      makeEntry({ stressTriggers: ["exams"], stressLevel: 9, sleepHours: 5 }),
    ];
    const enemy = findInvisibleEnemy(entries);
    expect(enemy!.associatedWith).toContain("Poor Sleep");
  });

  it("includes 'Low Confidence' when avg confidence < 0.5", () => {
    const entries = [
      makeEntry({
        stressTriggers: ["parental pressure"],
        stressLevel: 7,
        confidenceScore: 0.2,
      }),
      makeEntry({
        stressTriggers: ["parental pressure"],
        stressLevel: 8,
        confidenceScore: 0.3,
      }),
    ];
    const enemy = findInvisibleEnemy(entries);
    expect(enemy!.associatedWith).toContain("Low Confidence");
  });
});
