import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { differenceInDays } from 'date-fns';

// Define types for email sequences and logs
interface SequenceEmail {
  subject: string;
  body: string;
  sendAfterDays?: number;
  triggerEvent?: string;
}

interface EmailSequence {
  id: string;
  name: string;
  type: 'user' | 'vendor';
  emails: SequenceEmail[];
  status: 'active' | 'inactive';
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

type EmailSendStatus = 'success' | 'failed' | 'pending' | 'retry';

interface EmailLog {
  id?: string;
  sequenceId: string;
  emailIndex: number;
  recipient: string;
  subject: string;
  sentAt: admin.firestore.Timestamp;
  status: EmailSendStatus;
  error?: string;
  retryCount: number;
  triggerType: 'scheduled' | 'event';
  triggerValue: string | number; // Either days or event name
  userId?: string;
}

// Collection paths
const COLLECTIONS = {
  EMAIL_SEQUENCES: 'email_sequences',
  EMAIL_LOGS: 'email_logs',
  USERS: 'users',
};

// Gmail service account configuration
const getGmailConfig = () => {
  try {
    const gmailConfig = functions.config().gmail || {};
    return {
      clientEmail: gmailConfig.client_email || '',
      privateKey: gmailConfig.private_key || '',
      projectId: gmailConfig.project_id || ''
    };
  } catch (error) {
    console.error('Error getting Gmail config:', error);
    return {
      clientEmail: '',
      privateKey: '',
      projectId: ''
    };
  }
};

// Maximum number of retry attempts for failed emails
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Creates a transporter for sending emails using service account
 */
async function createTransporter() {
  const { clientEmail, privateKey } = getGmailConfig();
  
  // Check if all required config values are present
  if (!clientEmail || !privateKey) {
    throw new Error('Missing Gmail API configuration. Please set gmail.client_email and gmail.private_key in Firebase config.');
  }
  
  // Create a transporter using service account credentials
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: clientEmail,
      serviceClient: clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n')
    }
  });
  
  return transporter;
}

/**
 * Sends an email using nodemailer with service account
 */
