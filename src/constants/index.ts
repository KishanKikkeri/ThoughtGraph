/**
 * ThoughtGraph — App-wide constants.
 */

export const APP_NAME = "ThoughtGraph";

export const APP_TAGLINE =
  "Discover the hidden patterns behind your stress before they become burnout.";

export { EXAM_TYPES } from "@/types/mental";
export type { ExamType } from "@/types/mental";

// ─── Analysis thresholds ─────────────────────────────────────
// Centralized here so lib/dna.ts and lib/analysis.ts agree on
// what counts as "high stress", "poor sleep", and "low confidence".

/** stressLevel (0-10) at or above this is treated as a high-stress entry. */
export const HIGH_STRESS_THRESHOLD = 7;

/** Average nightly sleep (hours) below this is flagged as poor sleep. */
export const LOW_SLEEP_THRESHOLD = 6;

/** confidenceScore (0-1) below this is flagged as low confidence. */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/** confidenceScore (0-1) at or above this counts toward the confidence driver. */
export const HIGH_CONFIDENCE_THRESHOLD = 0.5;

/** Average mood (0-10) below this is flagged as low mood. */
export const LOW_MOOD_THRESHOLD = 5;
