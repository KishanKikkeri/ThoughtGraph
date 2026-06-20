/**
 * ThoughtGraph — Companion Chat orchestrator.
 *
 * Server-side only (called from src/app/api/chat/route.ts). Builds a
 * grounded prompt from lib/chat-context.ts, calls Gemini via the same
 * client as lib/gemini.ts#analyzeJournal, and applies the same
 * Prompt -> Gemini -> Validate -> Retry (once) -> Fallback safety
 * pipeline so a flaky AI call can never crash the chat.
 *
 * One addition analyzeJournal doesn't need: a crisis intercept that runs
 * BEFORE Gemini is ever called. This product is a pattern-reflection
 * tool, not a crisis counselor, and a generative reply is the wrong
 * thing to risk in a moment like that — see lib/safety.ts.
 */

import { callGemini } from "@/lib/gemini";
import { buildChatContext } from "@/lib/chat-context";
import { detectCrisisSignals, CRISIS_RESPONSE } from "@/lib/safety";
import type { ChatMessage, JournalEntry } from "@/types/mental";

const MAX_ATTEMPTS = 2;
/** Caps how much conversation rides along on every turn — keeps the
 *  prompt bounded, per the CTO doc's "keep it simple, no memory graph". */
const MAX_CONVERSATION_TURNS = 6;

export interface CompanionInput {
  message: string;
  conversation: ChatMessage[];
  entries: JournalEntry[];
}

export interface CompanionResult {
  reply: string;
  isCrisisResponse?: boolean;
  isFallback?: boolean;
}

const SYSTEM_RULE = `You are the ThoughtGraph Companion: a grounded reflection tool for a student preparing for a competitive exam (JEE/NEET/UPSC/CAT/GATE/CUET).

You must ONLY use the data given below. Never invent facts about the student's history, emotions, or circumstances beyond what's provided. If the data is limited, say so plainly instead of guessing.

Structure your reply in three short parts:
1. A brief, grounded reflection of what they're describing (empathetic, not clinical).
2. One pattern insight — but ONLY if the Stress DNA, Invisible Enemy, or history below actually supports it. If there isn't enough evidence, skip this part instead of inventing a pattern.
3. One small, concrete suggestion for right now.

Keep the whole reply under 120 words. Do not diagnose. Do not use clinical labels. Be warm but plain-spoken — never generic motivational filler.`;

function buildPrompt(input: CompanionInput): string {
  const ctx = buildChatContext(input.entries);
  const recentTurns = input.conversation.slice(-MAX_CONVERSATION_TURNS);
  const conversationText =
    recentTurns.length > 0
      ? recentTurns
          .map((t) => `${t.role === "user" ? "Student" : "Companion"}: ${t.content}`)
          .join("\n")
      : "(no prior messages this session)";

  return `${SYSTEM_RULE}

TODAY'S CHECK-IN:
${ctx.todaySummary}

RECENT HISTORY:
${ctx.historyLines.length > 0 ? ctx.historyLines.join("\n") : "(no earlier entries)"}

STRESS DNA:
${ctx.stressDNASummary}

INVISIBLE ENEMY:
${ctx.invisibleEnemySummary}

CONVERSATION SO FAR:
${conversationText}

STUDENT'S NEW MESSAGE:
"""
${input.message}
"""

Respond to the student's new message now, following the three-part structure above.`;
}

function parseChatReply(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) {
    throw new Error("Gemini returned an empty chat reply.");
  }
  return cleaned;
}

function buildFallbackReply(): CompanionResult {
  return {
    reply:
      "I'm having trouble responding right now — your check-ins are saved safely, so it's worth trying again in a moment.",
    isFallback: true,
  };
}

function buildEmptyDataReply(): CompanionResult {
  return {
    reply:
      "Start journaling to get personalized insights — once you've logged a check-in or two, I can reflect real patterns back to you instead of guessing.",
  };
}

/**
 * Generates the Companion's reply to one chat message. Never throws for
 * AI instability (always resolves to a usable CompanionResult, falling
 * back when necessary) — see module docstring for the safety pipeline.
 */
export async function getCompanionReply(input: CompanionInput): Promise<CompanionResult> {
  // Crisis check runs on both the live message and the most recent
  // journal entry — a crisis can surface in either place, and either
  // should short-circuit straight to real support, before any Gemini call.
  const crisisInMessage = detectCrisisSignals(input.message);
  const crisisInLatestEntry =
    input.entries.length > 0 && detectCrisisSignals(input.entries[0].journalText);

  if (crisisInMessage || crisisInLatestEntry) {
    return { reply: CRISIS_RESPONSE, isCrisisResponse: true };
  }

  if (input.entries.length === 0) {
    return buildEmptyDataReply();
  }

  const prompt = buildPrompt(input);
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callGemini(prompt);
      return { reply: parseChatReply(raw) };
    } catch (err) {
      lastError = err;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Unknown error";
  console.error(
    `[companion] getCompanionReply falling back after ${MAX_ATTEMPTS} attempts: ${message}`
  );
  return buildFallbackReply();
}
