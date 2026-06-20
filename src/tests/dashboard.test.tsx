/**
 * Dashboard integration tests.
 *
 * These tests verify that dashboard cards and insight sections
 * render correctly given known prop shapes.
 *
 * These were originally written against stub components ahead of
 * Agent-2's implementation; they now import the real components from
 * src/components so the contract is enforced against actual code.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StressDNACard } from "@/components/StressDNACard";
import { InvisibleEnemyCard } from "@/components/InvisibleEnemyCard";
import { ActionCard } from "@/components/ActionCard";
import { EntryHistory } from "@/components/EntryHistory";
import type { StressDNA, InvisibleEnemy, JournalEntry } from "@/types/mental";

// ─── Fixtures ─────────────────────────────────

const MOCK_DNA: StressDNA = {
  primaryTrigger: "Mock Test Performance",
  secondaryTrigger: "Fear of Falling Behind",
  confidenceDriver: "Completed Study Goals",
  recoveryStyle: "Achievement Reinforcement",
};

const MOCK_ENEMY: InvisibleEnemy = {
  trigger: "Performance Anxiety",
  occurrences: 7,
  associatedWith: ["Poor Sleep", "Low Confidence"],
};

function makeEntry(id: string): JournalEntry {
  return {
    id,
    createdAt: new Date().toISOString(),
    mood: 6,
    sleepHours: 7,
    studyHours: 8,
    energyLevel: 6,
    examType: "JEE",
    journalText: `Journal entry ${id}`,
    analysis: {
      sentiment: "neutral",
      stressLevel: 5,
      confidenceScore: 0.5,
      stressTriggers: ["mock tests"],
      topics: ["physics"],
      recommendedAction: "Take breaks regularly.",
      followupQuestion: "What felt hardest today?",
    },
  };
}

// ─── StressDNA Card ───────────────────────────

describe("StressDNACard", () => {
  it("renders all four DNA fields", () => {
    render(<StressDNACard dna={MOCK_DNA} />);
    expect(screen.getByTestId("primary-trigger")).toHaveTextContent(
      "Mock Test Performance"
    );
    expect(screen.getByTestId("secondary-trigger")).toHaveTextContent(
      "Fear of Falling Behind"
    );
    expect(screen.getByTestId("confidence-driver")).toHaveTextContent(
      "Completed Study Goals"
    );
    expect(screen.getByTestId("recovery-style")).toHaveTextContent(
      "Achievement Reinforcement"
    );
  });

  it("has an accessible section label", () => {
    render(<StressDNACard dna={MOCK_DNA} />);
    expect(screen.getByRole("region", { name: /stress dna/i })).toBeInTheDocument();
  });
});

// ─── InvisibleEnemy Card ──────────────────────

describe("InvisibleEnemyCard", () => {
  it("renders the enemy trigger and occurrence count", () => {
    render(<InvisibleEnemyCard enemy={MOCK_ENEMY} />);
    expect(screen.getByTestId("enemy-trigger")).toHaveTextContent(
      "Performance Anxiety"
    );
    expect(screen.getByTestId("enemy-occurrences")).toHaveTextContent(
      "Mentioned in 7 entries"
    );
  });

  it("renders all associated factors", () => {
    render(<InvisibleEnemyCard enemy={MOCK_ENEMY} />);
    const items = screen.getAllByTestId("enemy-association");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Poor Sleep");
    expect(items[1]).toHaveTextContent("Low Confidence");
  });

  it("has an accessible article label", () => {
    render(<InvisibleEnemyCard enemy={MOCK_ENEMY} />);
    expect(
      screen.getByRole("article", { name: /invisible enemy/i })
    ).toBeInTheDocument();
  });
});

// ─── ActionCard ───────────────────────────────

describe("ActionCard", () => {
  it("displays the action text and rationale", () => {
    render(
      <ActionCard
        action="Take a 5-minute reset after every 90-minute study block."
        rationale="This strategy correlated with higher confidence in 3 previous entries."
      />
    );
    expect(screen.getByTestId("action-text")).toHaveTextContent(
      "Take a 5-minute reset"
    );
    expect(screen.getByTestId("action-rationale")).toHaveTextContent(
      "correlated with higher confidence"
    );
  });
});

// ─── EntryHistory ─────────────────────────────

describe("EntryHistory", () => {
  it("renders an empty-state message when there are no entries", () => {
    render(<EntryHistory entries={[]} />);
    expect(screen.getByTestId("empty-history")).toBeInTheDocument();
  });

  it("renders one card per entry", () => {
    const entries = [makeEntry("x1"), makeEntry("x2"), makeEntry("x3")];
    render(<EntryHistory entries={entries} />);
    expect(screen.getAllByTestId("history-entry")).toHaveLength(3);
  });

  it("displays journal text inside each entry card", () => {
    render(<EntryHistory entries={[makeEntry("z1")]} />);
    expect(screen.getByText("Journal entry z1")).toBeInTheDocument();
  });
});
