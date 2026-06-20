"use client";

import { useState, type FormEvent } from "react";
import type { ChatMessage, ChatResponse, GeminiErrorResponse, JournalEntry } from "@/types/mental";

type DisplayMessage = ChatMessage & { isCrisisResponse?: boolean; isFallback?: boolean };

/**
 * The Companion Chat panel. Conversation lives only in component state —
 * deliberately not persisted (see lib/companion.ts's "keep it simple, no
 * memory graph" note) — and `entries` travels to the server on every turn
 * so replies stay grounded in the student's actual check-in history.
 */
export function CompanionChat({ entries }: { entries: JournalEntry[] }) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: DisplayMessage = { role: "user", content: text };
    const conversation = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversation, entries }),
      });

      const data: ChatResponse | GeminiErrorResponse = await res.json();

      const reply: DisplayMessage =
        "reply" in data
          ? {
              role: "assistant",
              content: data.reply,
              isCrisisResponse: data.isCrisisResponse,
              isFallback: data.isFallback,
            }
          : {
              role: "assistant",
              content: "Something went wrong on my end — try sending that again.",
              isFallback: true,
            };

      setMessages((prev) => [...prev, reply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Couldn't reach the server. Your check-ins are safe — try again in a moment.",
          isFallback: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label="Companion Chat"
      className="flex flex-col rounded-2xl border border-[var(--color-surface-line)] bg-[var(--color-surface)] p-6"
    >
      <h2 className="font-display text-xl italic text-[var(--color-ink)]">Talk it through</h2>
      <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
        Grounded in your own check-ins — never invents a pattern that isn&apos;t there.
      </p>

      <div className="mt-4 flex max-h-96 flex-col gap-3 overflow-y-auto" aria-live="polite">
        {messages.length === 0 && (
          <p data-testid="chat-empty" className="text-sm text-[var(--color-ink-muted)]">
            Ask what&apos;s behind a pattern, or just say how today went.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {sending && (
          <p data-testid="chat-typing" className="text-xs text-[var(--color-ink-muted)]">
            Thinking through your check-ins...
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
        <label htmlFor="chatInput" className="sr-only">
          Message the Companion
        </label>
        <input
          id="chatInput"
          data-testid="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-[var(--color-surface-line)] bg-[var(--color-bg)] px-4 py-2 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-muted)] focus-visible:border-[var(--color-thread)]"
        />
        <button
          type="submit"
          data-testid="chat-send"
          disabled={sending || !input.trim()}
          className="rounded-full bg-[var(--color-thread)] px-5 py-2 text-sm font-medium text-[var(--color-bg)] transition-opacity disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}

function ChatBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  if (message.isCrisisResponse) {
    return (
      <div
        data-testid="chat-message-crisis"
        role="alert"
        className="whitespace-pre-line rounded-xl border border-[var(--color-signal)] bg-[var(--color-signal)]/10 p-4 text-sm leading-relaxed text-[var(--color-ink)]"
      >
        {message.content}
      </div>
    );
  }

  return (
    <div
      data-testid="chat-message"
      data-role={message.role}
      className={`max-w-[85%] rounded-xl p-3 text-sm leading-relaxed ${
        isUser
          ? "self-end bg-[var(--color-thread)]/15 text-[var(--color-ink)]"
          : "self-start bg-[var(--color-bg)] text-[var(--color-ink)]"
      }`}
    >
      {message.content}
      {message.isFallback && (
        <p className="mt-1.5 text-[0.65rem] text-[var(--color-ink-muted)]">
          Couldn&apos;t reach the AI just now
        </p>
      )}
    </div>
  );
}
