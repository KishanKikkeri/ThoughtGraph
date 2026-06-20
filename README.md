# ThoughtGraph

> Discover the hidden patterns behind your stress before they become burnout.

An AI pattern-discovery engine for students preparing for high-stakes exams
(JEE, NEET, UPSC, CAT, GATE, CUET). Instead of asking "how do you feel today?",
ThoughtGraph asks "why do you keep feeling this way?" — and proves it with
evidence pulled from the student's own journal history.

## Status: Core Check-In + Analysis Pipeline (Agent-2) ✅

This build implements **Agent-1 (Foundation Setup)** and **Agent-2 (Core
Check-In + Analysis Pipeline)** per the PROJECT LOCK spec: Stress DNA,
Invisible Enemy, the emotional Timeline, and a personalized Action Generator
all now have real UI, wired end-to-end to `/api/analyze` and local storage —
not just backend logic.

What's here:

- Next.js 16 + TypeScript + Tailwind v4 app shell
- Full type system (`src/types/mental.ts`)
- OpenRouter client (calling Google Gemini 2.5 Flash via OpenRouter) with a strict JSON prompt contract, validation, and a
  retry-once-then-fallback safety pipeline (`src/lib/gemini.ts`)
- Stress DNA + Invisible Enemy algorithms, computed locally — not by Gemini,
  so they're deterministic and fully testable (`src/lib/dna.ts`)
- Action Generator (`src/lib/actions.ts`): picks today's action from the
  latest entry's Gemini-suggested `recommendedAction` and grounds the
  rationale only in already-computed Stress DNA / Invisible Enemy evidence
  — never a fabricated reason
- LocalStorage persistence service, with a `useJournalEntries()` React hook
  (`useSyncExternalStore`) so the dashboard reacts to saves automatically —
  same tab or another (`src/lib/storage.ts`)
- Insights orchestration layer (`src/lib/analysis.ts`)
- `/api/analyze` server route (Gemini key never reaches the client)
- Real dashboard UI (`src/components/`): `CheckinForm`, `StressDNACard`,
  `InvisibleEnemyCard`, `ActionCard`, `Timeline`, `EntryHistory` — all built
  to match the component contracts originally locked in
  `tests/dashboard.test.tsx`
- Vitest + Testing Library, fully configured — **10 suites, 79 tests**,
  including core-flow, API-contract, AI-failure, and component-render
  coverage (see below)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then add your real OPENROUTER_API_KEY
