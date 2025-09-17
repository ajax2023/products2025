// Firestore helpers for managing email sequences
// src/firebase/emailSequences.ts
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { EmailSequence, SequenceEmail, SequenceStatus, SequenceType } from '../types/emailSequence';

const COLLECTION = 'email_sequences';

export async function getEmailSequences(): Promise<EmailSequence[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<EmailSequence, 'id'>) }));
}

export async function createEmailSequence(
  name: string,
  type: SequenceType,
  emails: SequenceEmail[],
  status: SequenceStatus = 'inactive'
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    name,
    type,
    emails,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEmailSequence(
  id: string,
  updates: Partial<Pick<EmailSequence, 'name' | 'type' | 'emails' | 'status'>>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

export async function updateSequenceStatus(id: string, status: SequenceStatus): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
}

export async function deleteEmailSequence(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
