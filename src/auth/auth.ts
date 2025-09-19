import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { app, db, auth } from "../firebaseConfig";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();

const ensureSuperAdmin = async (user: any) => {
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL;
  
  if (user.email === superAdminEmail) {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      _id: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: 'super_admin',
      status: 'active',
      created_at: serverTimestamp(),
      created_by: user.uid,
      last_login: serverTimestamp()
    }, { merge: true });
    return true;
  }
  return false;
};

const createUserDocument = async (user: any) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  try {
    const userSnap = await getDoc(userRef);

    // Check if user is super admin first
    const isSuperAdmin = await ensureSuperAdmin(user);
    if (!isSuperAdmin) {
      // Only update if not already exists to preserve existing role
      if (!userSnap.exists()) {
        try {
          await setDoc(userRef, {
            _id: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: 'viewer',  // Default role is viewer
            status: 'active',
            created_at: serverTimestamp(),
            created_by: user.uid,
            last_login: serverTimestamp()
          });
        } catch (error) {
          console.error("Error creating new user document:", error);
        }
      } else {
        try {
          // Just update last login
          await setDoc(userRef, {
            last_login: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error updating existing user document:", error);
        }
      }
    }
  } catch (error) {
    console.error("Error getting user document snapshot:", error);
  }

  return userRef;
};

// Detect if we are in a mobile or standalone PWA context where popup auth is unreliable
const isStandalonePWA = () => {
  try {
    const iosStandalone = (() => {
      const navAny = navigator as any;
      return typeof navAny !== 'undefined' && navAny && navAny.standalone === true;
    })();
    return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
  } catch {
    return false;
  }
};

const isMobileUA = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const signInWithGoogle = async () => {
  try {
    if (isStandalonePWA()) {
      console.log('[Auth] Standalone PWA detected -> using redirect');
      try { sessionStorage.setItem('authRedirectPending', '1'); } catch {}
      await signInWithRedirect(auth, googleProvider);
      return null; // flow will continue after redirect
    }

    // Try popup first (works best on Android Chrome). Fallback to redirect if blocked.
    try {
      console.log('[Auth] Trying popup sign-in');
      const result = await signInWithPopup(auth, googleProvider);
      await createUserDocument(result.user);
      try { sessionStorage.removeItem('authRedirectPending'); } catch {}
      return result.user;
    } catch (popupError: any) {
      const code = popupError?.code || '';
      console.log('[Auth] Popup sign-in failed, code:', code, '-> falling back to redirect');
      try { sessionStorage.setItem('authRedirectPending', '1'); } catch {}
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
  } catch (error) {
    console.error('[Auth] Error in signInWithGoogle:', error);
    throw error;
  }
};

// Call on app start to complete redirect flow and create the user document
export const handleRedirectResult = async () => {
  try {
    console.log('Attempting to get redirect result...');
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('Redirect result found, user:', result.user.email);
      await createUserDocument(result.user);
      try { sessionStorage.removeItem('authRedirectPending'); } catch {}
      return result.user;
    }
    console.log('No redirect result found');
    try { sessionStorage.removeItem('authRedirectPending'); } catch {}
    return null;
  } catch (error) {
    // If there is no redirect result, Firebase throws; that's ok, just return null.
    // Only log other errors.
    console.log("Redirect result error:", error);
    try { sessionStorage.removeItem('authRedirectPending'); } catch {}
    return null;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

export { auth };
