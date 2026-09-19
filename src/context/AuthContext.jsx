// ─── Auth Context ─────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, signInWithGoogle, signOut as firebaseSignOut } from '../firebase/auth';
import { clearGeminiApiKey } from '../ai/gemini';

const AuthContext = createContext(null);

/** Provides currentUser, loading, signIn, signOut to the whole app. */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user || null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    clearGeminiApiKey();
    setCurrentUser(null);
    await firebaseSignOut().catch(() => {});
  };

  const continueAsGuest = () => {
    setCurrentUser({ uid: 'guest_user', displayName: 'Guest User', isGuest: true });
  };

  const value = {
    currentUser,
    loading,
    signIn:  signInWithGoogle,
    signOut: handleSignOut,
    continueAsGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume the auth context. */
export const useAuth = () => useContext(AuthContext);
