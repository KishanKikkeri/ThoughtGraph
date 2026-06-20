import type { TimelinePoint } from "@/types/mental";

const SCALE_MAX = 10;

/**
 * Week-by-week mood/stress evolution — see lib/analysis.ts#buildTimeline.
 * Deliberately plain markup + CSS (no D3/charting library): two bars per
 * week, scaled against a fixed 0-10 axis so weeks are visually comparable.
 */
export function Timeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <p data-testid="timeline-empty" className="text-sm text-[var(--color-ink-muted)]">
        Your emotional timeline appears once you have a few check-ins.
      </p>
    );
  }

  return (
    <section
      aria-label="Emotional Timeline"
      className="rounded-2xl border border-[var(--color-surface-line)] bg-[var(--color-surface)] p-6"
    >
      <h2 className="font-display text-xl italic text-[var(--color-ink)]">Emotional Timeline</h2>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        Mood and stress, averaged week by week.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {points.map((p) => (
          <div key={p.label} data-testid="timeline-point" className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span data-testid="timeline-label" className="text-sm font-medium text-[var(--color-ink)]">
                {p.label}
              </span>
              <span data-testid="timeline-summary" className="text-xs text-[var(--color-ink-muted)]">
                {p.summary}
              </span>
            </div>
            <TimelineBar label="Mood" value={p.averageMood} color="var(--color-thread)" />
            <TimelineBar label="Stress" value={p.averageStress} color="var(--color-signal)" />
          </div>
        ))}
      </div>
    </section>
  );
}

function TimelineBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / SCALE_MAX) * 100));
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[0.65rem] uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {label}
      </span>
      <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-line)]">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[0.65rem] text-[var(--color-ink-muted)]">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
