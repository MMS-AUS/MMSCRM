import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider for standard Personal Google Accounts (No Google Workspace restricted scopes)
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to track popup sign-in in progress
let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize auth listener on app load
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Initiates popup Google Sign-In with requested Gmail Scopes.
 * Obtains OAuth access token and registers it with backend to store credentials and sync emails.
 */
export const connectGmailWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
  serverSyncResult?: any;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('No access token returned from Google Authentication');
    }

    cachedAccessToken = credential.accessToken;
    const user = result.user;

    // Exchange / notify server to store credentials and register initial sync
    const res = await fetch('/api/auth/gmail/store-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: cachedAccessToken,
        email: user.email,
        displayName: user.displayName
      })
    });

    let serverSyncResult = null;
    if (res.ok) {
      serverSyncResult = await res.json();
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn('[Gmail Auth] Token store warning:', err.error || res.statusText);
    }

    return {
      user,
      accessToken: cachedAccessToken,
      serverSyncResult
    };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/user-cancelled'
    ) {
      console.info('[Gmail Auth] User closed the Google sign-in popup.');
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      console.warn('[Gmail Auth] Google sign-in popup was blocked by the browser.');
      throw new Error('Sign-in popup blocked. Please allow popups for this site and try again.');
    }
    console.error('[Gmail Auth] Error signing in with Google:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const disconnectGoogleAccount = logout;
