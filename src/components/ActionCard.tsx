/**
 * Today's single, evidence-backed action — see lib/actions.ts#generateAction.
 * `action` and `rationale` are passed as plain strings rather than the
 * full PersonalizedAction object so this card stays easy to test and
 * easy to reuse (e.g. inside a notification or summary later).
 */
export function ActionCard({ action, rationale }: { action: string; rationale: string }) {
  return (
    <article
      aria-label="Personalized Action"
      className="rounded-2xl border border-[var(--color-thread)]/30 bg-[var(--color-surface)] p-6"
    >
      <h2 className="font-display text-xl italic text-[var(--color-ink)]">Today&apos;s Action</h2>
      <p data-testid="action-text" className="mt-3 text-base leading-relaxed text-[var(--color-ink)]">
        {action}
      </p>
      <p
        data-testid="action-rationale"
        className="mt-3 text-xs leading-relaxed text-[var(--color-ink-muted)]"
      >
        {rationale}
      </p>
    </article>
  );
}
