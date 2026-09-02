// ─── Auth Gate ────────────────────────────────────────────────────────────────
// Shows the login screen when the user is not authenticated.
// Renders children (the main app) when they are logged in.
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const AVATAR_IMG = `${import.meta.env.BASE_URL || './'}Artrix1.png`;
const LOGIN_BG   = `${import.meta.env.BASE_URL || './'}Loginback.jpg`;

export default function AuthGate({ children }) {
  const { currentUser, loading, signIn } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (currentUser) return children;

  const handleGoogleSignIn = async () => {
    setError('');
    setSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo / Avatar */}
        <div style={styles.avatar}>
          <img
            src={AVATAR_IMG}
            alt="ArtriX"
            style={styles.avatarImg}
          />
        </div>

        <h1 style={styles.title}>Artrix</h1>
        <p style={styles.subtitle}>Your Personal AI Companion &amp; Assistant</p>

        {error && <p style={styles.error}>{error}</p>}

        <button
          id="btn-google-signin"
          className={`w-full py-3.5 px-5 bg-white text-gray-900 font-semibold rounded-xl text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-lg ${
            signingIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-100 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
          }`}
          onClick={handleGoogleSignIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          ) : (
            <GoogleIcon />
          )}
          <span>{signingIn ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        <p style={styles.legal}>
          By signing in you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.6 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3.4-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.2 5.2C36.9 39 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/>
    </svg>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    backgroundImage: `linear-gradient(rgba(4, 18, 8, 0.45), rgba(4, 18, 8, 0.65)), url('${LOGIN_BG}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundImage: `linear-gradient(rgba(4, 18, 8, 0.45), rgba(4, 18, 8, 0.65)), url('${LOGIN_BG}')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(255,255,255,0.1)',
    borderTop: '3px solid var(--accent, #8cb374)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  card: {
    background: 'rgba(10, 20, 14, 0.72)',
    border: '1px solid rgba(140, 179, 116, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '48px 40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(4, 18, 8, 0.4)',
  },
  avatar: {
    marginBottom: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(140, 179, 116, 0.5)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 10px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: '15px',
    margin: '0 0 32px',
    lineHeight: '1.5',
  },
  error: {
    color: '#ff6b6b',
    fontSize: '14px',
    marginBottom: '16px',
    padding: '10px 14px',
    background: 'rgba(255,107,107,0.1)',
    borderRadius: '8px',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    padding: '14px 20px',
    background: '#fff',
    color: '#1f1f1f',
    border: 'none',
    borderRadius: '12px',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
  },
  legal: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '12px',
    marginTop: '20px',
    lineHeight: '1.5',
  },
};
