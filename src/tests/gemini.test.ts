/**
 * AI failure tests — the safety pipeline (Prompt -> Gemini -> Validate ->
 * Retry once -> Fallback) must never let a flaky or hostile Gemini response
 * crash the check-in flow. These tests stub `fetch` to simulate every way
 * Gemini can misbehave and assert analyzeJournal() always resolves safely.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { analyzeJournal } from "@/lib/gemini";
import type { GeminiAnalysisRequest } from "@/types/mental";

const BASE_INPUT: GeminiAnalysisRequest = {
  journalText: "I scored poorly in my physics mock test again.",
  mood: 4,
  sleepHours: 5,
  studyHours: 7,
  energyLevel: 4,
  examType: "JEE",
};

const VALID_GEMINI_TEXT = JSON.stringify({
  sentiment: "negative",
  stressLevel: 8,
  confidenceScore: 0.3,
  stressTriggers: ["mock tests"],
  topics: ["physics"],
  recommendedAction: "Take a 5-minute break after every 90 minutes of study.",
  followupQuestion: "What part of physics felt hardest this week?",
});

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

describe("analyzeJournal — happy path", () => {
  it("returns the parsed result, not a fallback, when Gemini responds with valid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(geminiResponse(VALID_GEMINI_TEXT)));

    const result = await analyzeJournal(BASE_INPUT);

    expect(result.stressLevel).toBe(8);
    expect(result.isFallback).toBeUndefined();
  });
});

describe("analyzeJournal — AI instability", () => {
  it("falls back instead of throwing when Gemini keeps returning non-JSON text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geminiResponse("I cannot analyse this right now."))
    );

    const value = await analyzeJournal(BASE_INPUT);

    expect(value.isFallback).toBe(true);
    expect(typeof value.stressLevel).toBe("number");
    expect(typeof value.confidenceScore).toBe("number");
    expect(Array.isArray(value.stressTriggers)).toBe(true);
    expect(typeof value.recommendedAction).toBe("string");
  });

  it("falls back instead of throwing when the network call itself rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const value = await analyzeJournal(BASE_INPUT);

    expect(value.isFallback).toBe(true);
  });

  it("falls back instead of throwing when Gemini returns a 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "internal error",
        json: async () => ({}),
      } as Response)
    );

    const value = await analyzeJournal(BASE_INPUT);

    expect(value.isFallback).toBe(true);
  });

  it("falls back instead of throwing when a required field is missing from the JSON", async () => {
    const incomplete = JSON.parse(VALID_GEMINI_TEXT);
    delete incomplete.followupQuestion;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(incomplete)))
    );

    const value = await analyzeJournal(BASE_INPUT);

    expect(value.isFallback).toBe(true);
  });

  it("retries exactly once (two total calls) before falling back", async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse("still not json"));
    vi.stubGlobal("fetch", fetchMock);

    await analyzeJournal(BASE_INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("succeeds on the retry if the second Gemini call returns valid JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(geminiResponse("not json the first time"))
      .mockResolvedValueOnce(geminiResponse(VALID_GEMINI_TEXT));
    vi.stubGlobal("fetch", fetchMock);

    const value = await analyzeJournal(BASE_INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(value.isFallback).toBeUndefined();
    expect(value.stressLevel).toBe(8);
  });

  it("falls back without throwing when GEMINI_API_KEY is not configured", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEY", "");

    const value = await analyzeJournal(BASE_INPUT);

    expect(value.isFallback).toBe(true);
  });
});
