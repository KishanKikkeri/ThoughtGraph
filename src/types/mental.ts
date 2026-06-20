/**
 * ThoughtGraph — Core domain types.
 *
 * These types are the contract between the AI analysis pipeline,
 * local storage, and the dashboard UI. Keep this file dependency-free
 * (no imports) so every other module can safely depend on it.
 */

// ─── Exam Types ──────────────────────────────────────────────

export const EXAM_TYPES = [
  "JEE",
  "NEET",
  "UPSC",
  "CAT",
  "GATE",
  "CUET",
  "Other",
] as const;

export type ExamType = (typeof EXAM_TYPES)[number];

// ─── AI Analysis ─────────────────────────────────────────────

/**
 * Structured result returned by Gemini for a single journal entry.
 * This shape is enforced by lib/gemini.ts#parseGeminiOutput — Gemini
 * must return exactly these fields as JSON, nothing more.
 */
export interface AnalysisResult {
  sentiment: string;
  stressLevel: number; // 0-10
  confidenceScore: number; // 0-1
  stressTriggers: string[];
  topics: string[];
  recommendedAction: string;
  followupQuestion: string;
  /**
   * True only when Gemini failed or returned unusable output after retrying,
   * and this result is the safe local fallback rather than a real analysis.
   * The UI should show this honestly (e.g. "we couldn't analyze this entry")
   * rather than presenting it as evidence-backed insight.
   */
  isFallback?: boolean;
}

// ─── Journal Entry ───────────────────────────────────────────

export interface JournalEntry {
  id: string;
  createdAt: string; // ISO timestamp

  mood: number; // 0-10
  sleepHours: number;
  studyHours: number;
  energyLevel: number; // 0-10

  examType: ExamType | string;

  journalText: string;

  analysis: AnalysisResult;
}

// ─── Derived Insights ────────────────────────────────────────

/** Generated locally from entry history — never by Gemini. */
export interface StressDNA {
  primaryTrigger: string;
  secondaryTrigger: string;
  confidenceDriver: string;
  recoveryStyle: string;
}

/** The single most evidence-backed recurring stressor. */
export interface InvisibleEnemy {
  trigger: string;
  occurrences: number;
  associatedWith: string[];
}

/** One point on the emotional timeline view. */
export interface TimelinePoint {
  label: string; // e.g. "Week 1"
  summary: string; // e.g. "Motivated"
  averageMood: number;
  averageStress: number;
}

/** A single, evidence-backed personalized action for "today". */
export interface PersonalizedAction {
  action: string;
  rationale: string;
}

// ─── API Contract (src/app/api/analyze) ─────────────────────

export interface GeminiAnalysisRequest {
  journalText: string;
  mood: number;
  sleepHours: number;
  studyHours: number;
  energyLevel: number;
  examType: ExamType | string;
}

export interface GeminiAnalysisResponse {
  result: AnalysisResult;
}

export interface GeminiErrorResponse {
  error: string;
}

// ─── Companion Chat ──────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Sent client -> /api/chat. `entries` travels with every request rather
 * than living server-side: there's no database (see lib/storage.ts), so
 * the client — the only place entries are persisted — supplies whatever
 * history it has each time.
 */
export interface ChatRequest {
  message: string;
  conversation: ChatMessage[];
  entries: JournalEntry[];
}

export interface ChatResponse {
  reply: string;
  /** True when a deterministic crisis-support message was returned
   *  instead of a Gemini-generated reply — see lib/safety.ts. */
  isCrisisResponse?: boolean;
  /** True when Gemini failed/retried-out and this is the safe fallback,
   *  mirroring AnalysisResult.isFallback. */
  isFallback?: boolean;
}
