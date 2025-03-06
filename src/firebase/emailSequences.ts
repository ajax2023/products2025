import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
  EmailSequence, 
  SequenceEmail, 
  SequenceStatus, 
  SequenceType, 
  COLLECTION_PATHS 
} from '../types/emailSequence';

/**
 * Create a new email sequence
 * @param name Sequence name (e.g., "User Onboarding")
 * @param type Sequence type ('user' or 'vendor')
 * @param emails Array of email objects {subject, body, sendAfterDays or triggerEvent}
 * @param status Sequence status ('active' or 'inactive')
 * @returns Promise with the created sequence ID
 */
export const createEmailSequence = async (
  name: string,
  type: SequenceType,
  emails: SequenceEmail[],
  status: SequenceStatus = 'inactive'
): Promise<string> => {
  try {
    // Validate that each email has either sendAfterDays or triggerEvent
    emails.forEach((email, index) => {
      if (email.sendAfterDays === undefined && email.triggerEvent === undefined) {
        throw new Error(`Email at index ${index} must have either sendAfterDays or triggerEvent defined`);
      }
    });

    const now = serverTimestamp();
    const sequenceData = {
      name,
      type,
      emails,
      status,
      createdAt: now,
      updatedAt: now
    };

    const docRef = await addDoc(
      collection(db, COLLECTION_PATHS.EMAIL_SEQUENCES), 
      sequenceData
    );
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating email sequence:', error);
    throw error;
  }
};

/**
 * Get an email sequence by ID
 * @param sequenceId The ID of the sequence to retrieve
 * @returns Promise with the sequence data
 */
export const getEmailSequence = async (sequenceId: string): Promise<EmailSequence | null> => {
  try {
    const docRef = doc(db, COLLECTION_PATHS.EMAIL_SEQUENCES, sequenceId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        type: data.type,
        emails: data.emails,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as EmailSequence;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting email sequence:', error);
    throw error;
  }
};

/**
 * Get all email sequences, optionally filtered by type
 * @param type Optional filter by sequence type
 * @returns Promise with array of sequences
 */
export const getEmailSequences = async (type?: SequenceType): Promise<EmailSequence[]> => {
  try {
    let q = collection(db, COLLECTION_PATHS.EMAIL_SEQUENCES);
    
    if (type) {
      q = query(q, where('type', '==', type));
    }
    
    const querySnapshot = await getDocs(q);
    const sequences: EmailSequence[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sequences.push({
        id: doc.id,
        name: data.name,
        type: data.type,
        emails: data.emails,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as EmailSequence);
    });
    
    return sequences;
  } catch (error) {
    console.error('Error getting email sequences:', error);
    throw error;
  }
};

/**
 * Update an email sequence
 * @param sequenceId ID of the sequence to update
 * @param updates Object containing fields to update
 * @returns Promise that resolves when update is complete
 */
export const updateEmailSequence = async (
  sequenceId: string,
  updates: Partial<Omit<EmailSequence, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    // Validate emails if they are being updated
    if (updates.emails) {
      updates.emails.forEach((email, index) => {
        if (email.sendAfterDays === undefined && email.triggerEvent === undefined) {
          throw new Error(`Email at index ${index} must have either sendAfterDays or triggerEvent defined`);
        }
      });
    }

    const docRef = doc(db, COLLECTION_PATHS.EMAIL_SEQUENCES, sequenceId);
    
    // Add updatedAt timestamp to the updates
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating email sequence:', error);
    throw error;
  }
};

/**
 * Update the status of an email sequence
 * @param sequenceId ID of the sequence to update
 * @param status New status ('active' or 'inactive')
 * @returns Promise that resolves when update is complete
 */
export const updateSequenceStatus = async (
  sequenceId: string,
  status: SequenceStatus
): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_PATHS.EMAIL_SEQUENCES, sequenceId);
    await updateDoc(docRef, { 
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating sequence status:', error);
    throw error;
  }
};

/**
 * Add a new email to an existing sequence
 * @param sequenceId ID of the sequence to update
 * @param email Email object to add (with either sendAfterDays or triggerEvent)
 * @returns Promise that resolves when update is complete
 */
export const addEmailToSequence = async (
  sequenceId: string,
  email: SequenceEmail
): Promise<void> => {
  try {
    // Validate that the email has either sendAfterDays or triggerEvent
    if (email.sendAfterDays === undefined && email.triggerEvent === undefined) {
      throw new Error('Email must have either sendAfterDays or triggerEvent defined');
    }

    const sequenceRef = doc(db, COLLECTION_PATHS.EMAIL_SEQUENCES, sequenceId);
    const sequenceSnap = await getDoc(sequenceRef);
    
    if (!sequenceSnap.exists()) {
      throw new Error(`Sequence with ID ${sequenceId} does not exist`);
    }
    
    const sequenceData = sequenceSnap.data();
    const updatedEmails = [...sequenceData.emails, email];
    
    await updateDoc(sequenceRef, {
      emails: updatedEmails,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding email to sequence:', error);
    throw error;
  }
};

/**
 * Get email sequences by trigger event
 * @param triggerEvent The event name to filter by
 * @returns Promise with array of sequences containing emails with the specified trigger event
 */
export const getSequencesByTriggerEvent = async (triggerEvent: string): Promise<EmailSequence[]> => {
  try {
    const sequencesRef = collection(db, COLLECTION_PATHS.EMAIL_SEQUENCES);
    const querySnapshot = await getDocs(sequencesRef);
    const matchingSequences: EmailSequence[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Check if any email in the sequence has the matching trigger event
      const hasMatchingTrigger = data.emails.some(
        (email: SequenceEmail) => email.triggerEvent === triggerEvent
      );
      
      if (hasMatchingTrigger) {
        matchingSequences.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          emails: data.emails,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        } as EmailSequence);
      }
    });
    
    return matchingSequences;
  } catch (error) {
    console.error('Error getting sequences by trigger event:', error);
    throw error;
  }
};

/**
 * Delete an email sequence
 * @param sequenceId ID of the sequence to delete
 * @returns Promise that resolves when deletion is complete
 */
export const deleteEmailSequence = async (sequenceId: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTION_PATHS.EMAIL_SEQUENCES, sequenceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting email sequence:', error);
    throw error;
  }
};
