import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/chat/route";
import type { JournalEntry } from "@/types/mental";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "e1",
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

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/chat — validation", () => {
  it("returns 400 when message is missing", async () => {
    const res = await POST(makeRequest({ conversation: [], entries: [] }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/message/i);
  });

  it("returns 400 when message is blank", async () => {
    const res = await POST(makeRequest({ message: "   ", conversation: [], entries: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on an unparseable JSON body", async () => {
    const res = await POST(makeRawRequest("not valid json"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/chat — success contract", () => {
  it("returns 200 with a reply for a valid request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "That sounds tough. One step at a time." }] } }],
        }),
      } as Response)
    );

    const res = await POST(
      makeRequest({ message: "How am I doing?", conversation: [], entries: [makeEntry()] })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain("One step at a time");
  });

  it("returns 200 with a fallback reply (not 500) when Gemini is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = await POST(
      makeRequest({ message: "How am I doing?", conversation: [], entries: [makeEntry()] })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isFallback).toBe(true);
  });

  it("returns 200 with the crisis response, without calling Gemini, when the message signals crisis", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      makeRequest({
        message: "I want to kill myself.",
        conversation: [],
        entries: [makeEntry()],
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.isCrisisResponse).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a missing/non-array entries or conversation as empty rather than throwing", async () => {
    const res = await POST(makeRequest({ message: "Hello" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toMatch(/start journaling/i);
  });
});
