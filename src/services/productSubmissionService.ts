import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CanadianProduct, ExtendedProductSubmissionFormData, ProductSubmission, SubmissionStatus } from '../types/productSubmission';

// Collection names
const SUBMISSIONS_COLLECTION = 'product_submissions';
const PRODUCTS_COLLECTION = 'canadian_products';

/**
 * Create a new product submission
 * @param formData The product submission data
 * @param userId The ID of the user making the submission
 * @returns True if the submission was created successfully
 */
export const createProductSubmission = async (formData: ExtendedProductSubmissionFormData, userId: string) => {
  try {
    // Extract only the fields that exist in CanadianProduct
    const submissionData = {
      brand_name: formData.brand_name,
      website: formData.website,
      city: formData.city,
      province: formData.province,
      country: formData.country,
      notes: formData.notes,
      products: formData.products,
      categories: formData.categories,
      masterCategory: formData.masterCategory || null,
      added_by: formData.added_by,
      added_by_email: formData.added_by_email,
      added_by_name: formData.added_by_name,
      date_added: formData.date_added,
      date_modified: formData.date_modified,
      
      // Add submission metadata
      submittedBy: userId, 
      status: 'pending' as SubmissionStatus,
      submittedAt: serverTimestamp()
    };
    
    // Remove any undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(submissionData).filter(([_, v]) => v !== undefined)
    );

    await addDoc(collection(db, SUBMISSIONS_COLLECTION), cleanData);
    return true;
  } catch (error) {
    console.error("Error creating product submission:", error);
    throw error;
  }
};

/**
 * Get a product submission by ID
 * @param id The ID of the submission to get
 * @returns The product submission
 */
