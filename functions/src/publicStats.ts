import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Updates the public stats document with current counts
 */
export const updatePublicStats = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
      // Get count of active users
      const usersSnapshot = await db
        .collection('users')
        .where('status', '==', 'active')
        .get();
      
      // Get count of Canadian products and public products
      const productsSnapshot = await db
        .collection('canadian_products')
        .get();
      
      const totalProducts = productsSnapshot.size;
      const publicProducts = productsSnapshot.docs.filter(
        doc => doc.data().isPubliclyVisible === true
      ).length;
      
      // Update the public stats document
      await db.doc('public_stats/user_counts').set({
        activeUsers: usersSnapshot.size,
        totalProducts,
        publicProducts,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Public stats updated successfully');
      return null;
    } catch (error) {
      console.error('Error updating public stats:', error);
      throw error;
    }
  });

/**
 * Also update stats when user status changes
 */
export const onUserStatusChange = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    // Only update if status field changed
    const oldStatus = change.before.data()?.status;
    const newStatus = change.after.data()?.status;
    
    if (oldStatus === newStatus) {
      return null;
    }
    
    // Trigger the stats update
    try {
      await updatePublicStats.run();
      console.log('Public stats updated after user status change');
    } catch (error) {
      console.error('Error updating stats after user change:', error);
      throw error;
    }
  });
