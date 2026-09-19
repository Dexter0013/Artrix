// ─── Auth Helpers ─────────────────────────────────────────────────────────────
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from './config';

/** Open the Google sign-in popup. Handles both standard web apps and extension side panels. */
export const signInWithGoogle = async () => {
  // Check if running inside Chrome/Edge extension context (e.g. side panel)
  const isExtension = typeof chrome !== 'undefined' && chrome?.runtime?.getURL && window.location.protocol === 'chrome-extension:';
  
  if (isExtension) {
    const webAuthUrl = 'http://localhost:5173/?auth_mode=extension_sync';
    
    return new Promise((resolve, reject) => {
      let resolved = false;

      const checkStorage = () => {
        if (chrome.storage?.local) {
          chrome.storage.local.get(['artrix_auth_user'], (res) => {
            if (res?.artrix_auth_user && !resolved) {
              resolved = true;
              resolve(res.artrix_auth_user);
            }
          });
        }
      };

      const messageListener = (msg) => {
        if (msg.action === 'FIREBASE_AUTH_UPDATED' && msg.user && !resolved) {
          resolved = true;
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(msg.user);
        }
      };
      chrome.runtime.onMessage.addListener(messageListener);

      if (chrome.tabs?.create) {
        chrome.tabs.create({ url: webAuthUrl });
      } else {
        window.open(webAuthUrl, '_blank');
      }

      const interval = setInterval(checkStorage, 1000);

      setTimeout(() => {
        clearInterval(interval);
        try {
          chrome.runtime.onMessage.removeListener(messageListener);
        } catch {}
        if (!resolved) {
          reject(new Error('Sign-in timed out. Please complete sign-in in the opened browser tab.'));
        }
      }, 120000);
    });
  }

  // Standard web browser environment
  return signInWithPopup(auth, googleProvider);
};

/** Sign the current user out. */
export const signOut = () => firebaseSignOut(auth);

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);
