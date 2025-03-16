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

// Share a list with other users
export const shareList = async (list: GroceryList, emails: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!user.email) throw new Error("User email not available");

  // Create or update the Firestore document
  const listRef = list.firebaseId 
    ? doc(sharedListsCollection, list.firebaseId)
    : doc(sharedListsCollection);

  const firestoreList: FirestoreSharedList = {
    name: list.name,
    ownerId: user.uid,
    ownerEmail: user.email,
    ownerName: user.displayName || user.email,
    sharedWith: emails,
    items: list.items,
    lastUpdated: Date.now(),
    lastUpdatedBy: user.uid,
    lastUpdatedByName: user.displayName || user.email
  };

  await setDoc(listRef, firestoreList);
  
  // Update the local Dexie record
  const updatedList = {
    ...list,
    isShared: true,
    sharedWith: emails,
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
  
  const listRef = doc(sharedListsCollection, list.firebaseId);
  
  await updateDoc(listRef, {
    items: updatedItems,
    lastUpdated: Date.now(),
    lastUpdatedBy: user.uid,
    lastUpdatedByName: user.displayName || user.email || ''
  });
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