async function sendEmail(recipient: string, subject: string, body: string): Promise<void> {
  try {
    const transporter = await createTransporter();
    const { clientEmail } = getGmailConfig();
    
    const mailOptions = {
      from: `"Products 2025" <${clientEmail}>`,
      to: recipient,
      subject,
      html: body
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Creates a log entry for an email send attempt
 */
async function createEmailLog(log: EmailLog): Promise<string> {
  try {
    const db = admin.firestore();
    const logRef = await db.collection(COLLECTIONS.EMAIL_LOGS).add({
      ...log,
      sentAt: log.sentAt || admin.firestore.FieldValue.serverTimestamp()
    });
    
    return logRef.id;
  } catch (error) {
    console.error('Error creating email log:', error);
    throw error;
  }
}

/**
 * Updates an existing email log entry
 */
async function updateEmailLog(logId: string, updates: Partial<EmailLog>): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection(COLLECTIONS.EMAIL_LOGS).doc(logId).update(updates);
  } catch (error) {
    console.error('Error updating email log:', error);
    throw error;
  }
}

/**
 * Gets all active email sequences
 */
async function getActiveSequences(): Promise<EmailSequence[]> {
  try {
    const db = admin.firestore();
    const sequencesSnapshot = await db
      .collection(COLLECTIONS.EMAIL_SEQUENCES)
      .where('status', '==', 'active')
      .get();
    
    const sequences: EmailSequence[] = [];
    
    sequencesSnapshot.forEach((doc) => {
      const data = doc.data() as Omit<EmailSequence, 'id'>;
      sequences.push({
        id: doc.id,
        ...data
      });
    });
    
    return sequences;
  } catch (error) {
    console.error('Error getting active sequences:', error);
    throw error;
  }
}

/**
 * Gets all users for sending emails
 */
async function getUsers(): Promise<{ id: string; email: string; createdAt: admin.firestore.Timestamp }[]> {
  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
    
    const users: { id: string; email: string; createdAt: admin.firestore.Timestamp }[] = [];
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email) {
        users.push({
          id: doc.id,
          email: data.email,
          createdAt: data.createdAt
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Checks if an email has already been sent to a user
 */
async function hasEmailBeenSent(sequenceId: string, emailIndex: number, userId: string): Promise<boolean> {
  try {
    const db = admin.firestore();
    const logsSnapshot = await db
      .collection(COLLECTIONS.EMAIL_LOGS)
      .where('sequenceId', '==', sequenceId)
      .where('emailIndex', '==', emailIndex)
      .where('userId', '==', userId)
      .where('status', '==', 'success')
      .limit(1)
      .get();
    
    return !logsSnapshot.empty;
  } catch (error) {
    console.error('Error checking if email has been sent:', error);
    throw error;
  }
}

/**
 * Gets emails that need to be retried
 */
async function getFailedEmailsForRetry(): Promise<{ id: string; log: EmailLog }[]> {
  try {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const oneDayAgo = new Date(now.toMillis() - 24 * 60 * 60 * 1000);
    
    const logsSnapshot = await db
      .collection(COLLECTIONS.EMAIL_LOGS)
      .where('status', '==', 'failed')
      .where('retryCount', '<', MAX_RETRY_ATTEMPTS)
      .where('sentAt', '>', admin.firestore.Timestamp.fromDate(oneDayAgo))
      .get();
    
    const failedEmails: { id: string; log: EmailLog }[] = [];
    
    logsSnapshot.forEach((doc) => {
      failedEmails.push({
        id: doc.id,
        log: doc.data() as EmailLog
      });
    });
    
    return failedEmails;
  } catch (error) {
    console.error('Error getting failed emails for retry:', error);
    throw error;
  }
}

/**
 * Processes scheduled emails based on user creation date
 */
export const processScheduledEmails = functions.pubsub
  .schedule('0 9 * * *') // Run daily at 9:00 AM
  .timeZone('America/New_York')
  .onRun(async () => {
    try {
      const sequences = await getActiveSequences();
      const users = await getUsers();
      
      for (const sequence of sequences) {
        // Only process sequences with scheduled emails
        const scheduledEmails = sequence.emails.filter(email => email.sendAfterDays !== undefined);
        
        if (scheduledEmails.length === 0) continue;
        
        for (const user of users) {
          // Skip if user doesn't have a creation date
          if (!user.createdAt) continue;
          
          const userCreationDate = user.createdAt.toDate();
          const today = new Date();
          const daysSinceCreation = differenceInDays(today, userCreationDate);
          
          for (let i = 0; i < scheduledEmails.length; i++) {
            const emailIndex = sequence.emails.indexOf(scheduledEmails[i]);
            const email = scheduledEmails[i];
            const sendAfterDays = email.sendAfterDays as number;
            
            // Check if it's time to send this email
            if (daysSinceCreation === sendAfterDays) {
              // Check if this email has already been sent to this user
              const alreadySent = await hasEmailBeenSent(sequence.id, emailIndex, user.id);
              
              if (alreadySent) continue;
              
              // Create a pending log entry
              const logEntry: EmailLog = {
                sequenceId: sequence.id,
                emailIndex,
                recipient: user.email,
                subject: email.subject,
                sentAt: admin.firestore.Timestamp.now(),
                status: 'pending',
                retryCount: 0,
                triggerType: 'scheduled',
                triggerValue: sendAfterDays,
                userId: user.id
              };
              
              const logId = await createEmailLog(logEntry);
              
              try {
                // Send the email
                await sendEmail(user.email, email.subject, email.body);
                
                // Update log to success
                await updateEmailLog(logId, {
                  status: 'success'
                });
                
                console.log(`Successfully sent scheduled email to ${user.email}`);
              } catch (error) {
                // Update log to failed
                await updateEmailLog(logId, {
                  status: 'failed',
                  error: error instanceof Error ? error.message : String(error)
                });
                
                console.error(`Failed to send scheduled email to ${user.email}:`, error);
              }
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error processing scheduled emails:', error);
      return null;
    }
  });

/**
 * Processes event-triggered emails
 */
export const processEventTriggeredEmail = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snapshot, context) => {
    try {
      const eventData = snapshot.data();
      const eventType = eventData.type;
      const userId = eventData.userId;
      
      if (!eventType || !userId) {
        console.log('Event missing required fields:', eventData);
        return null;
      }
      
      // Get user data
      const db = admin.firestore();
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`User ${userId} not found`);
        return null;
      }
      
      const userData = userDoc.data();
      const userEmail = userData?.email;
      
      if (!userEmail) {
        console.log(`User ${userId} has no email`);
        return null;
      }
      
      // Get active sequences with matching trigger event
      const sequences = await getActiveSequences();
      const matchingSequences = sequences.filter(sequence => 
        sequence.emails.some(email => email.triggerEvent === eventType)
      );
      
      for (const sequence of matchingSequences) {
        // Find all emails with matching trigger event
        sequence.emails.forEach(async (email, index) => {
          if (email.triggerEvent === eventType) {
            // Check if this event-triggered email has already been sent to this user
            const alreadySent = await hasEmailBeenSent(sequence.id, index, userId);
            
            if (alreadySent) return;
            
            // Create a pending log entry
            const logEntry: EmailLog = {
              sequenceId: sequence.id,
              emailIndex: index,
              recipient: userEmail,
              subject: email.subject,
              sentAt: admin.firestore.Timestamp.now(),
              status: 'pending',
              retryCount: 0,
              triggerType: 'event',
              triggerValue: eventType,
              userId
            };
            
            const logId = await createEmailLog(logEntry);
            
            try {
              // Send the email
              await sendEmail(userEmail, email.subject, email.body);
              
              // Update log to success
              await updateEmailLog(logId, {
                status: 'success'
              });
              
              console.log(`Successfully sent event-triggered email to ${userEmail}`);
            } catch (error) {
              // Update log to failed
              await updateEmailLog(logId, {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
              });
              
              console.error(`Failed to send event-triggered email to ${userEmail}:`, error);
            }
          }
        });
      }
      
      return null;
    } catch (error) {
      console.error('Error processing event-triggered email:', error);
      return null;
    }
  });

/**
 * Retries failed emails
 */
export const retryFailedEmails = functions.pubsub
  .schedule('0 */4 * * *') // Run every 4 hours
  .timeZone('America/New_York')
  .onRun(async () => {
    try {
      const failedEmails = await getFailedEmailsForRetry();
      
      for (const { id, log } of failedEmails) {
        try {
          // Get the sequence and email
          const db = admin.firestore();
          const sequenceDoc = await db.collection(COLLECTIONS.EMAIL_SEQUENCES).doc(log.sequenceId).get();
          
          if (!sequenceDoc.exists) {
            console.log(`Sequence ${log.sequenceId} not found, skipping retry`);
            continue;
          }
          
          const sequence = sequenceDoc.data() as EmailSequence;
          
          // Skip if sequence is no longer active
          if (sequence.status !== 'active') continue;
          
          // Get the email from the sequence
          const email = sequence.emails[log.emailIndex];
          
          if (!email) {
            console.log(`Email at index ${log.emailIndex} not found in sequence ${log.sequenceId}`);
            continue;
          }
          
          // Update log to retry status
          await updateEmailLog(id, {
            status: 'retry',
            retryCount: log.retryCount + 1
          });
          
          // Send the email
          await sendEmail(log.recipient, email.subject, email.body);
          
          // Update log to success
          await updateEmailLog(id, {
            status: 'success'
          });
          
          console.log(`Successfully retried email to ${log.recipient}`);
        } catch (error) {
          // Update log with new error
          await updateEmailLog(id, {
            status: 'failed',
            retryCount: log.retryCount + 1,
            error: error instanceof Error ? error.message : String(error)
          });
          
          console.error(`Failed to retry email to ${log.recipient}:`, error);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error retrying failed emails:', error);
      return null;
    }
  });
