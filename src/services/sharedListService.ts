import { db, auth } from '../firebaseConfig';
import { collection, doc, setDoc, getDoc, updateDoc, onSnapshot, query, where, getDocs, arrayRemove } from 'firebase/firestore';
import { groceryDb, GroceryList, GroceryItem } from '../config/groceryDb';

// Collection references
const sharedListsCollection = collection(db, 'sharedLists');

// Firestore document structure 
interface FirestoreSharedList {
  name: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  sharedWith: string[]; // Array of emails
  items: GroceryItem[];
  lastUpdated: number;
  lastUpdatedBy: string;
  lastUpdatedByName: string;
}

// Helper function to detect circular references
function detectCircularReferences(obj: any, path = ''): string[] {
  const found: string[] = [];
  const seen = new WeakSet();
  
  function detect(obj: any, path: string) {
    if (obj && typeof obj === 'object') {
      if (seen.has(obj)) {
        found.push(path);
        return;
      }
      seen.add(obj);
      
      for (const [key, value] of Object.entries(obj)) {
        detect(value, path ? `${path}.${key}` : key);
      }
    }
  }
  
  detect(obj, path);
  return found;
}

// Helper function to sanitize an object for Firestore
// Removes undefined values, converts dates to timestamps, etc.
function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) {
    return null;
  }
  
  if (data instanceof Date) {
    return data.getTime(); // Convert Date to milliseconds timestamp
  }
  
  if (Array.isArray(data)) {
    return data
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined && item !== null);
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const sanitizedValue = sanitizeForFirestore(value);
      // Only include defined, non-null values
      if (sanitizedValue !== undefined && sanitizedValue !== null) {
        sanitized[key] = sanitizedValue;
      }
    }
    
    return sanitized;
  }
  
  // For primitive values, return as is
  return data;
}

// Share a list with other users
export const shareList = async (list: GroceryList, emails: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!user.email) throw new Error("User email not available");

  // Ensure we have valid user information
  const safeUserEmail = user.email || '';
  const safeUserDisplayName = user.displayName || safeUserEmail;
  const safeUserId = user.uid;

  console.log('User information for sharing:', {
    uid: safeUserId,
    email: safeUserEmail,
    displayName: safeUserDisplayName
  });

  // Filter out any undefined or null values from emails array
  const validEmails = emails.filter(email => email !== undefined && email !== null && email.trim() !== '');
  
  console.log('Sharing list with validated emails:', {
    listName: list.name,
    originalEmailsCount: emails.length,
    filteredEmailsCount: validEmails.length,
    emails: validEmails
  });

  // Validate and clean items array
  const validItems = (list.items || []).map(item => {
    // Create a new clean item object
    const cleanItem: GroceryItem = {
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Unnamed Item',
      // Only include defined fields
      ...(item.category !== undefined && { category: item.category }),
      ...(item.typicalPrice !== undefined && { typicalPrice: item.typicalPrice }),
      ...(item.preferredStore !== undefined && { preferredStore: item.preferredStore }),
      ...(item.checked !== undefined && { checked: item.checked }),
      ...(item.order !== undefined && { order: item.order }),
      ...(item.cost !== undefined && { cost: item.cost }),
      ...(item.barcode !== undefined && { barcode: item.barcode }),
      ...(item.canadianProductId !== undefined && { canadianProductId: item.canadianProductId })
    };
    
    return cleanItem;
  });

  // Log validation results for debugging
  console.log('Items validation:', {
    originalItemsCount: list.items?.length || 0,
    validItemsCount: validItems.length
  });

  // Debug log - check the entire document for any undefined values
  let firestoreList: FirestoreSharedList = {
    name: list.name || 'Unnamed List',
    ownerId: safeUserId,
    ownerEmail: safeUserEmail,
    ownerName: safeUserDisplayName,
    sharedWith: validEmails,
    items: validItems,
    lastUpdated: Date.now(),
    lastUpdatedBy: safeUserId,
    lastUpdatedByName: safeUserDisplayName
  };

  // Thoroughly sanitize the entire object
  firestoreList = sanitizeForFirestore(firestoreList) as FirestoreSharedList;
  console.log('Sanitized list for Firestore:', firestoreList);

  // Debug check for undefined values
  const undefinedFields: string[] = [];
  Object.entries(firestoreList).forEach(([key, value]) => {
    if (value === undefined) {
      undefinedFields.push(key);
    }
  });

  // Check for undefined values in items
  firestoreList.items.forEach((item, index) => {
    Object.entries(item).forEach(([key, value]) => {
      if (value === undefined) {
        undefinedFields.push(`items[${index}].${key}`);
      }
    });
  });

  if (undefinedFields.length > 0) {
    console.error('Found undefined fields in document:', undefinedFields);
    throw new Error(`Cannot save document with undefined fields: ${undefinedFields.join(', ')}`);
  }

  // Check for circular references
  const circularRefs = detectCircularReferences(firestoreList);
  if (circularRefs.length > 0) {
    console.error('Found circular references in document:', circularRefs);
    throw new Error(`Cannot save document with circular references: ${circularRefs.join(', ')}`);
  }

  // Create or update the Firestore document
  const listRef = list.firebaseId 
    ? doc(sharedListsCollection, list.firebaseId)
    : doc(sharedListsCollection);

  try {
    await setDoc(listRef, firestoreList);
    console.log('Document saved successfully');
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
  
  // Update the local Dexie record
  const updatedList = {
    ...list,
    isShared: true,
    sharedWith: validEmails,
    items: validItems,
    firebaseId: listRef.id,
    lastUpdated: Date.now(),
    lastUpdatedBy: user.uid
  };
  
  // Update the Dexie database
  if (list.id) {
    await groceryDb.groceryLists.update(list.id, updatedList);
  }
  
  return updatedList;
};

