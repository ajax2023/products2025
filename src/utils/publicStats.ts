import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

/**
 * Updates the public stats document with the current user count
 * This should be called whenever user counts change (user creation, deletion, status changes)
 */
export async function updatePublicStats() {
  try {
    // Get count of active users
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), where('status', '==', 'active'))
    );
    
    // Update public stats
    const statsRef = doc(db, 'public_stats', 'user_counts');
    await setDoc(statsRef, {
      activeUsers: usersSnapshot.size,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    console.log('Public stats updated successfully');
  } catch (error) {
    console.error('Error updating public stats:', error);
    throw error;
  }
}
