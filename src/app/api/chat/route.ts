/**
 * ThoughtGraph — POST /api/chat
 *
 * Receives a chat message plus the current client-held journal entries and
 * conversation context, then returns a grounded Companion reply.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCompanionReply } from "@/lib/companion";
import type {
  ChatRequest,
  ChatResponse,
  GeminiErrorResponse,
  ChatMessage,
  JournalEntry,
} from "@/types/mental";

function coerceChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ChatMessage =>
      !!item &&
      typeof item === "object" &&
      (item as { role?: unknown }).role !== undefined &&
      ((item as { role?: unknown }).role === "user" ||
        (item as { role?: unknown }).role === "assistant") &&
      typeof (item as { content?: unknown }).content === "string"
  ) as ChatMessage[];
}

function coerceEntries(value: unknown): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is JournalEntry =>
      !!item &&
      typeof item === "object" &&
      typeof (item as { journalText?: unknown }).journalText === "string" &&
      typeof (item as { createdAt?: unknown }).createdAt === "string" &&
      typeof (item as { analysis?: unknown }).analysis === "object"
  ) as JournalEntry[];
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ChatResponse | GeminiErrorResponse>> {
  let body: Partial<ChatRequest>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const conversation = coerceChatMessages(body.conversation);
  const entries = coerceEntries(body.entries);

  try {
    const result = await getCompanionReply({
      message,
      conversation,
      entries,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Chat failed";
    console.error("[/api/chat]", messageText);
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