export const getProductSubmission = async (id: string): Promise<ProductSubmission> => {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data,
        status: data.status || 'pending',
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || '',
        products: data.products || [],
        categories: data.categories || [],
        masterCategory: data.masterCategory || undefined,
        notes: data.notes || '',
        added_by: data.added_by || '',
        added_by_email: data.added_by_email || '',
        added_by_name: data.added_by_name || '',
        date_added: data.date_added || '',
        date_modified: data.date_modified || '',
        cdn_prod_tags: data.cdn_prod_tags || [],
        production_verified: data.production_verified !== undefined ? data.production_verified : false,
        site_verified: data.site_verified !== undefined ? data.site_verified : false,
        site_verified_by: data.site_verified_by || '',
        site_verified_at: data.site_verified_at || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        version: data.version || 1,
        isPubliclyVisible: data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : false
      } as ProductSubmission;
    } else {
      throw new Error(`Product submission with ID ${id} not found`);
    }
  } catch (error) {
    console.error(`Error getting product submission with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get all product submissions
 * @returns Array of product submissions
 */
export const getAllProductSubmissions = async (): Promise<ProductSubmission[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, SUBMISSIONS_COLLECTION));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        status: data.status || 'pending',
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || '',
        products: data.products || [],
        categories: data.categories || [],
        masterCategory: data.masterCategory || undefined,
        notes: data.notes || '',
        added_by: data.added_by || '',
        date_added: data.date_added || '',
        date_modified: data.date_modified || '',
        cdn_prod_tags: data.cdn_prod_tags || [],
        production_verified: data.production_verified !== undefined ? data.production_verified : false,
        site_verified: data.site_verified !== undefined ? data.site_verified : false,
        site_verified_by: data.site_verified_by || '',
        site_verified_at: data.site_verified_at || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        version: data.version || 1,
        isPubliclyVisible: data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : false
      } as unknown as ProductSubmission;
    });
  } catch (error) {
    console.error('Error getting all product submissions:', error);
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
    const q = query(collection(db, SUBMISSIONS_COLLECTION), where("added_by", "==", userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        status: data.status || 'pending',
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || '',
        products: data.products || [],
        categories: data.categories || [],
        masterCategory: data.masterCategory || undefined,
        notes: data.notes || '',
        added_by: data.added_by || '',
        date_added: data.date_added || '',
        date_modified: data.date_modified || '',
        cdn_prod_tags: data.cdn_prod_tags || [],
        production_verified: data.production_verified !== undefined ? data.production_verified : false,
        site_verified: data.site_verified !== undefined ? data.site_verified : false,
        site_verified_by: data.site_verified_by || '',
        site_verified_at: data.site_verified_at || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        version: data.version || 1,
        isPubliclyVisible: data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : false
      } as unknown as ProductSubmission;
    });
  } catch (error) {
    console.error(`Error getting submissions for user ${userId}:`, error);
    throw error;
  }
};

/**
 * Get all pending submissions
 * @returns Array of pending product submissions
 */
export const getPendingSubmissions = async (): Promise<ProductSubmission[]> => {
  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION), where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        status: data.status || 'pending',
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || '',
        products: data.products || [],
        categories: data.categories || [],
        masterCategory: data.masterCategory || undefined,
        notes: data.notes || '',
        added_by: data.added_by || '',
        date_added: data.date_added || '',
        date_modified: data.date_modified || '',
        cdn_prod_tags: data.cdn_prod_tags || [],
        production_verified: data.production_verified !== undefined ? data.production_verified : false,
        site_verified: data.site_verified !== undefined ? data.site_verified : false,
        site_verified_by: data.site_verified_by || '',
        site_verified_at: data.site_verified_at || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        version: data.version || 1,
        isPubliclyVisible: data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : false
      } as unknown as ProductSubmission;
    });
  } catch (error) {
    console.error('Error getting pending submissions:', error);
    throw error;
  }
};

/**
 * Approve a product submission
 * @param submissionId The ID of the submission to approve
 * @param reviewerId The ID of the reviewer
 * @returns The updated submission
 */
export const approveProductSubmission = async (submissionId: string, reviewerId: string): Promise<ProductSubmission> => {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionDoc = await getDoc(submissionRef);
    
    if (!submissionDoc.exists()) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    const submissionData = submissionDoc.data();
    
    // Check if submission is already approved
    if (submissionData.status === 'approved') {
      throw new Error(`Submission with ID ${submissionId} is already approved`);
    }
    
    // Get reviewer data
    const reviewerRef = doc(db, 'users', reviewerId);
    const reviewerDoc = await getDoc(reviewerRef);
    
    if (!reviewerDoc.exists()) {
      throw new Error(`Reviewer with ID ${reviewerId} not found`);
    }
    
    const reviewerData = reviewerDoc.data();
    
    // Update submission status
    const updateData = {
      status: 'approved' as SubmissionStatus,
      reviewedBy: reviewerId,
      reviewedAt: serverTimestamp(),
      date_modified: new Date().toISOString()
    };
    
    // Update submission
    await updateDoc(submissionRef, updateData);
    
    // Create product from submission
    const productData = {
      brand_name: submissionData.brand_name || '',
      website: submissionData.website || '',
      city: submissionData.city || '',
      province: submissionData.province || '',
      country: submissionData.country || '',
      products: submissionData.products || [],
      categories: submissionData.categories || [],
      masterCategory: submissionData.masterCategory || null,
      notes: submissionData.notes || '',
      cdn_prod_tags: submissionData.cdn_prod_tags || [],
      
      // Submitter info
      added_by: submissionData.added_by || '',
      added_by_email: submissionData.added_by_email || '',
      added_by_name: submissionData.added_by_name || '',
      
      // Rejection details
      rejected_by: '',
      rejected_at: '',
      rejection_reason: '',
      admin_notes: '',
      
      // Metadata
      date_added: submissionData.date_added || new Date().toISOString(),
      date_modified: new Date().toISOString(),
      modified_by: reviewerId,
      modified_by_email: reviewerData.email || '',
      modified_by_name: reviewerData.displayName || '',
      is_active: true,
      version: 1,
      isPubliclyVisible: false,
      production_verified: false,
      site_verified: false,
      site_verified_by: '',
      site_verified_at: ''
    };
    
    // Remove any undefined values
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, v]) => v !== undefined)
    );
    
    // Create the product
    const productRef = await addDoc(collection(db, 'products'), cleanProductData);
    
    // Update the submission with the product ID
    await updateDoc(submissionRef, {
      product_id: productRef.id
    });
    
    // Get the updated submission
    return await getProductById(submissionId);
  } catch (error) {
    console.error(`Error approving submission with ID ${submissionId}:`, error);
    throw error;
  }
};

/**
 * Reject a product submission
 * @param submissionId The ID of the submission to reject
 * @param reviewerId The ID of the reviewer
 * @param reason The reason for rejection
 * @param adminNotes Optional admin notes
 * @returns The updated submission
 */
export const rejectProductSubmission = async (
  submissionId: string,
  adminId: string,
  reason: string,
  adminNotes?: string
): Promise<boolean> => {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionDoc = await getDoc(submissionRef);
    
    if (!submissionDoc.exists()) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    const submissionData = submissionDoc.data();
    
    // Update the submission status to rejected
    await updateDoc(submissionRef, {
      status: 'rejected' as SubmissionStatus,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      rejectionReason: reason,
      adminNotes: adminNotes || '',
      date_modified: new Date().toISOString()
    });
    
    // Create a record in the rejections collection
    const rejectionData = {
      submission_id: submissionId,
      brand_name: submissionData.brand_name || '',
      website: submissionData.website || '',
      city: submissionData.city || '',
      province: submissionData.province || '',
      country: submissionData.country || '',
      products: submissionData.products || [],
      categories: submissionData.categories || [],
      masterCategory: submissionData.masterCategory || null,
      notes: submissionData.notes || '',
      cdn_prod_tags: submissionData.cdn_prod_tags || [],
      
      // Submitter info
      added_by: submissionData.added_by || '',
      added_by_email: submissionData.added_by_email || '',
      added_by_name: submissionData.added_by_name || '',
      
      // Rejection details
      rejected_by: adminId,
      rejected_at: serverTimestamp(),
      rejection_reason: reason,
      admin_notes: adminNotes || '',
      
      // Metadata
      date_added: new Date().toISOString(),
      date_modified: new Date().toISOString(),
      is_active: true
    };
    
    // Remove any undefined values
    const cleanRejectionData = Object.fromEntries(
      Object.entries(rejectionData).filter(([_, v]) => v !== undefined)
    );
    
    // Create the rejection record
    await addDoc(collection(db, 'rejections'), cleanRejectionData);
    
    return true;
  } catch (error) {
    console.error('Error rejecting product submission:', error);
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
    
    // Merge submission data with any edited data
    const mergedData = {
      ...submissionData,
      ...editedData
    };
    
    // Transform submission data to match CanadianProduct structure
    const canadianProductData = {
      brand_name: mergedData.brand_name || '',
      website: mergedData.website || '',
      city: mergedData.city || '',
      province: mergedData.province || '',
      country: mergedData.country || 'Canada', 
      products: mergedData.products || [],
      categories: mergedData.categories || [],
      masterCategory: mergedData.masterCategory || null,
      notes: mergedData.notes || '',
      cdn_prod_tags: mergedData.cdn_prod_tags || [],
      added_by: mergedData.added_by || adminId,
      date_added: mergedData.date_added || new Date().toISOString(),
      date_modified: new Date().toISOString(),
      modified_by: adminId,
      is_active: mergedData.is_active !== undefined ? mergedData.is_active : true,
      version: mergedData.version || 1,
      isPubliclyVisible: mergedData.isPubliclyVisible !== undefined ? mergedData.isPubliclyVisible : true,
      approvedAt: serverTimestamp(),
      approvedBy: adminId,
      sourceSubmissionId: submissionId,
      created_by: mergedData.added_by || adminId
    };
    
    // Add to products collection
    const productRef = await addDoc(collection(db, PRODUCTS_COLLECTION), canadianProductData);
    
    return productRef.id;
  } catch (error) {
    console.error('Error approving submission:', error);
    throw error;
  }
};

/**
 * Reject a product submission
 * @param productId The ID of the product to reject
 * @param reason The reason for rejection
 */
export const rejectProductSubmissionOld = async (productId: string, reason: string, userId: string) => {
  try {
    const productRef = doc(db, SUBMISSIONS_COLLECTION, productId);
    
    await updateDoc(productRef, {
      status: 'rejected' as SubmissionStatus,
      rejectionReason: reason,
      reviewedBy: userId,
      reviewedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error rejecting product submission:', error);
    throw error;
  }
};

/**
 * Approve a product submission with admin review
 * @param submissionId The ID of the submission to approve
 * @param adminId The ID of the admin approving the submission
 * @param adminNotes Optional private notes for admins
 * @param editedData Optional edited data to apply before approval
 */
export const approveSubmissionWithAdminReview = async (
  submissionId: string, 
  adminId: string,
  adminNotes?: string,
  editedData?: Partial<CanadianProduct>
): Promise<boolean> => {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionDoc = await getDoc(submissionRef);
    
    if (!submissionDoc.exists()) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    const submissionData = submissionDoc.data();
    
    // Create a new product in the products collection
    const productData = {
      // Base product data
      brand_name: submissionData.brand_name || '',
      website: submissionData.website || '',
      city: submissionData.city || '',
      province: submissionData.province || '',
      country: submissionData.country || '',
      products: submissionData.products || [],
      categories: submissionData.categories || [],
      masterCategory: submissionData.masterCategory || null,
      notes: submissionData.notes || '',
      cdn_prod_tags: submissionData.cdn_prod_tags || [],
      
      // Submitter info
      added_by: submissionData.added_by || '',
      added_by_email: submissionData.added_by_email || '',
      added_by_name: submissionData.added_by_name || '',
      
      // Timestamps
      date_added: submissionData.date_added || new Date().toISOString(),
      date_modified: new Date().toISOString(),
      
      // Update with edited data if provided
      ...(editedData || {}),
      
      // Add approval metadata
      approved_by: adminId,
      approved_at: serverTimestamp(),
      is_approved: true,
      is_active: true,
      version: 1,
      isPubliclyVisible: false,
      production_verified: false,
      site_verified: false
    };
    
    // Remove any undefined values
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, v]) => v !== undefined)
    );
    
    // Create the product
    const productRef = await addDoc(collection(db, 'products'), cleanProductData);
    
    // Update the submission status
    await updateDoc(submissionRef, {
      status: 'approved' as SubmissionStatus,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      adminNotes: adminNotes || '',
      product_id: productRef.id,
      date_modified: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error approving submission with admin review:', error);
    throw error;
  }
};

/**
 * Create a Canadian product from an approved submission
 * @param submissionId The ID of the approved submission
 * @returns The ID of the created product
 */
export const createCanadianProductFromSubmission = async (submissionId: string): Promise<string> => {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionDoc = await getDoc(submissionRef);
    
    if (!submissionDoc.exists()) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    const submissionData = submissionDoc.data();
    
    // Check if submission is approved
    if (submissionData.status !== 'approved') {
      throw new Error(`Submission with ID ${submissionId} is not approved`);
    }
    
    // Create product data from submission
    const productData = {
      _id: submissionData._id || '',
      brand_name: submissionData.brand_name || '',
      website: submissionData.website || '',
      city: submissionData.city || '',
      province: submissionData.province || '',
      country: submissionData.country || '',
      notes: submissionData.notes || '',
      products: submissionData.products || [],
      categories: submissionData.categories || [],
      masterCategory: submissionData.masterCategory || null,
      cdn_prod_tags: submissionData.cdn_prod_tags || [],
      added_by: submissionData.added_by || '',
      added_by_email: submissionData.added_by_email || '',
      added_by_name: submissionData.added_by_name || '',
      date_added: submissionData.date_added || new Date().toISOString(),
      date_modified: new Date().toISOString(),
      modified_by: submissionData.reviewedBy || '',
      
      // Add product metadata
      is_active: true,
      is_approved: true,
      approved_by: submissionData.reviewedBy || '',
      approved_at: submissionData.reviewedAt || serverTimestamp(),
      submission_id: submissionId
    };
    
    // Remove any undefined values
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, v]) => v !== undefined)
    );
    
    // Create the product
    const productRef = await addDoc(collection(db, 'products'), cleanProductData);
    
    // Update the submission with the product ID
    await updateDoc(submissionRef, {
      product_id: productRef.id,
      date_modified: new Date().toISOString()
    });
    
    return productRef.id;
  } catch (error) {
    console.error('Error creating Canadian product from submission:', error);
    throw error;
  }
};

/**
 * Get product submissions by status
 * @param status The status to filter by
 * @returns Array of product submissions
 */
export const getSubmissionsByStatus = async (status: SubmissionStatus): Promise<ProductSubmission[]> => {
  try {
    const q = query(collection(db, SUBMISSIONS_COLLECTION), where("status", "==", status));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        status: data.status || 'pending',
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || '',
        products: data.products || [],
        categories: data.categories || [],
        masterCategory: data.masterCategory || undefined,
        notes: data.notes || '',
        added_by: data.added_by || '',
        date_added: data.date_added || '',
        date_modified: data.date_modified || '',
        cdn_prod_tags: data.cdn_prod_tags || [],
        production_verified: data.production_verified !== undefined ? data.production_verified : false,
        site_verified: data.site_verified !== undefined ? data.site_verified : false,
        site_verified_by: data.site_verified_by || '',
        site_verified_at: data.site_verified_at || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        version: data.version || 1,
        isPubliclyVisible: data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : false
      } as unknown as ProductSubmission;
    });
  } catch (error) {
    console.error(`Error getting submissions with status ${status}:`, error);
    throw error;
  }
};

/**
 * Convert a submission to a Canadian product
 * @param submission The submission to convert
 * @returns The Canadian product
 */
export const convertSubmissionToProduct = async (submission: ProductSubmission): Promise<CanadianProduct> => {
  try {
    // Create product from submission
    const product: Partial<CanadianProduct> = {
      _id: submission._id,
      brand_name: submission.brand_name,
      website: submission.website,
      city: submission.city,
      province: submission.province,
      country: submission.country,
      notes: submission.notes,
      products: submission.products,
      categories: submission.categories,
      masterCategory: submission.masterCategory,
      added_by: submission.added_by,
      added_by_email: submission.added_by_email,
      added_by_name: submission.added_by_name,
      date_added: submission.date_added,
      date_modified: new Date().toISOString(),
      is_active: true,
      version: 1,
      isPubliclyVisible: false,
      production_verified: false,
      site_verified: false
    };
    
    // Add cdn_prod_tags if it exists in the submission
    if (submission.cdn_prod_tags) {
      (product as any).cdn_prod_tags = submission.cdn_prod_tags;
    }
    
    return product as CanadianProduct;
  } catch (error) {
    console.error('Error converting submission to product:', error);
    throw error;
  }
};

/**
 * Get a product by ID
 * @param id The ID of the product to get
 * @returns The product
 */
export const getProductById = async (id: string): Promise<ProductSubmission> => {
  try {
    const docRef = doc(db, SUBMISSIONS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data,
        status: data.status || 'pending',
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || '',
        city: data.city || '',
        province: data.province || '',
        country: data.country || '',
        products: data.products || [],
        categories: data.categories || [],
        masterCategory: data.masterCategory || undefined,
        notes: data.notes || '',
        added_by: data.added_by || '',
        added_by_email: data.added_by_email || '',
        added_by_name: data.added_by_name || '',
        date_added: data.date_added || '',
        date_modified: data.date_modified || '',
        cdn_prod_tags: data.cdn_prod_tags || [],
        production_verified: data.production_verified !== undefined ? data.production_verified : false,
        site_verified: data.site_verified !== undefined ? data.site_verified : false,
        site_verified_by: data.site_verified_by || '',
        site_verified_at: data.site_verified_at || '',
        is_active: data.is_active !== undefined ? data.is_active : true,
        version: data.version || 1,
        isPubliclyVisible: data.isPubliclyVisible !== undefined ? data.isPubliclyVisible : false
      } as ProductSubmission;
    } else {
      throw new Error(`Product with ID ${id} not found`);
    }
  } catch (error) {
    console.error(`Error getting product with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Approve a product submission
 * @param productId The ID of the product to approve
 * @param verifiedData The verified data for the product
 */
export const approveProduct = async (
  productId: string, 
  verifiedData: {
    production_verified: boolean;
    site_verified: boolean;
    site_verified_by: string;
    site_verified_at: string;
  }
) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(productRef, verifiedData);
  } catch (error) {
    console.error('Error approving product submission:', error);
    throw error;
  }
};

