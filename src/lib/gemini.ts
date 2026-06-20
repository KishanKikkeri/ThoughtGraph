/**
 * ThoughtGraph — Gemini client.
 *
 * Server-side only. GEMINI_API_KEY must never be exposed to the client
 * (no NEXT_PUBLIC_ prefix — see /api/analyze/route.ts, the only caller).
 */

import type { AnalysisResult, GeminiAnalysisRequest } from "@/types/mental";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const REQUIRED_FIELDS = [
  "sentiment",
  "stressLevel",
  "confidenceScore",
  "stressTriggers",
  "topics",
  "recommendedAction",
  "followupQuestion",
] as const;

/**
 * AI safety pipeline: Prompt -> Gemini -> Validate JSON -> Retry (once) -> Fallback.
 * One initial attempt plus one retry. If both fail, analyzeJournal() falls
 * back to a safe local result rather than throwing — a flaky AI call must
 * never crash the check-in flow or the demo.
 */
const MAX_ATTEMPTS = 2;

// ─── Prompt contract ─────────────────────────────────────────

function buildPrompt(input: GeminiAnalysisRequest): string {
  return `Analyze the student's journal entry below.

Context:
- Exam: ${input.examType}
- Mood (0-10): ${input.mood}
- Sleep last night (hours): ${input.sleepHours}
- Study hours today: ${input.studyHours}
- Energy level (0-10): ${input.energyLevel}

Journal entry:
"""
${input.journalText}
"""

Return ONLY valid JSON. No markdown. No explanations. No surrounding text.

The JSON object must have exactly these fields:
- sentiment: string ("positive" | "neutral" | "negative")
- stressLevel: number (0-10)
- confidenceScore: number (0-1)
- stressTriggers: string[] (short evidence-based phrases pulled from the entry)
- topics: string[] (short topics/themes mentioned in the entry)
- recommendedAction: string (one concrete, evidence-based suggestion for today)
- followupQuestion: string (one gentle question to ask the student next time)`;
}

// ─── Strict JSON parsing / validation ────────────────────────

/**
 * Strips a single layer of markdown code-fencing (```json ... ``` or ``` ... ```)
 * if present, otherwise returns the trimmed input unchanged.
 */
function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Parses and strictly validates a raw Gemini response into an AnalysisResult.
 * Throws a descriptive error for any malformed, incomplete, or non-object output.
 */
export function parseGeminiOutput(raw: string): AnalysisResult {
  const cleaned = stripMarkdownFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      "Gemini returned non-JSON output that could not be parsed."
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini output was not a JSON object.");
  }

  const obj = parsed as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj) || obj[field] === undefined) {
      throw new Error(`Gemini output is missing field: ${field}`);
    }
  }

  const stressLevel = Number(obj.stressLevel);
  const confidenceScore = Number(obj.confidenceScore);

  if (Number.isNaN(stressLevel) || Number.isNaN(confidenceScore)) {
    throw new Error(
      "Gemini output had a non-numeric stressLevel or confidenceScore."
    );
  }

  if (!Array.isArray(obj.stressTriggers) || !Array.isArray(obj.topics)) {
    throw new Error("Gemini output had non-array stressTriggers or topics.");
  }

  return {
    sentiment: String(obj.sentiment),
    stressLevel,
    confidenceScore,
    stressTriggers: obj.stressTriggers.map(String),
    topics: obj.topics.map(String),
    recommendedAction: String(obj.recommendedAction),
    followupQuestion: String(obj.followupQuestion),
  };
}

// ─── Live Gemini call (server-side only) ─────────────────────

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (server-side only)."
    );
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini response did not contain any text output.");
  }

  return text;
}

/**
 * Honest, neutral fallback used only when Gemini is unreachable or keeps
 * returning unusable output after a retry. Deliberately contains no
 * fabricated triggers/topics — isFallback:true tells the UI to say so
 * rather than presenting this as evidence-backed insight.
 */
function buildFallbackAnalysis(): AnalysisResult {
  return {
    sentiment: "neutral",
    stressLevel: 5,
    confidenceScore: 0.5,
    stressTriggers: [],
    topics: [],
    recommendedAction:
      "We couldn't analyze this entry just now, but it's saved. Try checking in again in a few minutes.",
    followupQuestion: "Want to add anything else about today?",
    isFallback: true,
  };
}

/**
 * Analyzes a journal entry via Gemini, retrying once on malformed/missing
 * JSON. Per the AI safety pipeline, this function never throws on AI
 * instability (bad output, network failure, rate limit) — it always
 * resolves to a usable AnalysisResult, falling back when necessary.
 */
export async function analyzeJournal(
  input: GeminiAnalysisRequest
): Promise<AnalysisResult> {
  const prompt = buildPrompt(input);

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callGemini(prompt);
      return parseGeminiOutput(raw);
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown error";
  console.error(
    `[gemini] analyzeJournal falling back after ${MAX_ATTEMPTS} attempts: ${message}`
  );
  return buildFallbackAnalysis();
}