// Stop sharing a list
export const stopSharing = async (list: GroceryList) => {
  if (!list.firebaseId) return list;
  
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  
  // Delete the Firestore document
  const listRef = doc(sharedListsCollection, list.firebaseId);
  await setDoc(listRef, { isDeleted: true, deletedAt: Date.now() }, { merge: true });
  
  // Update the local Dexie record
  const updatedList = {
    ...list,
    isShared: false,
    sharedWith: [],
    firebaseId: undefined,
    lastUpdated: Date.now(),
    lastUpdatedBy: user.uid
  };
  
  if (list.id) {
    await groceryDb.groceryLists.update(list.id, updatedList);
  }
  
  return updatedList;
};

// Subscribe to real-time updates for a shared list
export const subscribeToSharedList = (
  listId: string, 
  callback: (updatedList: FirestoreSharedList) => void
) => {
  const listRef = doc(sharedListsCollection, listId);
  return onSnapshot(listRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as FirestoreSharedList);
    }
  });
};

// Update a shared list item 
export const updateSharedListItem = async (
  list: GroceryList,
  updatedItems: GroceryItem[]
) => {
  if (!list.firebaseId) return;
  
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Ensure valid user data
  const safeUserId = user.uid;
  const safeUserDisplayName = user.displayName || user.email || '';
  
  // Clean and validate items
  const validItems = updatedItems.map(item => {
    return {
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Unnamed Item',
      // Only include defined fields
      ...(item.category !== undefined && { category: item.category }),
      ...(item.typicalPrice !== undefined && { typicalPrice: item.typicalPrice }),
      ...(item.preferredStore !== undefined && { preferredStore: item.preferredStore }),
      ...(item.checked !== undefined && { checked: item.checked }),
      ...(item.order !== undefined && { order: item.order }),
      ...(item.cost !== undefined && { cost: item.cost }),
      ...(item.barcode !== undefined && { barcode: item.barcode }),
      ...(item.canadianProductId !== undefined && { canadianProductId: item.canadianProductId })
    };
  });
  
  const listRef = doc(sharedListsCollection, list.firebaseId);
  
  // Prepare update data
  let updateData = {
    items: validItems,
    lastUpdated: Date.now(),
    lastUpdatedBy: safeUserId,
    lastUpdatedByName: safeUserDisplayName
  };
  
  // Sanitize before updating
  updateData = sanitizeForFirestore(updateData);
  
  console.log('Updating shared list with sanitized data:', {
    listId: list.firebaseId,
    itemCount: updateData.items.length
  });
  
  try {
    await updateDoc(listRef, updateData);
    console.log('Shared list updated successfully');
  } catch (error) {
    console.error('Error updating shared list:', error);
    throw error;
  }
};

