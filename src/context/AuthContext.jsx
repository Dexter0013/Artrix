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
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      if (!user) {
        // Automatically delete stored API key from browser storage on logout
        clearGeminiApiKey();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignOut = async () => {
    clearGeminiApiKey();
    await firebaseSignOut();
  };

  const value = {
    currentUser,
    loading,
    signIn:  signInWithGoogle,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume the auth context. */
export const useAuth = () => useContext(AuthContext);
