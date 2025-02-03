import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

export const createAdminUser = async () => {
  if (!auth.currentUser) {
    throw new Error('No user logged in');
  }

  const userRef = doc(db, 'users', auth.currentUser.uid);
  await setDoc(userRef, {
    _id: auth.currentUser.uid,
    email: auth.currentUser.email,
    role: 'admin',
    status: 'active',
    created_at: new Date(),
    created_by: auth.currentUser.uid,
    last_login: new Date()
  });
};
