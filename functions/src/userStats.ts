import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const updateUserStats = functions.firestore
  .document('products/{productId}')
  .onWrite(async (change, context) => {
    // Get an admin firestore instance
    const db = admin.firestore();

    try {
      // Get the user ID from the document
      const userId = change.after.exists 
        ? change.after.data()?.created_by 
        : change.before.data()?.created_by;

      if (!userId) {
        console.log('No user ID found in product document');
        return null;
      }

      // Get all products by this user
      const productsSnapshot = await db
        .collection('products')
        .where('created_by', '==', userId)
        .get();

      // Update user stats
      const userStatsRef = db.collection('user_stats').doc(userId);
      await userStatsRef.set({
        _id: userId,
        total_products: productsSnapshot.size,
        last_contribution: change.after.exists ? new Date() : null,
        updated_at: new Date()
      }, { merge: true });

      console.log(`Updated stats for user ${userId}: ${productsSnapshot.size} products`);
      return null;
    } catch (error) {
      console.error('Error updating user stats:', error);
      return null;
    }
  });
