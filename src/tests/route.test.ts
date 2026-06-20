/**
 * API contract tests for POST /api/analyze.
 *
 * Calls the route handler directly (no server needed). Confirms the
 * request/response contract holds — including that AI instability
 * (network failure) still resolves to a 200 with a fallback result,
 * never a 500, per the AI safety pipeline.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/analyze/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawRequest(rawBody: string): NextRequest {
  return new NextRequest("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

const VALID_BODY = {
  journalText: "I scored poorly in my physics mock test again.",
  mood: 4,
  sleepHours: 5,
  studyHours: 7,
  energyLevel: 4,
  examType: "JEE",
};

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/analyze — validation", () => {
  it("returns 400 when journalText is missing", async () => {
    const { journalText, ...rest } = VALID_BODY;
    void journalText;
    const res = await POST(makeRequest(rest));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/journalText/i);
  });

  it("returns 400 when journalText is blank", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, journalText: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when examType is missing", async () => {
    const { examType, ...rest } = VALID_BODY;
    void examType;
    const res = await POST(makeRequest(rest));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/examType/i);
  });

  it("returns 400 on an unparseable JSON body", async () => {
    const res = await POST(makeRawRequest("not valid json"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/analyze — success contract", () => {
  it("returns 200 with a well-shaped AnalysisResult for a valid request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "",
        json: async () => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  sentiment: "negative",
                  stressLevel: 8,
                  confidenceScore: 0.3,
                  stressTriggers: ["mock tests"],
                  topics: ["physics"],
                  recommendedAction: "Take a short break.",
                  followupQuestion: "What felt hardest today?",
                }),
              },
            },
          ],
        }),
      } as Response)
    );

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.stressLevel).toBe(8);
    expect(data.result.stressTriggers).toContain("mock tests");
  });

  it("still returns 200 with a fallback result (not 500) when Gemini is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.isFallback).toBe(true);
  });
});
