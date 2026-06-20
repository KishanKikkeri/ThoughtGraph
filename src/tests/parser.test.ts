import { describe, it, expect } from "vitest";
import { parseGeminiOutput } from "@/lib/gemini";
import type { AnalysisResult } from "@/types/mental";

const VALID_RESULT: AnalysisResult = {
  sentiment: "negative",
  stressLevel: 7,
  confidenceScore: 0.4,
  stressTriggers: ["mock tests", "parental pressure"],
  topics: ["physics", "sleep deprivation"],
  recommendedAction: "Take a 5-minute break after every 90 minutes of study.",
  followupQuestion: "What part of physics felt hardest this week?",
};

const VALID_JSON = JSON.stringify(VALID_RESULT);

// ─── Valid JSON ───────────────────────────────

describe("parseGeminiOutput — valid JSON", () => {
  it("parses a clean JSON string", () => {
    const result = parseGeminiOutput(VALID_JSON);
    expect(result.sentiment).toBe("negative");
    expect(result.stressLevel).toBe(7);
    expect(result.confidenceScore).toBe(0.4);
    expect(result.stressTriggers).toEqual(["mock tests", "parental pressure"]);
    expect(result.topics).toEqual(["physics", "sleep deprivation"]);
    expect(result.recommendedAction).toContain("break");
    expect(result.followupQuestion).toContain("physics");
  });

  it("returns numeric stressLevel even if JSON has it as a string", () => {
    const tweaked = { ...VALID_RESULT, stressLevel: "8" };
    const result = parseGeminiOutput(JSON.stringify(tweaked));
    expect(typeof result.stressLevel).toBe("number");
    expect(result.stressLevel).toBe(8);
  });

  it("coerces empty stressTriggers array correctly", () => {
    const tweaked = { ...VALID_RESULT, stressTriggers: [] };
    const result = parseGeminiOutput(JSON.stringify(tweaked));
    expect(result.stressTriggers).toEqual([]);
  });
});

// ─── Malformed JSON ───────────────────────────

describe("parseGeminiOutput — malformed JSON", () => {
  it("throws on completely non-JSON input", () => {
    expect(() =>
      parseGeminiOutput("I cannot analyse this student right now.")
    ).toThrow(/non-JSON/i);
  });

  it("throws on truncated JSON", () => {
    expect(() => parseGeminiOutput('{"sentiment": "negative"')).toThrow();
  });

  it("throws when a required field is missing", () => {
    const missing = { ...VALID_RESULT } as Partial<AnalysisResult>;
    delete missing.followupQuestion;
    expect(() => parseGeminiOutput(JSON.stringify(missing))).toThrow(
      /missing field/i
    );
  });

  it("throws when the output is a JSON array instead of object", () => {
    expect(() => parseGeminiOutput("[1, 2, 3]")).toThrow();
  });

  it("throws on null JSON", () => {
    expect(() => parseGeminiOutput("null")).toThrow();
  });
});

// ─── Markdown-wrapped JSON ────────────────────

describe("parseGeminiOutput — markdown-wrapped JSON", () => {
  it("strips ```json ... ``` fences", () => {
    const wrapped = "```json\n" + VALID_JSON + "\n```";
    const result = parseGeminiOutput(wrapped);
    expect(result.stressLevel).toBe(7);
  });

  it("strips plain ``` ... ``` fences", () => {
    const wrapped = "```\n" + VALID_JSON + "\n```";
    const result = parseGeminiOutput(wrapped);
    expect(result.sentiment).toBe("negative");
  });

  it("handles extra whitespace around fenced JSON", () => {
    const wrapped = "  ```json  \n  " + VALID_JSON + "  \n  ```  ";
    const result = parseGeminiOutput(wrapped);
    expect(result.confidenceScore).toBe(0.4);
  });
});
