import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { app, db } from "../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

const ensureSuperAdmin = async (user: any) => {
  if (user.email === 'ajax@online101.ca') {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      _id: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: 'super_admin',
      status: 'active',
      created_at: new Date(),
      created_by: user.uid,
      last_login: new Date()
    }, { merge: true });
    return true;
  }
  return false;
};

const createUserDocument = async (user: any) => {
  if (!user) return;

  // First check if this is the super admin
  const isSuperAdmin = await ensureSuperAdmin(user);
  if (isSuperAdmin) return;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // New user - create document with default role
    await setDoc(userRef, {
      _id: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: 'contributor', // Default role for new users
      status: 'active', // Changed from 'pending' to 'active'
      created_at: new Date(),
      created_by: user.uid,
      last_login: new Date()
    });
  } else {
    // Existing user - update last login
    await setDoc(userRef, {
      last_login: new Date()
    }, { merge: true });
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserDocument(result.user);
  } catch (error) {
    console.error("Google sign-in error:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

export { auth };
