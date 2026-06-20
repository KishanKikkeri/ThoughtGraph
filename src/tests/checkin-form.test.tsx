import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckinForm } from "@/components/CheckinForm";
import { clearAllEntries, loadEntries } from "@/lib/storage";

const MOCK_RESULT = {
  sentiment: "negative",
  stressLevel: 7,
  confidenceScore: 0.4,
  stressTriggers: ["mock tests"],
  topics: ["physics"],
  recommendedAction: "Take a 5-minute reset after this session.",
  followupQuestion: "What felt hardest today?",
};

beforeEach(() => {
  clearAllEntries();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("CheckinForm", () => {
  it("renders the form with an accessible label", () => {
    render(<CheckinForm onSaved={() => {}} />);
    expect(screen.getByRole("form", { name: /daily check-in/i })).toBeInTheDocument();
  });

  it("disables submit until journal text is entered", () => {
    render(<CheckinForm onSaved={() => {}} />);
    expect(screen.getByRole("button", { name: /save check-in/i })).toBeDisabled();
  });

  it("posts to /api/analyze, saves the entry, and notifies the parent on submit", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: MOCK_RESULT }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSaved = vi.fn();
    render(<CheckinForm onSaved={onSaved} />);

    await user.type(
      screen.getByLabelText(/what's on your mind/i),
      "I scored poorly in my physics mock test again."
    );
    await user.click(screen.getByRole("button", { name: /save check-in/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({ method: "POST" })
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.journalText).toBe("I scored poorly in my physics mock test again.");

    const stored = loadEntries();
    expect(stored).toHaveLength(1);
    expect(stored[0].analysis.stressTriggers).toEqual(["mock tests"]);
  });

  it("clears the journal text after a successful save", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: MOCK_RESULT }) })
    );

    render(<CheckinForm onSaved={() => {}} />);
    const textarea = screen.getByLabelText(/what's on your mind/i);
    await user.type(textarea, "Feeling okay today.");
    await user.click(screen.getByRole("button", { name: /save check-in/i }));

    await waitFor(() => expect(textarea).toHaveValue(""));
  });

  it("shows an inline error and does not save when the request fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<CheckinForm onSaved={() => {}} />);
    await user.type(screen.getByLabelText(/what's on your mind/i), "Test entry.");
    await user.click(screen.getByRole("button", { name: /save check-in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't reach the server/i);
    expect(loadEntries()).toHaveLength(0);
  });
});
