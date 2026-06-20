/**
 * ThoughtGraph — LocalStorage persistence service.
 *
 * Entries are stored client-side as a single JSON array under STORAGE_KEY.
 * Safe to import from server components: all functions no-op (or return
 * empty defaults) when `window` is unavailable.
 */

import { useSyncExternalStore } from "react";
import type { JournalEntry } from "@/types/mental";

const STORAGE_KEY = "thoughtgraph:entries";

/** Dispatched on `window` after any write, so same-tab subscribers (the
 *  dashboard) can react without polling. Native "storage" events only
 *  fire for *other* tabs, so this fills the same-tab gap. */
const ENTRIES_CHANGED_EVENT = "thoughtgraph:entries-changed";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): JournalEntry[] {
  if (!isBrowser()) return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalEntry[]) : [];
  } catch {
    // Corrupted storage shouldn't crash the app — treat as empty.
    return [];
  }
}

function sortNewestFirst(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function writeAll(entries: JournalEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  entriesCache = null;
  window.dispatchEvent(new Event(ENTRIES_CHANGED_EVENT));
}

// Cached so loadEntries() (and the useJournalEntries hook below) can
// return a referentially stable array between writes — useSyncExternalStore
// requires this to avoid re-rendering forever. Only ever populated in the
// browser: on the server isBrowser() is always false, so this module-level
// value is never touched there and can't leak between requests.
let entriesCache: JournalEntry[] | null = null;

/** Saves a new entry, or overwrites an existing one with the same id (upsert). */
export function saveEntry(entry: JournalEntry): void {
  const entries = readAll();
  const index = entries.findIndex((e) => e.id === entry.id);

  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }

  writeAll(entries);
}

/** Returns all entries, sorted newest-first by createdAt. */
export function loadEntries(): JournalEntry[] {
  if (!isBrowser()) return [];
  if (entriesCache === null) {
    entriesCache = sortNewestFirst(readAll());
  }
  return entriesCache;
}

/** Returns a single entry by id, or undefined if not found. */
export function loadEntry(id: string): JournalEntry | undefined {
  return readAll().find((e) => e.id === id);
}

/** Removes a single entry by id. Safe to call on a non-existent id. */
export function deleteEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

/** Removes all entries. Safe to call on already-empty storage. */
export function clearAllEntries(): void {
  writeAll([]);
}

/** Returns the total number of stored entries. */
export function entryCount(): number {
  return readAll().length;
}

// ─── React binding ───────────────────────────────────────────

const EMPTY_SNAPSHOT: JournalEntry[] = [];

function subscribe(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(ENTRIES_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ENTRIES_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): JournalEntry[] {
  return EMPTY_SNAPSHOT;
}

/**
 * Subscribes a component to the journal entries in localStorage, newest
 * first. Re-renders automatically when an entry is saved/deleted in this
 * tab (via the change event writeAll() dispatches) or in another tab
 * (the native "storage" event) — no manual refresh callback needed.
 *
 * Safe under SSR: getServerSnapshot returns a stable empty array, and
 * useSyncExternalStore reconciles with the real client snapshot right
 * after hydration without a mismatch warning.
 */
export function useJournalEntries(): JournalEntry[] {
  return useSyncExternalStore(subscribe, loadEntries, getServerSnapshot);
}
