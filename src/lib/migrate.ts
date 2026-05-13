import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import {
  loadAgents,
  loadBookings,
  loadCompanies,
  loadExpenses,
  loadInvoices,
  loadServices,
  loadSettings,
} from './storage';
import { DEFAULT_CATALOG } from './catalog';
import { stripUndefined } from './sync';

const MARKER_KEY = 'lensbook.migrated.v1';

function markMigrated(uid: string) {
  try {
    localStorage.setItem(MARKER_KEY, uid);
  } catch {
    // ignore
  }
}

function alreadyMigrated(uid: string): boolean {
  try {
    return localStorage.getItem(MARKER_KEY) === uid;
  } catch {
    return false;
  }
}

/**
 * Push this device's localStorage data into Firestore — but only if the
 * cloud is empty (so we don't clobber data from another device). Runs once
 * per user on this browser; a localStorage marker prevents re-runs.
 */
export async function migrateLocalToCloud(uid: string): Promise<void> {
  if (alreadyMigrated(uid)) return;

  const db = getFirebaseDb();

  // Bail if any cloud doc already exists for this user — cloud wins.
  const bookingsSnap = await getDocs(collection(db, `users/${uid}/bookings`));
  const settingsSnap = await getDoc(doc(db, `users/${uid}/meta/settings`));
  if (bookingsSnap.size > 0 || settingsSnap.exists()) {
    markMigrated(uid);
    return;
  }

  const bookings = loadBookings();
  const invoices = loadInvoices();
  const companies = loadCompanies();
  const agents = loadAgents();
  const expenses = loadExpenses();
  // Brand-new account with no local services? Seed the default catalog so
  // the Book screen isn't empty. After this one-time seed, the catalog is
  // the user's to manage — deletions stay deleted.
  const services = loadServices() ?? DEFAULT_CATALOG.map((s) => ({ ...s }));
  const settings = loadSettings();

  const hasAnything =
    bookings.length +
      invoices.length +
      companies.length +
      agents.length +
      expenses.length +
      services.length >
    0;

  // Always write settings; only batch-write collections if there's data to move.
  const batch = writeBatch(db);
  batch.set(doc(db, `users/${uid}/meta/settings`), stripUndefined(settings));
  for (const b of bookings)
    batch.set(doc(db, `users/${uid}/bookings`, b.id), stripUndefined(b));
  for (const i of invoices)
    batch.set(doc(db, `users/${uid}/invoices`, i.id), stripUndefined(i));
  for (const c of companies)
    batch.set(doc(db, `users/${uid}/companies`, c.id), stripUndefined(c));
  for (const a of agents)
    batch.set(doc(db, `users/${uid}/agents`, a.id), stripUndefined(a));
  for (const s of services)
    batch.set(doc(db, `users/${uid}/services`, s.id), stripUndefined(s));
  for (const e of expenses)
    batch.set(doc(db, `users/${uid}/expenses`, e.id), stripUndefined(e));

  await batch.commit();
  markMigrated(uid);

  if (hasAnything) {
    // Helpful console crumb on the rare occasion something goes sideways.
    console.info(
      `Migrated ${bookings.length} bookings, ${invoices.length} invoices, ${companies.length} companies, ${agents.length} agents, ${services.length} services, ${expenses.length} expenses from localStorage to Firestore.`,
    );
  }
}
