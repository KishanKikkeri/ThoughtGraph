/**
 * ThoughtGraph — Companion Chat safety net.
 *
 * This app is built for students preparing for high-stakes exams
 * (JEE/NEET/UPSC/...). That population carries real, well-documented
 * mental-health risk around exam stress. The Companion Chat (lib/companion.ts)
 * is otherwise a "summarize stored data, never invent" pattern-reflection
 * tool — it is explicitly NOT a crisis-counseling product, so when an entry
 * or chat message signals real crisis, the right move is to stop reflecting
 * patterns and hand off to real human support immediately and deterministically.
 *
 * Deliberately simple: a small set of explicit phrases, not a clinical
 * classifier. False negatives are expected and acceptable here — this is a
 * safety net layered in front of a wellness-pattern tool, not a diagnostic
 * system. It only needs to catch unambiguous language; anything subtler
 * should reach a human, not be silently absorbed into "stress trigger" data.
 */

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(ing)? myself\b/i,
  /\bsuicid(e|al)\b/i,
  /\bend(ing)? my (own )?life\b/i,
  /\b(want|wish|going|planning) to die\b/i,
  /\bdon'?t want to live\b/i,
  /\bbetter off dead\b/i,
  /\bno (reason|point) (to|in) liv(e|ing)\b/i,
  /\bself[- ]?harm\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bcan'?t (go on|do this anymore|take (it|this) anymore)\b/i,
];

/** Checks free text (a chat message or a journal entry) for explicit
 *  crisis language. Conservative by design — see module docstring. */
export function detectCrisisSignals(text: string): boolean {
  if (!text || !text.trim()) return false;
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * The fixed, human-reviewed response shown instead of a Gemini-generated
 * reply whenever detectCrisisSignals() fires. Deterministic on purpose:
 * a moment like this is not the place for a generative, unpredictable
 * response — see lib/companion.ts#getCompanionReply.
 *
 * Numbers verified as of this build: Tele-MANAS explicitly covers exam
 * stress and is government-run, 24/7, 20+ languages; KIRAN is the older
 * govt mental-health rehabilitation helpline, also 24/7; 112 is India's
 * unified emergency number. Recheck periodically — helplines change.
 */
export const CRISIS_RESPONSE = `I'm really glad you told me this, and I want to take it seriously — more seriously than I'm able to on my own.

I'm a pattern-reflection tool, not a crisis counselor, but real help is available right now:

- Tele-MANAS — 14416 or 1800-891-4416 (24/7, free, confidential, government-run, 20+ languages, and they specifically support students dealing with exam stress)
- KIRAN Mental Health Helpline — 1800-599-0019 (24/7)

If you're in immediate danger, please call 112 (India's emergency number) or go to the nearest hospital right now.

Please also tell someone you trust — a parent, friend, teacher, or counselor — what you're going through. You don't have to carry this alone, and no exam result is worth your life.

I'll still be here if you want to keep writing, but please reach out to one of the people or numbers above too.`;
