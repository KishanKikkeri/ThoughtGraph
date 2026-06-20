import type { JournalEntry } from "@/types/mental";

/** Renders the user's check-in history, newest first. */
export function EntryHistory({ entries }: { entries: JournalEntry[] }) {
  if (entries.length === 0) {
    return (
      <p data-testid="empty-history" className="text-sm text-[var(--color-ink-muted)]">
        No entries yet. Start your first check-in.
      </p>
    );
  }

  return (
    <section aria-label="Entry History" className="flex flex-col gap-3">
      {entries.map((e) => (
        <article
          key={e.id}
          data-testid="history-entry"
          className="rounded-xl border border-[var(--color-surface-line)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              {e.examType}
            </span>
            <time dateTime={e.createdAt} className="text-xs text-[var(--color-ink-muted)]">
              {formatDate(e.createdAt)}
            </time>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink)]">{e.journalText}</p>
          {e.analysis.stressTriggers.length > 0 && (
            <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
              Stress level {e.analysis.stressLevel}/10 · {e.analysis.stressTriggers.join(", ")}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
