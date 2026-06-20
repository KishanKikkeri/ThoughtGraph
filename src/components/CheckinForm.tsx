"use client";

import { useState, type FormEvent } from "react";
import { EXAM_TYPES, type ExamType } from "@/constants";
import { saveEntry } from "@/lib/storage";
import { createEntryId } from "@/lib/analysis";
import type { GeminiAnalysisResponse, GeminiErrorResponse, JournalEntry } from "@/types/mental";

type Status = "idle" | "submitting" | "error";

const DEFAULTS = {
  mood: 5,
  sleepHours: 7,
  studyHours: 6,
  energyLevel: 5,
  examType: EXAM_TYPES[0] as ExamType | string,
};

/**
 * The daily check-in. On submit: POST to /api/analyze (server-side Gemini
 * call), persist the resulting entry via lib/storage.ts, then notify the
 * parent so the dashboard can re-derive insights. A failed network call to
 * the route itself (not a Gemini hiccup — that's handled server-side and
 * always returns 200, see lib/gemini.ts) surfaces inline rather than losing
 * the student's writing.
 */
export function CheckinForm({ onSaved }: { onSaved?: (entry: JournalEntry) => void }) {
  const [journalText, setJournalText] = useState("");
  const [examType, setExamType] = useState<string>(DEFAULTS.examType);
  const [mood, setMood] = useState(DEFAULTS.mood);
  const [sleepHours, setSleepHours] = useState(DEFAULTS.sleepHours);
  const [studyHours, setStudyHours] = useState(DEFAULTS.studyHours);
  const [energyLevel, setEnergyLevel] = useState(DEFAULTS.energyLevel);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!journalText.trim() || status === "submitting") return;

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journalText, mood, sleepHours, studyHours, energyLevel, examType }),
      });

      const data: GeminiAnalysisResponse | GeminiErrorResponse = await res.json();

      if (!res.ok || !("result" in data)) {
        const message = "error" in data ? data.error : "Something went wrong analyzing that entry.";
        setStatus("error");
        setErrorMessage(message);
        return;
      }

      const entry: JournalEntry = {
        id: createEntryId(),
        createdAt: new Date().toISOString(),
        mood,
        sleepHours,
        studyHours,
        energyLevel,
        examType,
        journalText: journalText.trim(),
        analysis: data.result,
      };

      saveEntry(entry);
      onSaved?.(entry);

      setJournalText("");
      setMood(DEFAULTS.mood);
      setSleepHours(DEFAULTS.sleepHours);
      setStudyHours(DEFAULTS.studyHours);
      setEnergyLevel(DEFAULTS.energyLevel);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the server. Your entry hasn't been saved — try again.");
    }
  }

  return (
    <form
      aria-label="Daily Check-In"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[var(--color-surface-line)] bg-[var(--color-surface)] p-6"
    >
      <h2 className="font-display text-xl italic text-[var(--color-ink)]">Today&apos;s Check-In</h2>

      <div className="mt-5 flex flex-col gap-1.5">
        <label htmlFor="journalText" className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          What&apos;s on your mind?
        </label>
        <textarea
          id="journalText"
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          required
          rows={4}
          placeholder="Write freely about your day, your study session, how you're feeling..."
          className="rounded-xl border border-[var(--color-surface-line)] bg-[var(--color-bg)] p-3 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] focus-visible:border-[var(--color-thread)]"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="examType" className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
          Exam
        </label>
        <select
          id="examType"
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
          className="rounded-xl border border-[var(--color-surface-line)] bg-[var(--color-bg)] p-2.5 text-sm text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-thread)]"
        >
          {EXAM_TYPES.map((exam) => (
            <option key={exam} value={exam}>
              {exam}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <SliderField id="mood" label="Mood" value={mood} onChange={setMood} />
        <SliderField id="energyLevel" label="Energy" value={energyLevel} onChange={setEnergyLevel} />
        <NumberField id="sleepHours" label="Sleep (hrs)" value={sleepHours} max={14} onChange={setSleepHours} />
        <NumberField id="studyHours" label="Study (hrs)" value={studyHours} max={16} onChange={setStudyHours} />
      </div>

      {status === "error" && errorMessage && (
        <p role="alert" className="mt-4 text-xs text-[var(--color-signal)]">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting" || !journalText.trim()}
        className="mt-5 w-full rounded-full bg-[var(--color-thread)] px-5 py-2.5 text-sm font-medium text-[var(--color-bg)] transition-opacity disabled:opacity-50"
      >
        {status === "submitting" ? "Analyzing..." : "Save check-in"}
      </button>
    </form>
  );
}

function SliderField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        <span>{label}</span>
        <span className="text-[var(--color-ink)]">{value}</span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--color-thread)]"
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-ink-muted)]">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={max}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-xl border border-[var(--color-surface-line)] bg-[var(--color-bg)] p-2 text-sm text-[var(--color-ink)] outline-none focus-visible:border-[var(--color-thread)]"
      />
    </div>
  );
}
