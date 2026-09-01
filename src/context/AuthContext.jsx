// ─── Auth Context ─────────────────────────────────────────────────────────────
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, signInWithGoogle, signOut } from '../firebase/auth';

const AuthContext = createContext(null);

/** Provides currentUser, loading, signIn, signOut to the whole app. */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    signIn:  signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to consume the auth context. */
export const useAuth = () => useContext(AuthContext);
