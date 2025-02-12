import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export async function updateUserStats(userId: string) {
  try {
    console.log('Updating stats for user:', userId);
    
    // Get all products by this user
    const productsSnapshot = await getDocs(
      query(collection(db, 'products'), where('created_by', '==', userId))
    );
    console.log('Found products:', productsSnapshot.size);

    // Update user stats
    const userStatsRef = doc(db, 'user_stats', userId);
    const statsData = {
      _id: userId,
      total_products: productsSnapshot.size,
      last_contribution: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    console.log('Updating user stats with:', statsData);
    
    await setDoc(userStatsRef, statsData, { merge: true });
    console.log('Stats updated successfully');
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
}
