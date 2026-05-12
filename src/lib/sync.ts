import { useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import {
  beginWrite,
  endWrite,
  failWrite,
  markPending,
} from './sync-status';

/**
 * Hook with the same shape as React.useState<T[]>, but transparently backs
 * the data to Firestore when a uid is supplied, or to localStorage when uid
 * is null. Real-time updates from other devices arrive via onSnapshot and
 * call setState, so the component re-renders.
 */
export function useDataList<T extends { id: string }>(
  uid: string | null,
  name: string,
  loadFromLocal: () => T[],
  saveToLocal: (items: T[]) => void,
): [T[], Dispatch<SetStateAction<T[]>>] {
  const [items, setItems] = useState<T[]>(() => (uid ? [] : loadFromLocal()));
  // We hold a fresh ref so the setter closure can read latest "prev" without
  // re-creating on every render.
  const prevRef = useRef(items);
  prevRef.current = items;

  // Subscribe to Firestore when a uid is present. Reset to [] on uid change
  // so we never flash data belonging to a different account.
  useEffect(() => {
    if (!uid) return;
    setItems([]);
    const db = getFirebaseDb();
    const unsub = onSnapshot(
      collection(db, `users/${uid}/${name}`),
      (snap) => {
        setItems(snap.docs.map((d) => d.data() as T));
      },
    );
    return unsub;
  }, [uid, name]);

  // Mirror to localStorage in offline-only mode.
  useEffect(() => {
    if (uid) return;
    saveToLocal(items);
  }, [uid, items, saveToLocal]);

  const setter: Dispatch<SetStateAction<T[]>> = useMemo(
    () => (action) => {
      const prev = prevRef.current;
      const next =
        typeof action === 'function'
          ? (action as (p: T[]) => T[])(prev)
          : action;
      prevRef.current = next;
      setItems(next);
      if (uid) {
        // Mark each changed record as 'pending' immediately so the per-record
        // label shows up even before the actual setDoc fires.
        const paths = diffPaths(uid, name, prev, next);
        for (const p of paths) markPending(p);
        runListWrite(uid, name, prev, next);
      }
    },
    [uid, name],
  );

  return [items, setter];
}

/** Same shape as React.useState<T>, but backed by a single Firestore doc. */
export function useDataDoc<T>(
  uid: string | null,
  path: string,
  loadFromLocal: () => T,
  saveToLocal: (value: T) => void,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() =>
    uid ? loadFromLocal() : loadFromLocal(),
  );
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!uid) return;
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, fullPath(uid, path)), (snap) => {
      if (snap.exists()) setValue(snap.data() as T);
    });
    return unsub;
  }, [uid, path]);

  useEffect(() => {
    if (uid) return;
    saveToLocal(value);
  }, [uid, value, saveToLocal]);

  const setter: Dispatch<SetStateAction<T>> = useMemo(
    () => (action) => {
      const prev = valueRef.current;
      const next =
        typeof action === 'function' ? (action as (p: T) => T)(prev) : action;
      valueRef.current = next;
      setValue(next);
      if (uid) {
        const docPath = fullPath(uid, path);
        markPending(docPath);
        runDocWrite(docPath, next);
      }
    },
    [uid, path],
  );

  return [value, setter];
}

function fullPath(uid: string, sub: string) {
  return `users/${uid}/${sub}`;
}

/**
 * Compute which doc paths a list-diff write would touch. Used to pre-mark
 * those records as 'pending' before the actual write fires.
 */
function diffPaths<T extends { id: string }>(
  uid: string,
  name: string,
  prev: T[],
  next: T[],
): string[] {
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const nextById = new Map(next.map((n) => [n.id, n]));
  const out: string[] = [];
  for (const [id, item] of nextById) {
    const before = prevById.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      out.push(`users/${uid}/${name}/${id}`);
    }
  }
  for (const [id] of prevById) {
    if (!nextById.has(id)) out.push(`users/${uid}/${name}/${id}`);
  }
  return out;
}

/**
 * Commit a list-style diff to Firestore via a single batch.commit(), with
 * per-record sync-status accounting. Marks each affected path saving →
 * saved (or error). Stores a retry closure that re-runs the same operation
 * with the same prev/next payload.
 */
function runListWrite<T extends { id: string }>(
  uid: string,
  name: string,
  prev: T[],
  next: T[],
): void {
  const db = getFirebaseDb();
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const nextById = new Map(next.map((n) => [n.id, n]));
  const batch = writeBatch(db);
  const paths: string[] = [];

  for (const [id, item] of nextById) {
    const before = prevById.get(id);
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      const path = `users/${uid}/${name}/${id}`;
      batch.set(doc(db, path), stripUndefined(item) as object);
      paths.push(path);
    }
  }
  for (const [id] of prevById) {
    if (!nextById.has(id)) {
      const path = `users/${uid}/${name}/${id}`;
      batch.delete(doc(db, path));
      paths.push(path);
    }
  }
  if (paths.length === 0) return;

  const retry = () => runListWrite(uid, name, prev, next);
  for (const p of paths) beginWrite(p, asyncRetry(retry));

  batch
    .commit()
    .then(() => {
      for (const p of paths) endWrite(p);
    })
    .catch((err) => {
      for (const p of paths) failWrite(p, err);
      console.error(`[sync] batch write to users/${uid}/${name} failed:`, err);
    });
}

/** Single-doc write with begin/end/fail accounting. */
function runDocWrite<T>(path: string, next: T): void {
  const retry = () => runDocWrite(path, next);
  beginWrite(path, asyncRetry(retry));
  setDoc(doc(getFirebaseDb(), path), stripUndefined(next) as object)
    .then(() => endWrite(path))
    .catch((err) => {
      failWrite(path, err);
      console.error(`[sync] write to ${path} failed:`, err);
    });
}

/** The retry closures stored in the status store are async by contract;
 *  our run helpers are fire-and-forget so we adapt them here. */
function asyncRetry(fn: () => void): () => Promise<void> {
  return async () => {
    fn();
  };
}

/**
 * Firestore rejects setDoc payloads containing `undefined` values. Our
 * domain types have optional fields (Service.description, Booking.coords,
 * Invoice.business.phone, etc.) that are routinely undefined, so we strip
 * those keys recursively before every write. Arrays and primitives pass
 * through unchanged.
 */
export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

/** Imperative check used by migration: does the user have any cloud data? */
export async function userHasCloudData(uid: string): Promise<boolean> {
  const db = getFirebaseDb();
  const settings = await getDoc(doc(db, `users/${uid}/meta/settings`));
  if (settings.exists()) return true;
  const bookings = await getDocs(collection(db, `users/${uid}/bookings`));
  return bookings.size > 0;
}
