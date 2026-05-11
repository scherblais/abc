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
        applyListDiff(uid, name, prev, next).catch((err) => {
          console.error(`[sync] write to users/${uid}/${name} failed:`, err);
        });
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
        setDoc(
          doc(getFirebaseDb(), fullPath(uid, path)),
          stripUndefined(next) as object,
        ).catch((err) => {
          console.error(`[sync] write to ${fullPath(uid, path)} failed:`, err);
        });
      }
    },
    [uid, path],
  );

  return [value, setter];
}

function fullPath(uid: string, sub: string) {
  return `users/${uid}/${sub}`;
}

async function applyListDiff<T extends { id: string }>(
  uid: string,
  name: string,
  prev: T[],
  next: T[],
): Promise<void> {
  const db = getFirebaseDb();
  const prevById = new Map(prev.map((p) => [p.id, p]));
  const nextById = new Map(next.map((n) => [n.id, n]));
  const batch = writeBatch(db);
  let changes = 0;

  for (const [id, item] of nextById) {
    const before = prevById.get(id);
    // Cheap "did this change" check. JSON comparison is fine for our
    // plain-object shapes and avoids a per-field deep-equal.
    if (!before || JSON.stringify(before) !== JSON.stringify(item)) {
      batch.set(
        doc(db, `users/${uid}/${name}`, id),
        stripUndefined(item) as object,
      );
      changes++;
    }
  }
  for (const [id] of prevById) {
    if (!nextById.has(id)) {
      batch.delete(doc(db, `users/${uid}/${name}`, id));
      changes++;
    }
  }
  if (changes > 0) await batch.commit();
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
