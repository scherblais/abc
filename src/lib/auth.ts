import { useEffect, useState } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { getFirebaseAuth, type User } from './firebase';
import { FIREBASE_ENABLED } from '../firebase-config';

export type AuthState =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(() =>
    FIREBASE_ENABLED ? { status: 'loading' } : { status: 'disabled' },
  );

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    const auth = getFirebaseAuth();
    // Resolve any redirect-flow sign-in (iOS Safari path) before subscribing.
    // Stash an error on sessionStorage so the SignInScreen can show it after
    // the redirect lands.
    getRedirectResult(auth).catch((err: unknown) => {
      const message =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error('[auth] redirect result failed:', err);
      try {
        sessionStorage.setItem('lensbook.auth.lastError', message);
      } catch {
        // ignore
      }
    });
    const unsub = onAuthStateChanged(auth, (user) => {
      setState(user ? { status: 'signed-in', user } : { status: 'signed-out' });
    });
    return unsub;
  }, []);

  return state;
}
