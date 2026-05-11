import { collection, doc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import {
  loadAgents,
  loadBookings,
  loadCompanies,
  loadInvoices,
  loadServices,
  loadSettings,
} from './storage';

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
  const services = loadServices() ?? [];
  const settings = loadSettings();

  const hasAnything =
    bookings.length +
      invoices.length +
      companies.length +
      agents.length +
      services.length >
    0;

  // Always write settings; only batch-write collections if there's data to move.
  const batch = writeBatch(db);
  batch.set(doc(db, `users/${uid}/meta/settings`), settings);
  for (const b of bookings)
    batch.set(doc(db, `users/${uid}/bookings`, b.id), b);
  for (const i of invoices)
    batch.set(doc(db, `users/${uid}/invoices`, i.id), i);
  for (const c of companies)
    batch.set(doc(db, `users/${uid}/companies`, c.id), c);
  for (const a of agents) batch.set(doc(db, `users/${uid}/agents`, a.id), a);
  for (const s of services) batch.set(doc(db, `users/${uid}/services`, s.id), s);

  await batch.commit();
  markMigrated(uid);

  if (hasAnything) {
    // Helpful console crumb on the rare occasion something goes sideways.
    console.info(
      `Migrated ${bookings.length} bookings, ${invoices.length} invoices, ${companies.length} companies, ${agents.length} agents, ${services.length} services from localStorage to Firestore.`,
    );
  }
}
