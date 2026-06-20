/**
 * ThoughtGraph – POST /api/analyze
 *
 * Receives a journal entry, calls Gemini server-side, returns AnalysisResult.
 * GEMINI_API_KEY is never exposed to the client.
 *
 * AI safety pipeline (see lib/gemini.ts#analyzeJournal): Gemini failures or
 * malformed output are retried once, then resolved to a safe fallback
 * result (result.isFallback === true) — analyzeJournal never throws for AI
 * instability. The try/catch below is a defensive backstop for genuinely
 * unexpected errors only, so a flaky AI call can never 500 the check-in.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeJournal } from "@/lib/gemini";
import type {
  GeminiAnalysisRequest,
  GeminiAnalysisResponse,
  GeminiErrorResponse,
} from "@/types/mental";

export async function POST(
  req: NextRequest
): Promise<NextResponse<GeminiAnalysisResponse | GeminiErrorResponse>> {
  let body: GeminiAnalysisRequest;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Basic validation
  const { journalText, mood, sleepHours, studyHours, energyLevel, examType } =
    body;

  if (!journalText || typeof journalText !== "string" || !journalText.trim()) {
    return NextResponse.json(
      { error: "journalText is required" },
      { status: 400 }
    );
  }

  if (!examType) {
    return NextResponse.json(
      { error: "examType is required" },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeJournal({
      journalText: journalText.trim(),
      mood: Number(mood),
      sleepHours: Number(sleepHours),
      studyHours: Number(studyHours),
      energyLevel: Number(energyLevel),
      examType,
    });

    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[/api/analyze]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
