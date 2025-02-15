import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { app, db, auth } from "../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";

const googleProvider = new GoogleAuthProvider();

const ensureSuperAdmin = async (user: any) => {
  const superAdminEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL || process.env.REACT_APP_SUPER_ADMIN_EMAIL;
  
  if (user.email === superAdminEmail) {
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
            role: 'contributor',
            status: 'active',
            created_at: new Date(),
            created_by: user.uid,
            last_login: new Date()
          }, { merge: true });
        } catch (error) {
          console.error("Error creating new user document:", error);
        }
      } else {
        try {
          // Just update last login
          await setDoc(userRef, {
            last_login: new Date()
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

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserDocument(result.user);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
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