// Convert Firestore data to GroceryList for shared lists
const convertToGroceryList = (doc: any, data: FirestoreSharedList): GroceryList => {
  return {
    userId: data.ownerId, // Use the original owner's ID, not the current user
    name: data.name,
    date: data.lastUpdated,
    items: data.items,
    isShared: true,
    sharedWith: data.sharedWith,
    firebaseId: doc.id,
    lastUpdated: data.lastUpdated,
    lastUpdatedBy: data.lastUpdatedBy
  };
};

// Get all shared lists for the current user (both owned and shared with)
export const getSharedLists = async (): Promise<GroceryList[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!user.email) throw new Error("User email not available");
  
  // Get lists shared with me
  const sharedWithMeQuery = query(
    sharedListsCollection, 
    where('sharedWith', 'array-contains', user.email)
  );
  
  // Get lists I've shared with others
  const mySharedListsQuery = query(
    sharedListsCollection, 
    where('ownerId', '==', user.uid)
  );
  
  const [sharedWithMeSnapshot, mySharedListsSnapshot] = await Promise.all([
    getDocs(sharedWithMeQuery),
    getDocs(mySharedListsQuery)
  ]);
  
  const sharedLists: GroceryList[] = [];
  
  // Process lists shared with me
  sharedWithMeSnapshot.forEach(doc => {
    if (!doc.exists()) return;
    
    const data = doc.data() as FirestoreSharedList;
    
    // Skip deleted lists
    if (data['isDeleted']) return;
    
    sharedLists.push(convertToGroceryList(doc, data));
  });
  
  // Process my shared lists (but don't duplicate)
  mySharedListsSnapshot.forEach(doc => {
    if (!doc.exists()) return;
    
    const data = doc.data() as FirestoreSharedList;
    
    // Skip deleted lists
    if (data['isDeleted']) return;
    
    // Skip if we already have this list from the other query
    if (sharedLists.some(list => list.firebaseId === doc.id)) return;
    
    sharedLists.push(convertToGroceryList(doc, data));
  });
  
  console.log('Loaded shared lists:', sharedLists.map(list => ({
    name: list.name,
    userId: list.userId,
    firebaseId: list.firebaseId,
    isOwner: list.userId === user.uid
  })));
  
  return sharedLists;
};

// Request to leave a shared list
export const leaveSharedList = async (list: GroceryList) => {
  if (!list.firebaseId) throw new Error("List is not shared");
  
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!user.email) throw new Error("User email not available");

  try {
    // For debugging
    console.log('Leave list request:', {
      listId: list.firebaseId,
      userEmail: user.email,
      isOwner: list.userId === user.uid,
      ownerId: list.userId
    });

    // If the current user is the owner, they can't leave their own list
    if (list.userId === user.uid) {
      throw new Error("The owner cannot leave their own list. Use 'stopSharing' instead.");
    }

    // For now, we'll just return a successful response without actually modifying Firestore
    // This is because our rules prevent sharees from modifying the sharedWith array
    // In a real implementation, we'd use a Cloud Function or a different approach
    
    // Return an updated list object - just remove locally for now
    const updatedSharedWith = list.sharedWith ? 
      list.sharedWith.filter(email => 
        email.toLowerCase() !== user.email?.toLowerCase()
      ) : [];
      
    return {
      ...list,
      sharedWith: updatedSharedWith
    };
  } catch (error) {
    console.error('Error processing leave request:', error);
    throw error;
  }
};
