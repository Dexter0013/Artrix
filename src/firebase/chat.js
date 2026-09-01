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
const messagesRef = (userId) =>
  collection(db, 'users', userId, 'messages');

/**
 * Send a chat message for a user.
 * @param {string} userId
 * @param {string} text    - Message content
 * @param {'user'|'assistant'} role
 */
export const sendMessage = (userId, text, role = 'user') =>
  addDoc(messagesRef(userId), {
    text,
    role,
    createdAt: serverTimestamp(),
  });

/**
 * Subscribe to real-time message updates for a user.
 * Calls `callback` with an array of message objects (newest last).
 * Returns an unsubscribe function.
 *
 * @param {string}   userId
 * @param {Function} callback  (messages: Array) => void
 */
export const subscribeToMessages = (userId, callback) => {
  const q = query(messagesRef(userId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
};

/**
 * Delete all chat messages for a user.
 * @param {string} userId
 */
export const clearHistory = async (userId) => {
  const snapshot = await getDocs(messagesRef(userId));
  const deletes  = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletes);
};
