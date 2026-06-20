import { describe, it, expect } from "vitest";
import { buildChatContext } from "@/lib/chat-context";
import type { JournalEntry } from "@/types/mental";

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
      stressTriggers: ["mock tests"],
      topics: ["physics"],
      recommendedAction: "Take a short break.",
      followupQuestion: "How did that feel?",
    },
    ...overrides,
  };
}

describe("buildChatContext", () => {
  it("reports no data honestly when there are no entries", () => {
    const ctx = buildChatContext([]);
    expect(ctx.hasAnyData).toBe(false);
    expect(ctx.stressDNASummary).toMatch(/not enough entries/i);
    expect(ctx.invisibleEnemySummary).toMatch(/no recurring/i);
  });

  it("splits the newest entry as 'today' and the rest as history", () => {
    const entries = [
      makeEntry({ createdAt: "2024-03-03T10:00:00.000Z", journalText: "newest" }),
      makeEntry({ createdAt: "2024-03-02T10:00:00.000Z", journalText: "middle" }),
      makeEntry({ createdAt: "2024-03-01T10:00:00.000Z", journalText: "oldest" }),
    ]; // already newest-first, matching lib/storage.ts#loadEntries order

    const ctx = buildChatContext(entries);
    expect(ctx.hasAnyData).toBe(true);
    expect(ctx.todaySummary).toContain("mood 5/10");
    expect(ctx.historyLines).toHaveLength(2);
  });

  it("caps history to the most recent entries", () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      makeEntry({ createdAt: new Date(Date.now() - i * 86_400_000).toISOString() })
    );
    const ctx = buildChatContext(entries);
    // today + capped history should never exceed the configured window
    expect(ctx.historyLines.length).toBeLessThan(entries.length - 1);
  });

  it("flags fallback (un-analyzed) entries in the history line rather than hiding it", () => {
    const entries = [
      makeEntry({ createdAt: "2024-03-02T10:00:00.000Z" }),
      makeEntry({
        createdAt: "2024-03-01T10:00:00.000Z",
        analysis: { ...makeEntry().analysis, isFallback: true },
      }),
    ];
    const ctx = buildChatContext(entries);
    expect(ctx.historyLines[0]).toMatch(/not analyzed/i);
  });

  it("summarizes Stress DNA and Invisible Enemy only from real computed data", () => {
    const entries = Array.from({ length: 4 }, (_, i) =>
      makeEntry({
        createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
        analysis: { ...makeEntry().analysis, stressLevel: 8, stressTriggers: ["mock tests"] },
      })
    );
    const ctx = buildChatContext(entries);
    expect(ctx.stressDNASummary).toContain("Mock Tests");
    expect(ctx.invisibleEnemySummary).toContain("Mock Tests");
    expect(ctx.invisibleEnemySummary).toContain("4 high-stress entries");
  });
});
