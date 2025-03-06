import { Timestamp } from 'firebase/firestore';

/**
 * Represents an individual email within a sequence
 */
export interface SequenceEmail {
  subject: string;
  body: string;
  // Either sendAfterDays or triggerEvent should be provided
  sendAfterDays?: number;
  triggerEvent?: string;
}

/**
 * Status of an email sequence
 */
export type SequenceStatus = 'active' | 'inactive';

/**
 * Type of email sequence
 */
export type SequenceType = 'user' | 'vendor';

/**
 * Represents an email sequence in the Firestore database
 */
export interface EmailSequence {
  id: string;
  name: string;
  type: SequenceType;
  emails: SequenceEmail[];
  status: SequenceStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firestore collection paths
 */
export const COLLECTION_PATHS = {
  EMAIL_SEQUENCES: 'email_sequences'
} as const;
