import { describe, it, expect, beforeEach } from "vitest";
import {
  saveEntry,
  loadEntries,
  loadEntry,
  deleteEntry,
  clearAllEntries,
  entryCount,
} from "@/lib/storage";
import type { JournalEntry } from "@/types/mental";

// ─── Fixtures ─────────────────────────────────

function makeEntry(id: string, createdAt: string): JournalEntry {
  return {
    id,
    createdAt,
    mood: 6,
    sleepHours: 7,
    studyHours: 8,
    energyLevel: 6,
    examType: "JEE",
    journalText: `Entry ${id}`,
    analysis: {
      sentiment: "neutral",
      stressLevel: 5,
      confidenceScore: 0.5,
      stressTriggers: ["mock tests"],
      topics: ["physics"],
      recommendedAction: "Take breaks.",
      followupQuestion: "How did today go?",
    },
  };
}

const ENTRY_A = makeEntry("a", "2024-03-01T10:00:00.000Z");
const ENTRY_B = makeEntry("b", "2024-03-02T10:00:00.000Z");
const ENTRY_C = makeEntry("c", "2024-03-03T10:00:00.000Z");

// ─── Setup ────────────────────────────────────

beforeEach(() => {
  clearAllEntries();
});

// ─── Save ─────────────────────────────────────

describe("saveEntry", () => {
  it("persists a single entry", () => {
    saveEntry(ENTRY_A);
    expect(entryCount()).toBe(1);
  });

  it("persists multiple distinct entries", () => {
    saveEntry(ENTRY_A);
    saveEntry(ENTRY_B);
    expect(entryCount()).toBe(2);
  });

  it("overwrites an entry with the same id (upsert semantics)", () => {
    saveEntry(ENTRY_A);
    const updated = { ...ENTRY_A, mood: 9 };
    saveEntry(updated);
    expect(entryCount()).toBe(1);
    expect(loadEntry("a")!.mood).toBe(9);
  });
});

// ─── Load ─────────────────────────────────────

describe("loadEntries", () => {
  it("returns an empty array when storage is empty", () => {
    expect(loadEntries()).toEqual([]);
  });

  it("returns entries sorted newest-first", () => {
    saveEntry(ENTRY_A); // oldest
    saveEntry(ENTRY_B);
    saveEntry(ENTRY_C); // newest
    const entries = loadEntries();
    expect(entries[0].id).toBe("c");
    expect(entries[1].id).toBe("b");
    expect(entries[2].id).toBe("a");
  });

  it("returns all saved entries", () => {
    saveEntry(ENTRY_A);
    saveEntry(ENTRY_B);
    const entries = loadEntries();
    expect(entries).toHaveLength(2);
  });
});

describe("loadEntry", () => {
  it("returns the correct entry by id", () => {
    saveEntry(ENTRY_A);
    saveEntry(ENTRY_B);
    const found = loadEntry("b");
    expect(found).toBeDefined();
    expect(found!.id).toBe("b");
  });

  it("returns undefined for a non-existent id", () => {
    saveEntry(ENTRY_A);
    expect(loadEntry("nonexistent")).toBeUndefined();
  });
});

// ─── Delete ───────────────────────────────────

describe("deleteEntry", () => {
  it("removes a single entry by id", () => {
    saveEntry(ENTRY_A);
    saveEntry(ENTRY_B);
    deleteEntry("a");
    expect(entryCount()).toBe(1);
    expect(loadEntry("a")).toBeUndefined();
    expect(loadEntry("b")).toBeDefined();
  });

  it("does not throw when deleting a non-existent id", () => {
    saveEntry(ENTRY_A);
    expect(() => deleteEntry("ghost")).not.toThrow();
    expect(entryCount()).toBe(1);
  });

  it("results in empty storage when the last entry is deleted", () => {
    saveEntry(ENTRY_A);
    deleteEntry("a");
    expect(entryCount()).toBe(0);
    expect(loadEntries()).toEqual([]);
  });
});

// ─── Clear ────────────────────────────────────

describe("clearAllEntries", () => {
  it("removes all entries", () => {
    saveEntry(ENTRY_A);
    saveEntry(ENTRY_B);
    saveEntry(ENTRY_C);
    clearAllEntries();
    expect(entryCount()).toBe(0);
  });

  it("is safe to call on empty storage", () => {
    expect(() => clearAllEntries()).not.toThrow();
  });
});
