import { db } from '../firebaseConfig';
import { auth } from '../firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  QuerySnapshot,
  DocumentData,
  onSnapshot,
} from 'firebase/firestore';
import { CanadianProduct, validateCanadianProduct, createCanadianProduct } from '../types/product';
import { cacheService } from '../services/cacheService';

const COLLECTION_NAME = 'canadian_products';

// Track last sync time globally
let lastSyncTime = 0;
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Add a new Canadian product to the database
 */
export async function addCanadianProduct(
  productData: Partial<CanadianProduct>,
  userId: string,
  userEmail: string,
  userName: string
): Promise<string> {
  const errors = validateCanadianProduct(productData);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  const product = createCanadianProduct({
    ...productData,
    added_by: userId,
    added_by_email: userEmail,
    added_by_name: userName,
    modified_by: userId,
    modified_by_email: userEmail,
    modified_by_name: userName,
  });

  const docRef = await addDoc(collection(db, COLLECTION_NAME), product);
  return docRef.id;
}

/**
 * Update an existing Canadian product
 */
export async function updateCanadianProduct(
  productId: string,
  updates: Partial<CanadianProduct>,
  userId: string,
  userEmail: string,
  userName: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, productId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error('Product not found');
  }

  const currentData = docSnap.data() as CanadianProduct;
  const updatedData = {
    ...currentData,
    ...updates,
    modified_by: userId,
    modified_by_email: userEmail,
    modified_by_name: userName,
    date_modified: new Date().toISOString(),
  };

  const errors = validateCanadianProduct(updatedData);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  await updateDoc(docRef, updatedData);
}

/**
 * Delete a Canadian product
 */
export async function deleteCanadianProduct(productId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, productId);
  await deleteDoc(docRef);
}

/**
 * Get a single Canadian product by ID
 */
export async function getCanadianProduct(productId: string): Promise<CanadianProduct | null> {
  const docRef = doc(db, COLLECTION_NAME, productId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docSnap.data() as CanadianProduct;
}

/**
 * Get all Canadian products
 */
export async function getAllCanadianProducts(): Promise<CanadianProduct[]> {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), orderBy('date_modified', 'desc'))
  );
  return querySnapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
}

/**
 * Get the latest updates since last sync
 */
async function getLatestUpdates(): Promise<CanadianProduct[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('date_modified', '>', new Date(lastSyncTime).toISOString()),
    orderBy('date_modified', 'desc')
  );

  const snapshot = await getDocs(q);
  lastSyncTime = Date.now();
  
  return snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
}

/**
 * Search Canadian products by various criteria
 */
export async function searchCanadianProducts(criteria: {
  brand_name?: string;
  province?: string;
  city?: string;
  production_verified?: boolean;
  categories?: string[];
}): Promise<CanadianProduct[]> {
  // Check if we need to refresh the cache
  const isCacheValid = await cacheService.isCacheValid();
  const now = Date.now();
  
  if (!isCacheValid) {
    // Full refresh needed
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
    await cacheService.cacheProducts(products);
    lastSyncTime = now;
  } else if (now - lastSyncTime > SYNC_INTERVAL) {
    // Get only recent updates
    const updates = await getLatestUpdates();
    if (updates.length > 0) {
      await cacheService.cacheProducts(updates);
    }
  }

  // Get products from cache
  let results = await cacheService.getCachedProducts();

  // Apply filters
  if (criteria.brand_name) {
    const searchTerm = criteria.brand_name.toLowerCase();
    results = results.filter(product => 
      product.brand_name.toLowerCase().includes(searchTerm) ||
      product.products.some(p => p.toLowerCase().includes(searchTerm)) ||
      product.categories.some(c => c.toLowerCase().includes(searchTerm))
    );
  }

  if (criteria.province) {
    results = results.filter(product => 
      product.province.toLowerCase() === criteria.province?.toLowerCase()
    );
  }

  if (criteria.city) {
    results = results.filter(product => 
      product.city.toLowerCase() === criteria.city?.toLowerCase()
    );
  }

  if (typeof criteria.production_verified === 'boolean') {
    results = results.filter(product => 
      product.production_verified === criteria.production_verified
    );
  }

  if (criteria.categories && criteria.categories.length > 0) {
    results = results.filter(product => 
      criteria.categories?.some(cat => 
        product.categories.map(c => c.toLowerCase()).includes(cat.toLowerCase())
      )
    );
  }

  // Sort by brand name
  return results.sort((a, b) => a.brand_name.localeCompare(b.brand_name));
}

/**
 * Set up real-time listener for updates
 */
export function setupProductsListener() {
  const q = query(collection(db, COLLECTION_NAME));
  
  return onSnapshot(q, async (snapshot) => {
    if (!snapshot.empty) {
      const products = snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
      await cacheService.cacheProducts(products);
    }
  });
}

/**
 * Get Canadian products by tag
 */
export async function getCanadianProductsByTag(tag: string): Promise<CanadianProduct[]> {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where('cdn_prod_tags', 'array-contains', tag))
  );
  return querySnapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
}

/**
 * Get Canadian products by brand name
 */
export async function getCanadianProductsByBrand(brandName: string): Promise<CanadianProduct[]> {
  const querySnapshot = await getDocs(
    query(collection(db, COLLECTION_NAME), where('brand_name', '==', brandName))
  );
  return querySnapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
}

/**
 * Batch import Canadian products
 */
