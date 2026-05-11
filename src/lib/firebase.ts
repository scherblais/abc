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
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from '../firebase-config';

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

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

/** True if Google sign-in popup is likely supported (desktop browsers).
 *  On iOS Safari / in-app browsers, redirect flow is more reliable. */
function preferRedirect(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua);
}

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  if (preferRedirect()) {
    await signInWithRedirect(auth, provider);
  } else {
    await signInWithPopup(auth, provider);
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebaseAuth());
}

export type { User };
