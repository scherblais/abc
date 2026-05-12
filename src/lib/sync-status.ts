/**
 * Sync status singleton + React hooks.
 *
 * Lives outside React so the write helpers in lib/sync.ts can record
 * begin / end / fail events without creating render cycles. Components
 * subscribe via useSyncStatus() (global) and useRecordSyncStatus(path)
 * (per-record) using React's useSyncExternalStore.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';

/* ============================================================
 * Types
 * ============================================================ */

export type GlobalColor = 'green' | 'yellow' | 'red' | 'idle';

export type RecordState = 'pending' | 'saving' | 'saved' | 'error';

export type RecordEntry = {
  state: RecordState;
  savedAt: number; // ms epoch
  error?: string;
  /** Re-runs the failed write. Replaced each begin/fail cycle. */
  retry?: () => Promise<void>;
};

export type GlobalStatus = {
  color: GlobalColor;
  /** Short label for the dot's accessible name + popover header. */
  label: string;
  online: boolean;
  inFlight: number;
  inSync: boolean;
  /** Falls back to false until at least one snapshot has arrived. */
  warm: boolean;
  lastError: {
    path: string;
    message: string;
    at: number;
    retry?: () => Promise<void>;
  } | null;
};

/* ============================================================
 * Internal state — module-level singleton.
 * ============================================================ */

const RECORDS_LIMIT = 200; // LRU cap
const RECORDS_TTL_MS = 10 * 60_000; // drop saved entries older than 10 min

let online =
  typeof navigator === 'undefined' ? true : navigator.onLine !== false;
let inFlight = 0;
let inSync = true;
let warm = false;
let lastError: GlobalStatus['lastError'] = null;
const records = new Map<string, RecordEntry>();

// For yellow→green debounce.
let settleTimer: number | undefined;
const SETTLE_DELAY_MS = 250;

// Subscriber list.
type Listener = () => void;
const listeners = new Set<Listener>();

// Cached snapshot for useSyncExternalStore. Recomputed on each mutation
// so React's reference-equality check sees a stable identity per state.
let cachedGlobal: GlobalStatus = computeGlobal();

function emit() {
  cachedGlobal = computeGlobal();
  for (const fn of listeners) fn();
}

function computeGlobal(): GlobalStatus {
  let color: GlobalColor;
  let label: string;
  if (!warm) {
    color = 'idle';
    label = 'Connecting…';
  } else if (!online) {
    color = 'red';
    label = 'Offline — changes queued';
  } else if (lastError) {
    color = 'red';
    label = 'Save failed';
  } else if (inFlight > 0 || !inSync) {
    color = 'yellow';
    label = 'Saving…';
  } else {
    color = 'green';
    label = 'All saved';
  }
  return { color, label, online, inFlight, inSync, warm, lastError };
}

function trimRecords() {
  if (records.size <= RECORDS_LIMIT) return;
  const now = Date.now();
  // Drop stale saved entries first.
  for (const [k, v] of records) {
    if (v.state === 'saved' && now - v.savedAt > RECORDS_TTL_MS) {
      records.delete(k);
    }
  }
  // If still over, drop oldest insertion order.
  while (records.size > RECORDS_LIMIT) {
    const oldest = records.keys().next();
    if (oldest.done) break;
    records.delete(oldest.value);
  }
}

/* ============================================================
 * Public write-instrumentation API (called by lib/sync.ts).
 * ============================================================ */

export function beginWrite(path: string, retry?: () => Promise<void>) {
  inFlight += 1;
  records.set(path, {
    state: 'saving',
    savedAt: Date.now(),
    retry,
  });
  trimRecords();
  scheduleSettle();
  emit();
}

export function endWrite(path: string) {
  inFlight = Math.max(0, inFlight - 1);
  const existing = records.get(path);
  records.set(path, {
    state: 'saved',
    savedAt: Date.now(),
    retry: existing?.retry,
  });
  // Successful write clears a matching last-error.
  if (lastError && lastError.path === path) lastError = null;
  scheduleSettle();
  emit();
}

export function failWrite(path: string, err: unknown) {
  inFlight = Math.max(0, inFlight - 1);
  const message =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const retry = records.get(path)?.retry;
  records.set(path, {
    state: 'error',
    savedAt: Date.now(),
    error: message,
    retry,
  });
  lastError = { path, message, at: Date.now(), retry };
  scheduleSettle();
  emit();
}

/** Optimistic pending state — called the moment the user mutates. */
export function markPending(path: string) {
  const existing = records.get(path);
  // Don't downgrade an in-flight write back to pending.
  if (existing && existing.state === 'saving') return;
  records.set(path, {
    state: 'pending',
    savedAt: existing?.savedAt ?? Date.now(),
    retry: existing?.retry,
  });
  emit();
}

export function clearError() {
  lastError = null;
  emit();
}

function scheduleSettle() {
  // Debounce yellow → green so single fast writes don't strobe.
  if (typeof window === 'undefined') return;
  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    settleTimer = undefined;
    emit();
  }, SETTLE_DELAY_MS);
}

/* ============================================================
 * Global event wiring — call once at app root.
 * ============================================================ */

export function setOnline(next: boolean) {
  if (online === next) return;
  online = next;
  emit();
}

export function setInSync(next: boolean) {
  if (inSync === next) return;
  inSync = next;
  if (next) warm = true;
  emit();
}

export function markWarm() {
  if (warm) return;
  warm = true;
  emit();
}

/* ============================================================
 * Hooks.
 * ============================================================ */

function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const getGlobalSnapshot = () => cachedGlobal;

export function useSyncStatus(): GlobalStatus & {
  retry: () => Promise<void>;
  dismissError: () => void;
} {
  const snap = useSyncExternalStore(subscribe, getGlobalSnapshot, getGlobalSnapshot);
  return {
    ...snap,
    retry: async () => {
      const fn = snap.lastError?.retry;
      if (fn) await fn();
    },
    dismissError: clearError,
  };
}

/** Per-record status. Returns undefined if no entry yet (e.g. brand-new record). */
export function useRecordSyncStatus(path: string | undefined): RecordEntry | undefined {
  // Re-render every 5 s so relative-time labels tick.
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const snap = useSyncExternalStore(
    subscribe,
    () => (path ? records.get(path) : undefined),
    () => (path ? records.get(path) : undefined),
  );
  return snap;
}

/* ============================================================
 * Helpers.
 * ============================================================ */

/** Build a Firestore-doc-style path used as a key. */
export function recordPath(
  uid: string,
  collection: string,
  id: string,
): string {
  return `users/${uid}/${collection}/${id}`;
}

/** Special path for the single settings doc. */
export function settingsPath(uid: string): string {
  return `users/${uid}/meta/settings`;
}