npm run dev                        # http://localhost:3000
```

```bash
npm test            # run the full test suite once
npm run test:watch  # watch mode
npm run lint         # ESLint
```

## AI safety pipeline

A flaky or hostile OpenRouter response must never crash a check-in or the demo.
`analyzeJournal()` in `src/lib/gemini.ts` enforces:

```text
Prompt -> OpenRouter -> Validate JSON -> Retry (once) -> Fallback -> Store
```

- Output is strictly validated (`parseGeminiOutput`): wrong type, missing
  fields, or non-JSON text all throw immediately.
- On failure, exactly one retry is attempted (2 calls total, never more).
- If both attempts fail — bad output, network error, missing API key —
  `analyzeJournal()` resolves to a safe, honest fallback result
  (`result.isFallback === true`) instead of throwing. It deliberately
  contains no fabricated triggers or topics, so the UI can say "we
  couldn't analyze this one" rather than presenting guesswork as evidence.
- `POST /api/analyze` therefore returns `200` even when OpenRouter is down;
  the route's `try/catch` is just a backstop for genuinely unexpected
  errors, not the AI-instability path.

Each entry's analysis is computed once and persisted with it
(`lib/storage.ts`) — the dashboard reads the stored result rather than
re-calling Gemini, so re-rendering or revisiting history costs zero API calls.

## Folder structure

```text
src/
├── app/
│   ├── page.tsx               # client dashboard: check-in + insights
│   ├── layout.tsx
│   ├── globals.css
│   └── api/analyze/route.ts   # POST journal entry -> Gemini -> AnalysisResult
│
├── components/
│   ├── CheckinForm.tsx         # daily check-in, posts to /api/analyze
│   ├── StressDNACard.tsx       # 4-strand Stress DNA summary
│   ├── InvisibleEnemyCard.tsx  # top evidence-backed recurring stressor
│   ├── ActionCard.tsx          # today's action + evidence-based rationale
│   ├── Timeline.tsx            # week-by-week mood/stress (plain CSS bars)
│   └── EntryHistory.tsx        # past check-ins, newest first
│
├── lib/
│   ├── gemini.ts               # prompt contract, JSON parsing/validation, safety pipeline
│   ├── storage.ts              # localStorage save/load/delete + useJournalEntries() hook
│   ├── analysis.ts             # combines storage + dna into dashboard-ready data
│   ├── dna.ts                  # Stress DNA + Invisible Enemy (pure, local)
│   └── actions.ts              # Action Generator (pure, evidence-based, local)
│
├── types/
│   └── mental.ts               # JournalEntry, AnalysisResult, StressDNA, ...
│
├── tests/
│   ├── parser.test.ts          # Gemini JSON parsing (valid / malformed / markdown)
│   ├── dna.test.ts             # trigger aggregation, dominant trigger selection
│   ├── actions.test.ts         # Action Generator rationale grounding
│   ├── storage.test.ts         # save / load / delete
│   ├── dashboard.test.tsx      # StressDNACard / InvisibleEnemyCard / ActionCard / EntryHistory
│   ├── timeline.test.tsx       # Timeline render contract
│   ├── checkin-form.test.tsx   # check-in submit flow against a mocked /api/analyze
│   ├── gemini.test.ts          # AI failure tests — retry-once-then-fallback
│   ├── route.test.ts           # API contract tests for /api/analyze
│   └── core-flow.test.ts       # check-in -> storage -> insights, end to end
│
└── constants/
    └── index.ts                # app name, tagline, exam types, thresholds
```

## Security

`OPENROUTER_API_KEY` is read only in `src/lib/gemini.ts`, called only from the
server-side `/api/analyze` route. It is never prefixed `NEXT_PUBLIC_` and
never reaches the client bundle.

## Submission safety

- **Repo size:** source (excluding `node_modules`/`.next`) is ~530KB, well
  under any reasonable repo-size cap. No media assets, no heavy charting
  libraries — patterns are rendered with plain markup/CSS, not D3 or similar.
- **Dependencies:** kept minimal and stock (Next.js, React, Tailwind,
  Vitest/Testing Library). Nothing experimental in the runtime path.
- **Branching:** intended for trunk-based development — commit directly to
  `main` in small, atomic, feature-scoped commits rather than long-lived
  branches, so the project is always in a demoable state.
- **No silent failure:** the AI safety pipeline above means a Gemini outage
  during a live demo degrades gracefully instead of crashing the app.

## Next milestone — Agent-3

Core feature set (Stress DNA, Invisible Enemy, Timeline, Action Generator)
now has real UI and is wired end-to-end. What's still open, in priority
order:

1. **ThoughtGraph visualization** — the namesake feature: a literal
   graph-style rendering of stress chains (trigger → behavior → outcome),
   not just the list-based cards that exist today.
2. **Memory-aware AI responses** — have the AI explicitly reference past
   entries ("this matches your pattern from last week") instead of only
   reasoning about the current one.
3. **Feedback loop** — a lightweight "did this help?" follow-up after a
   check-in, feeding back into future Action Generator output.
4. **Stress DNA evolution view** — the Timeline already shows mood/stress
   per week; layer the DNA fields (primary trigger, recovery style, ...)
   onto the same time axis so the *story* of how the pattern shifted is
   visible, not just the weekly averages.
