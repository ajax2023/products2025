import { 
  collection, 
  query, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Update, createUpdate } from '../types/update';

const COLLECTION_NAME = 'updates';

// Convert Firestore document to Update type
const convertDocToUpdate = (doc: DocumentData): Update => {
  const data = doc.data();
  return createUpdate({
    id: doc.id,
    title: data.title,
    content: data.content,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    createdBy: data.createdBy || '',
  });
};

// Get all updates ordered by creation date (newest first)
export const getUpdates = async (): Promise<Update[]> => {
  try {
    const updatesQuery = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(updatesQuery);
    return querySnapshot.docs.map(convertDocToUpdate);
  } catch (error) {
    console.error('Error fetching updates:', error);
    return [];
  }
};

// Get a single update by ID
export const getUpdateById = async (id: string): Promise<Update | null> => {
  try {
    const updateDoc = await getDoc(doc(db, COLLECTION_NAME, id));
    
    if (!updateDoc.exists()) {
      return null;
    }
    
    return convertDocToUpdate(updateDoc);
  } catch (error) {
    console.error(`Error fetching update with ID ${id}:`, error);
    return null;
  }
};

// Add a new update
export const addUpdate = async (update: Omit<Update, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...update,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding update:', error);
    throw error;
  }
};

// Update an existing update
export const updateExistingUpdate = async (id: string, updateData: Partial<Update>): Promise<void> => {
  try {
    const updateRef = doc(db, COLLECTION_NAME, id);
    
    await updateDoc(updateRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error updating update with ID ${id}:`, error);
    throw error;
  }
};

// Delete an update
export const deleteUpdate = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (error) {
    console.error(`Error deleting update with ID ${id}:`, error);
    throw error;
  }
};
