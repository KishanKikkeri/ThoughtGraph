import type { StressDNA } from "@/types/mental";

const FIELD_LABELS: { key: keyof StressDNA; label: string; testId: string }[] = [
  { key: "primaryTrigger", label: "Primary trigger", testId: "primary-trigger" },
  { key: "secondaryTrigger", label: "Secondary trigger", testId: "secondary-trigger" },
  { key: "confidenceDriver", label: "Confidence driver", testId: "confidence-driver" },
  { key: "recoveryStyle", label: "Recovery style", testId: "recovery-style" },
];

/**
 * The four-strand summary of a student's stress pattern, derived
 * deterministically by lib/dna.ts#generateStressDNA — never by Gemini.
 */
export function StressDNACard({ dna }: { dna: StressDNA }) {
  return (
    <section
      aria-label="Stress DNA"
      className="rounded-2xl border border-[var(--color-surface-line)] bg-[var(--color-surface)] p-6"
    >
      <h2 className="font-display text-xl italic text-[var(--color-ink)]">Stress DNA</h2>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        Four recurring strands, pulled from your check-in history.
      </p>

      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELD_LABELS.map(({ key, label, testId }) => (
          <div key={key} className="rounded-xl border border-[var(--color-surface-line)] p-4">
            <dt className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[var(--color-ink-muted)]">
              {label}
            </dt>
            <dd data-testid={testId} className="mt-1.5 text-sm leading-snug text-[var(--color-ink)]">
              {dna[key]}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
