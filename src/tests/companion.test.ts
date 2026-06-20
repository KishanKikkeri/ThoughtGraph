/**
 * Companion Chat orchestrator tests — mirrors the structure of
 * gemini.test.ts: stub `fetch` to simulate every way Gemini can
 * misbehave, plus the crisis-intercept and no-data paths that
 * lib/gemini.ts#analyzeJournal doesn't need.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCompanionReply } from "@/lib/companion";
import type { ChatMessage, JournalEntry } from "@/types/mental";

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    mood: 5,
    sleepHours: 6,
    studyHours: 6,
    energyLevel: 5,
    examType: "JEE",
    journalText: "Mock test went badly again today.",
    analysis: {
      sentiment: "negative",
      stressLevel: 7,
      confidenceScore: 0.4,
      stressTriggers: ["mock tests"],
      topics: ["physics"],
      recommendedAction: "Take a short break.",
      followupQuestion: "What felt hardest?",
    },
    ...overrides,
  };
}

function geminiResponse(text: string): Response {
  return {
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  } as Response;
}

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getCompanionReply — crisis intercept", () => {
  it("returns the deterministic crisis response when the new message signals crisis, without calling Gemini", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCompanionReply({
      message: "I just want to end my life, nothing matters anymore.",
      conversation: [],
      entries: [makeEntry()],
    });

    expect(result.isCrisisResponse).toBe(true);
    expect(result.reply).toMatch(/14416/);
    expect(result.reply).toMatch(/112/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the crisis response when the latest journal entry (not the chat message) signals crisis", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCompanionReply({
      message: "How am I doing?",
      conversation: [],
      entries: [makeEntry({ journalText: "I keep thinking about suicide lately." })],
    });

    expect(result.isCrisisResponse).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not flag ordinary exam stress as a crisis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geminiResponse("That sounds rough. Take it one topic at a time."))
    );

    const result = await getCompanionReply({
      message: "I'm so stressed about my mock test, I feel like giving up on this chapter.",
      conversation: [],
      entries: [makeEntry()],
    });

    expect(result.isCrisisResponse).toBeUndefined();
  });
});

describe("getCompanionReply — no data", () => {
  it("returns a deterministic message and never calls Gemini when there are no entries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getCompanionReply({
      message: "Hi, how am I doing?",
      conversation: [],
      entries: [],
    });

    expect(result.reply).toMatch(/start journaling/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getCompanionReply — happy path", () => {
  it("returns Gemini's reply, grounded by the entries passed in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        geminiResponse(
          "Mock tests have been a recurring trigger for you. Try reviewing just your mistakes tonight, not the whole syllabus."
        )
      )
    );

    const result = await getCompanionReply({
      message: "Why do I keep feeling this way before mock tests?",
      conversation: [],
      entries: [makeEntry()],
    });

    expect(result.reply).toContain("Mock tests");
    expect(result.isFallback).toBeUndefined();
  });

  it("includes recent conversation turns in the prompt sent to Gemini", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(geminiResponse("Got it — let's build on that."));
    vi.stubGlobal("fetch", fetchMock);

    const conversation: ChatMessage[] = [
      { role: "user", content: "I'm worried about chemistry." },
      { role: "assistant", content: "Chemistry hasn't come up as a trigger yet — tell me more." },
    ];

    await getCompanionReply({ message: "It's mainly organic chemistry.", conversation, entries: [makeEntry()] });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    const promptText = body.contents[0].parts[0].text;
    expect(promptText).toContain("I'm worried about chemistry.");
    expect(promptText).toContain("organic chemistry");
  });
});

describe("getCompanionReply — AI instability", () => {
  it("falls back instead of throwing when Gemini returns an empty reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse("   ")));

    const result = await getCompanionReply({
      message: "How am I doing?",
      conversation: [],
      entries: [makeEntry()],
    });

    expect(result.isFallback).toBe(true);
    expect(result.reply).toMatch(/trouble responding/i);
  });

  it("falls back instead of throwing when the network call rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await getCompanionReply({
      message: "How am I doing?",
      conversation: [],
      entries: [makeEntry()],
    });

    expect(result.isFallback).toBe(true);
  });

  it("retries exactly once (two total calls) before falling back", async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(""));
    vi.stubGlobal("fetch", fetchMock);

    await getCompanionReply({ message: "Hi", conversation: [], entries: [makeEntry()] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
