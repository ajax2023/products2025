import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ProductSubmission, SubmissionStatus } from '../types/productSubmission';

// Collection names
const SUBMISSIONS_COLLECTION = 'product_submissions';
const PRODUCTS_COLLECTION = 'canadian_products';

/**
 * Create a new product submission
 * @param submissionData The product submission data
 * @param userId The ID of the user making the submission
 * @returns The ID of the newly created submission
 */
export const createProductSubmission = async (
  submissionData: Omit<ProductSubmission, 'id' | 'submittedBy' | 'submittedAt' | 'status'>,
  userId: string
): Promise<string> => {
  try {
    const submissionWithMetadata = {
      ...submissionData,
      submittedBy: userId,
      submittedAt: serverTimestamp(),
      status: 'pending' as SubmissionStatus
    };

    const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), submissionWithMetadata);
    return docRef.id;
  } catch (error) {
    console.error('Error creating product submission:', error);
    throw error;
  }
};

/**
 * Get all submissions for a specific user
 * @param userId The ID of the user
 * @returns Array of product submissions
 */
export const getUserSubmissions = async (userId: string): Promise<ProductSubmission[]> => {
  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('submittedBy', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductSubmission));
  } catch (error) {
    console.error('Error getting user submissions:', error);
    throw error;
  }
};

/**
 * Get all pending submissions (for admin review)
 * @returns Array of pending product submissions
 */
export const getPendingSubmissions = async (): Promise<ProductSubmission[]> => {
  try {
    const q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProductSubmission));
  } catch (error) {
    console.error('Error getting pending submissions:', error);
    throw error;
  }
};

/**
 * Approve a product submission
 * @param submissionId The ID of the submission to approve
 * @param adminId The ID of the admin approving the submission
 * @param editedData Optional edited data to apply before approval
 * @returns The ID of the newly created product
 */
export const approveSubmission = async (
  submissionId: string,
  adminId: string,
  editedData?: Partial<ProductSubmission>
): Promise<string> => {
  try {
    // Get the submission
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionSnap = await getDoc(submissionRef);
    
    if (!submissionSnap.exists()) {
      throw new Error('Submission not found');
    }
    
    const submissionData = submissionSnap.data() as ProductSubmission;
    
    // Update submission status
    await updateDoc(submissionRef, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      ...editedData
    });
    
    // Prepare data for the products collection
    // Remove submission-specific fields
    const { 
      status, submittedAt, submittedBy, reviewedAt, 
      reviewedBy, rejectionReason, adminNotes, ...productData 
    } = {
      ...submissionData,
      ...editedData
    };
    
    // Add to products collection
    const productRef = await addDoc(collection(db, PRODUCTS_COLLECTION), {
      ...productData,
      approvedAt: serverTimestamp(),
      approvedBy: adminId,
      sourceSubmissionId: submissionId
    });
    
    return productRef.id;
  } catch (error) {
    console.error('Error approving submission:', error);
    throw error;
  }
};

/**
 * Reject a product submission
 * @param submissionId The ID of the submission to reject
 * @param adminId The ID of the admin rejecting the submission
 * @param rejectionReason The reason for rejection
 * @param adminNotes Optional private notes for admins
 */
export const rejectSubmission = async (
  submissionId: string,
  adminId: string,
  rejectionReason: string,
  adminNotes?: string
): Promise<void> => {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    
    await updateDoc(submissionRef, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      rejectionReason,
      adminNotes
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    throw error;
  }
};

/**
 * Get a single submission by ID
 * @param submissionId The ID of the submission
 * @returns The product submission or null if not found
 */
export const getSubmissionById = async (submissionId: string): Promise<ProductSubmission | null> => {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ProductSubmission;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting submission:', error);
    throw error;
  }
};
