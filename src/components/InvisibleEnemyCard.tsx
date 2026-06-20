import type { InvisibleEnemy } from "@/types/mental";

/**
 * Surfaces the single most evidence-backed recurring stressor — the
 * trigger that keeps showing up specifically in high-stress entries
 * (lib/dna.ts#findInvisibleEnemy). Only rendered when one exists.
 */
export function InvisibleEnemyCard({ enemy }: { enemy: InvisibleEnemy }) {
  return (
    <article
      aria-label="Invisible Enemy"
      className="rounded-2xl border border-[var(--color-signal)]/30 bg-[var(--color-surface)] p-6"
    >
      <h2 className="font-display text-xl italic text-[var(--color-ink)]">Invisible Enemy</h2>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        The pattern showing up most often in your hardest days.
      </p>

      <p
        data-testid="enemy-trigger"
        className="mt-4 text-2xl font-semibold text-[var(--color-signal)]"
      >
        {enemy.trigger}
      </p>
      <p data-testid="enemy-occurrences" className="mt-1 text-sm text-[var(--color-ink-muted)]">
        Mentioned in {enemy.occurrences} entries
      </p>

      {enemy.associatedWith.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {enemy.associatedWith.map((a) => (
            <li
              key={a}
              data-testid="enemy-association"
              className="rounded-full border border-[var(--color-surface-line)] px-3 py-1 text-xs text-[var(--color-ink-muted)]"
            >
              {a}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