export async function batchImportCanadianProducts(
  products: Partial<CanadianProduct>[],
  userId: string,
  userEmail: string,
  userName: string
): Promise<BatchImportResult> {
  const result: BatchImportResult = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  // Get the current user's email
  const userAuthEmail = auth.currentUser?.email;
  if (!userAuthEmail) {
    throw new Error('User must be logged in with an email address');
  }

  // Debug: Check user role
  const userDoc = await getDoc(doc(db, 'users', userId));
  console.log('User document:', userDoc.exists() ? userDoc.data() : 'No user document found');

  console.log('Auth state:', {
    currentUser: auth.currentUser,
    email: userAuthEmail,
    uid: auth.currentUser?.uid
  });

  const batch = [];
  for (let i = 0; i < products.length; i++) {
    try {
      const errors = validateCanadianProduct(products[i]);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const product = createCanadianProduct({
        ...products[i],
        added_by: userId,
        added_by_email: userAuthEmail,
        added_by_name: userName,
        modified_by: userId,
        modified_by_email: userAuthEmail,
        modified_by_name: userName,
      });

      console.log('Full product data being sent:', {
        collection: COLLECTION_NAME,
        data: product,
        auth: {
          uid: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          role: userDoc.data()?.role
        }
      });

      batch.push(addDoc(collection(db, COLLECTION_NAME), product));
      result.successful++;
    } catch (error) {
      result.failed++;
      result.errors.push({
        index: i,
        error: error.message,
        data: products[i],
      });
    }
  }

  await Promise.all(batch);
  return result;
}

/**
 * Get statistics for Canadian products
 */
export async function getCanadianProductStats(): Promise<CanadianProductStats> {
  const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
  const stats: CanadianProductStats = {
    totalProducts: 0,
    byProvince: {},
    byVerificationStatus: {
      verified: 0,
      unverified: 0,
    },
    byCategory: {},
    totalBrands: new Set<string>().size,
    totalTags: new Set<string>().size,
  };

  const brands = new Set<string>();
  const tags = new Set<string>();

  querySnapshot.forEach((doc) => {
    const product = doc.data() as CanadianProduct;
    stats.totalProducts++;

    // Count by province
    stats.byProvince[product.province] = (stats.byProvince[product.province] || 0) + 1;

    // Count by verification status
    if (product.production_verified) {
      stats.byVerificationStatus.verified++;
    } else {
      stats.byVerificationStatus.unverified++;
    }

    // Count by category
    product.categories.forEach((category) => {
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // Track unique brands and tags
    brands.add(product.brand_name);
    product.cdn_prod_tags.forEach((tag) => tags.add(tag));
  });

  stats.totalBrands = brands.size;
  stats.totalTags = tags.size;

  return stats;
}

/**
 * Track verification status changes
 */
export async function updateVerificationStatus(
  productId: string,
  newStatus: boolean,
  userId: string,
  userEmail: string,
  userName: string,
  notes?: string
): Promise<void> {
  const productRef = doc(db, COLLECTION_NAME, productId);
  const verificationHistoryRef = collection(db, 'canadian_products_verification_history');

  const productSnap = await getDoc(productRef);
  if (!productSnap.exists()) {
    throw new Error('Product not found');
  }

  const product = productSnap.data() as CanadianProduct;
  const previousStatus = product.production_verified;

  // Only track if status actually changed
  if (previousStatus !== newStatus) {
    const change: VerificationStatusChange = {
      productId,
      brandName: product.brand_name,
      previousStatus,
      newStatus,
      changedBy: userId,
      changedByEmail: userEmail,
      changedByName: userName,
      changeDate: new Date().toISOString(),
      notes,
    };

    await Promise.all([
      updateDoc(productRef, {
        production_verified: newStatus,
        modified_by: userId,
        modified_by_email: userEmail,
        modified_by_name: userName,
        date_modified: change.changeDate,
      }),
      addDoc(verificationHistoryRef, change),
    ]);
  }
}

/**
 * Export Canadian products data (e.g., for backup or reporting)
 */
export async function exportCanadianProducts(format: 'json' | 'csv' = 'json'): Promise<string> {
  const products = await getAllCanadianProducts();

  if (format === 'json') {
    return JSON.stringify(products, null, 2);
  } else {
    // CSV format
    const headers = [
      'brand_name',
      'website',
      'city',
      'province',
      'production_verified',
      'notes',
      'products',
      'categories',
      'cdn_prod_tags',
      'date_added',
      'date_modified',
    ].join(',');

    const rows = products.map((p) => [
      `"${p.brand_name}"`,
      `"${p.website}"`,
      `"${p.city}"`,
      `"${p.province}"`,
      p.production_verified,
      `"${p.notes || ''}"`,
      `"${p.products.join(';')}"`,
      `"${p.categories.join(';')}"`,
      `"${p.cdn_prod_tags.join(';')}"`,
      p.date_added,
      p.date_modified,
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}

/**
 * Get verification history for a product
 */
export async function getVerificationHistory(productId: string): Promise<VerificationStatusChange[]> {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'canadian_products_verification_history'),
      where('productId', '==', productId),
      orderBy('changeDate', 'desc')
    )
  );

  return querySnapshot.docs.map(doc => doc.data() as VerificationStatusChange);
}

/**
 * Force a sync with the latest data
 */
export async function forceSync(): Promise<void> {
  const q = query(collection(db, COLLECTION_NAME));
  const querySnapshot = await getDocs(q);
  const products = querySnapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id } as CanadianProduct));
  await cacheService.cacheProducts(products);
  lastSyncTime = Date.now();
}
