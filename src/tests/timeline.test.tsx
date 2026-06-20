import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Timeline } from "@/components/Timeline";
import type { TimelinePoint } from "@/types/mental";

const MOCK_POINTS: TimelinePoint[] = [
  { label: "Week 1", summary: "Motivated", averageMood: 7.2, averageStress: 4.1 },
  { label: "Week 2", summary: "High stress", averageMood: 4.5, averageStress: 8.3 },
];

describe("Timeline", () => {
  it("renders an empty state when there are no points", () => {
    render(<Timeline points={[]} />);
    expect(screen.getByTestId("timeline-empty")).toBeInTheDocument();
  });

  it("renders one row per timeline point", () => {
    render(<Timeline points={MOCK_POINTS} />);
    expect(screen.getAllByTestId("timeline-point")).toHaveLength(2);
  });

  it("renders each week's label and summary", () => {
    render(<Timeline points={MOCK_POINTS} />);
    const labels = screen.getAllByTestId("timeline-label").map((el) => el.textContent);
    const summaries = screen.getAllByTestId("timeline-summary").map((el) => el.textContent);
    expect(labels).toEqual(["Week 1", "Week 2"]);
    expect(summaries).toEqual(["Motivated", "High stress"]);
  });

  it("has an accessible section label", () => {
    render(<Timeline points={MOCK_POINTS} />);
    expect(screen.getByRole("region", { name: /emotional timeline/i })).toBeInTheDocument();
  });
});
