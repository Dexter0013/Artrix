// ─── Auth Helpers ─────────────────────────────────────────────────────────────
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from './config';

/** Open the Google sign-in popup. Returns the signed-in user. */
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

/** Sign the current user out. */
export const signOut = () => firebaseSignOut(auth);

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
