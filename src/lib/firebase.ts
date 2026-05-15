import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from '../firebase-config';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

function ensureInit() {
  if (!FIREBASE_ENABLED) {
    throw new Error('Firebase is not configured (src/firebase-config.ts).');
  }
  if (!_app) {
    _app = initializeApp(FIREBASE_CONFIG);
    _auth = getAuth(_app);
    // initializeFirestore w/ persistent cache enables IndexedDB-backed offline
    // persistence (reads + queued writes) across tabs. Once installed, queries
    // serve from cache instantly and writes succeed offline.
    _db = initializeFirestore(_app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
}

export function getFirebaseAuth(): Auth {
  ensureInit();
  return _auth!;
}

export function getFirebaseDb(): Firestore {
  ensureInit();
  return _db!;
}

export function getFirebaseStorage(): FirebaseStorage {
  ensureInit();
  if (!_storage) _storage = getStorage(_app!);
  return _storage;
}

/** Try popup first (works in normal mobile Safari + every desktop browser),
 *  fall back to redirect when popup is blocked, dismissed by the user, or
 *  outright unsupported by the environment (iOS standalone PWA, in-app
 *  webviews). Both paths funnel through onAuthStateChanged → useAuth. */
export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    const fallback = new Set([
      'auth/popup-blocked',
      'auth/popup-closed-by-user',
      'auth/operation-not-supported-in-this-environment',
      'auth/cancelled-popup-request',
      'auth/web-storage-unsupported',
    ]);
    if (fallback.has(code)) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebaseAuth());
}

export type { User };
