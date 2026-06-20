import { describe, it, expect } from "vitest";
import { detectCrisisSignals } from "@/lib/safety";

describe("detectCrisisSignals", () => {
  it("returns false for empty or whitespace text", () => {
    expect(detectCrisisSignals("")).toBe(false);
    expect(detectCrisisSignals("   ")).toBe(false);
  });

  it("returns false for ordinary exam-stress language", () => {
    const ordinary = [
      "I'm so stressed about my mock test, I feel like giving up on this chapter.",
      "Today was exhausting, I barely studied and I feel like a failure.",
      "I'm scared I'm going to bomb the exam and disappoint my parents.",
      "I can't focus today, everything feels overwhelming.",
    ];
    for (const text of ordinary) {
      expect(detectCrisisSignals(text)).toBe(false);
    }
  });

  it("flags explicit self-harm or suicide language", () => {
    const crisisExamples = [
      "I want to kill myself after this result.",
      "Sometimes I think about suicide.",
      "I just want to end my life, nothing matters anymore.",
      "I don't want to live anymore.",
      "I've been thinking about hurting myself.",
      "I feel like everyone would be better off dead without me around.",
      "I can't take this anymore, I can't go on.",
    ];
    for (const text of crisisExamples) {
      expect(detectCrisisSignals(text)).toBe(true);
    }
  });

  it("is case-insensitive", () => {
    expect(detectCrisisSignals("I WANT TO KILL MYSELF")).toBe(true);
  });
});
