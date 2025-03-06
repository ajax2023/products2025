import { Timestamp } from 'firebase/firestore';

/**
 * Status of an email send attempt
 */
export type EmailSendStatus = 'success' | 'failed' | 'pending' | 'retry';

/**
 * Represents a log entry for an email send attempt
 */
export interface EmailLog {
  id: string;
  sequenceId: string;
  emailIndex: number;
  recipient: string;
  subject: string;
  sentAt: Timestamp;
  status: EmailSendStatus;
  error?: string;
  retryCount: number;
  triggerType: 'scheduled' | 'event';
  triggerValue: string | number; // Either days or event name
  userId?: string;
}

/**
 * Firestore collection paths
 */
export const EMAIL_LOG_COLLECTION = 'email_logs';
