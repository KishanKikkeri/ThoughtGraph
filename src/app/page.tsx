"use client";

import { APP_NAME, APP_TAGLINE } from "@/constants";
import { useJournalEntries } from "@/lib/storage";
import { buildInsights, buildTimeline } from "@/lib/analysis";
import { generateAction } from "@/lib/actions";
import { CheckinForm } from "@/components/CheckinForm";
import { StressDNACard } from "@/components/StressDNACard";
import { InvisibleEnemyCard } from "@/components/InvisibleEnemyCard";
import { ActionCard } from "@/components/ActionCard";
import { Timeline } from "@/components/Timeline";
import { EntryHistory } from "@/components/EntryHistory";
import { CompanionChat } from "@/components/CompanionChat";

export default function Home() {
  // Subscribes directly to localStorage; re-renders whenever CheckinForm
  // (or another tab) saves a new entry — see lib/storage.ts#useJournalEntries.
  const entries = useJournalEntries();

  const insights = buildInsights(entries);
  const timeline = buildTimeline(entries);
  const action = generateAction(entries, insights.stressDNA, insights.invisibleEnemy);

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-16 sm:py-20">
      <ConstellationBackdrop />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-12">
        <header className="flex flex-col items-center text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-[var(--color-thread)]">
            Pattern discovery engine
          </p>
          <h1 className="font-display mt-5 text-4xl italic leading-tight text-[var(--color-ink)] sm:text-5xl">
            {APP_NAME}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-ink-muted)] sm:text-base">
            {APP_TAGLINE}
          </p>
        </header>

        <div className="flex w-full flex-col gap-8">
          <CheckinForm />
          <CompanionChat entries={entries} />

          {entries.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <ActionCard action={action.action} rationale={action.rationale} />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <StressDNACard dna={insights.stressDNA} />
                {insights.invisibleEnemy && <InvisibleEnemyCard enemy={insights.invisibleEnemy} />}
              </div>

              <Timeline points={timeline} />

              <div className="flex flex-col gap-3">
                <h2 className="font-display text-xl italic text-[var(--color-ink)]">
                  Entry History
                </h2>
                <EntryHistory entries={entries} />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--color-surface-line)] px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-[var(--color-signal)]"
      />
      <p className="text-sm text-[var(--color-ink-muted)]">
        Your Stress DNA, Invisible Enemy, and emotional timeline will appear here
        after your first check-in above.
      </p>
    </div>
  );
}

/**
 * Faint constellation of connected nodes — a literal rendering of the
 * product's core idea: scattered entries, linked into a graph of patterns.
 * Decorative and aria-hidden; never the only carrier of information.
 */
function ConstellationBackdrop() {
  const nodes = [
    { x: 80, y: 120 },
    { x: 260, y: 60 },
    { x: 420, y: 160 },
    { x: 180, y: 260 },
    { x: 560, y: 90 },
    { x: 620, y: 280 },
    { x: 340, y: 320 },
    { x: 500, y: 360 },
  ];
  const edges: [number, number][] = [
    [0, 1],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 6],
    [4, 5],
    [5, 7],
    [6, 7],
  ];

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 700 420"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
      preserveAspectRatio="xMidYMid slice"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="var(--color-thread)"
          strokeWidth="1"
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="3.5" fill="var(--color-signal)" />
      ))}
    </svg>
  );
}