/**
 * Reject a product submission
 * @param productId The ID of the product to reject
 * @param reason The reason for rejection
 */
export const rejectProduct = async (
  productId: string, 
  reason: string
) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(productRef, {
      is_active: false,
      rejectionReason: reason
    });
  } catch (error) {
    console.error('Error rejecting product submission:', error);
    throw error;
  }
};

/**
 * Get a product by ID
 * @param id The ID of the product to get
 * @returns The product
 */
export const getProduct = async (id: string): Promise<CanadianProduct> => {
  try {
    const docRef = doc(db, 'products', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return { 
        id: docSnap.id, 
        ...data,
        _id: data._id || '',
        brand_name: data.brand_name || '',
        website: data.website || ''
      } as unknown as CanadianProduct;
    } else {
      throw new Error(`Product with ID ${id} not found`);
    }
  } catch (error) {
    console.error(`Error getting product with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Approve a product submission with admin review
 * @param submissionId The ID of the submission to approve
 * @param adminId The ID of the admin approving the submission
 * @param adminNotes Optional private notes for admins
 */
export const approveSubmissionWithAdminReviewOld = async (
  submissionId: string, 
  adminId: string,
  adminNotes?: string,
  editedData?: Partial<CanadianProduct>
) => {
  try {
    const submissionRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
    const submissionDoc = await getDoc(submissionRef);
    
    if (!submissionDoc.exists()) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }
    
    const submissionData = submissionDoc.data();
    
    // Prepare update data
    const updateData: any = {
      status: 'approved' as SubmissionStatus,
      reviewedBy: adminId,
      reviewedAt: serverTimestamp(),
      adminNotes: adminNotes || ''
    };
    
    // Apply edited data if provided
    if (editedData) {
      Object.assign(updateData, editedData);
    }
    
    await updateDoc(submissionRef, updateData);
    
    // Create a new product in the products collection
    const productData = {
      ...submissionData,
      // Update with edited data if provided
      ...(editedData || {}),
      // Add approval metadata
      approved_by: adminId,
      approved_at: serverTimestamp(),
      is_approved: true
    };
    
    // Remove any undefined values
    const cleanProductData = Object.fromEntries(
      Object.entries(productData).filter(([_, v]) => v !== undefined)
    );
    
    // Create the product
    await addDoc(collection(db, 'products'), cleanProductData);
    
    return true;
  } catch (error) {
    console.error('Error approving submission with admin review:', error);
    throw error;
  }
};
