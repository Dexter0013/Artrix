// ─── Firestore Chat Helpers ───────────────────────────────────────────────────
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './config';

/**
 * Returns the Firestore collection ref for a user's messages.
 * Path: users/{userId}/messages
 */
const LOCAL_STORAGE_KEY = 'artrix_local_messages';
const localListeners = new Set();

function getLocalMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function notifyLocalListeners() {
  const msgs = getLocalMessages();
  localListeners.forEach((cb) => cb(msgs));
}

/**
 * Returns the Firestore collection ref for a user's messages.
 * Path: users/{userId}/messages
 */
const messagesRef = (userId) =>
  collection(db, 'users', userId, 'messages');

/**
 * Send a chat message for a user.
 * @param {string} userId
 * @param {string} text     - Clean display text (emotion tags stripped)
 * @param {'user'|'assistant'} role
 * @param {string} [rawText] - Original AI response with emotion tags (assistant only)
 */
export const sendMessage = async (userId, text, role = 'user', rawText) => {
  if (userId === 'local_user' || !userId) {
    const msgs = getLocalMessages();
    const newMsg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text,
      role,
      ...(rawText ? { rawText } : {}),
      createdAt: { seconds: Math.floor(Date.now() / 1000) },
    };
    msgs.push(newMsg);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(msgs));
    notifyLocalListeners();
    return newMsg;
  }

  return addDoc(messagesRef(userId), {
    text,
    role,
    ...(rawText ? { rawText } : {}),
    createdAt: serverTimestamp(),
  });
};

/**
 * Subscribe to real-time message updates for a user.
 * Calls `callback` with an array of message objects (newest last).
 * Calls `onError` (optional) if Firestore surfaces an error (e.g. auth/permission denied).
 * Returns an unsubscribe function.
 *
 * @param {string}   userId
 * @param {Function} callback  (messages: Array) => void
 * @param {Function} [onError] (error: Error) => void
 */
export const subscribeToMessages = (userId, callback, onError) => {
  if (userId === 'local_user' || !userId) {
    localListeners.add(callback);
    callback(getLocalMessages());
    return () => {
      localListeners.delete(callback);
    };
  }

  const q = query(messagesRef(userId), orderBy('createdAt', 'asc'));
  const handleError = onError ?? ((err) => console.warn('[Firestore] snapshot error:', err));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  }, handleError);
};

/**
 * Delete all chat messages for a user.
 * @param {string} userId
 */
export const clearHistory = async (userId) => {
  if (userId === 'local_user' || !userId) {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    notifyLocalListeners();
    return;
  }

  const snapshot = await getDocs(messagesRef(userId));
  const deletes  = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletes);
};

