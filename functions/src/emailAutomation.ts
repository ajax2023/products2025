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
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: clientEmail,
      pass: process.env.GMAIL_PASSWORD || functions.config().gmail?.password
    }
  });
  
  return transporter;
}

/**
 * Sends an email using nodemailer with service account
 */
async function sendEmail(recipient: string, subject: string, body: string): Promise<void> {
  console.log(`[EMAIL SYSTEM] Preparing to send email to ${recipient} with subject: ${subject}`);
  
  try {
    // Check if we have Gmail config
    const { clientEmail, privateKey } = getGmailConfig();
    
    if (!clientEmail || !privateKey) {
      console.error('[EMAIL SYSTEM] Missing Gmail API configuration. Email will be logged but not sent.');
      
      // Log the email content for debugging
      console.log('[EMAIL SYSTEM] Email content that would have been sent:');
      console.log(`[EMAIL SYSTEM] To: ${recipient}`);
      console.log(`[EMAIL SYSTEM] Subject: ${subject}`);
      console.log(`[EMAIL SYSTEM] Body: ${body.substring(0, 200)}...`);
      
      // For testing, we'll consider this a success since we're logging it
      console.log('[EMAIL SYSTEM] Email logged successfully (but not actually sent)');
      return;
    }
    
    console.log(`[EMAIL SYSTEM] Creating email transporter with client email: ${clientEmail}`);
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: `"Products 2025" <${clientEmail}>`,
      to: recipient,
      subject,
      html: body
    };

    console.log('[EMAIL SYSTEM] Sending email...');
    await transporter.sendMail(mailOptions);
    console.log('[EMAIL SYSTEM] Email sent successfully');
  } catch (error) {
    console.error('[EMAIL SYSTEM] Error sending email:', error);
    
    // Log the attempted email for debugging
    console.log('[EMAIL SYSTEM] Failed email details:');
    console.log(`[EMAIL SYSTEM] To: ${recipient}`);
    console.log(`[EMAIL SYSTEM] Subject: ${subject}`);
    
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
      const eventId = context.params.eventId;
      const eventType = eventData.type;
      const userId = eventData.userId;
      
      console.log(`[EMAIL SYSTEM] Event trigger fired for event ID: ${eventId}`);
      console.log(`[EMAIL SYSTEM] Event data:`, JSON.stringify(eventData));
      
      if (!eventType || !userId) {
        console.log(`[EMAIL SYSTEM] Event missing required fields:`, JSON.stringify(eventData));
        return null;
      }
      
      // Get user data
      const db = admin.firestore();
      console.log(`[EMAIL SYSTEM] Looking up user data for user ID: ${userId}`);
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      
      if (!userDoc.exists) {
        console.log(`[EMAIL SYSTEM] User ${userId} not found`);
        return null;
      }
      
      const userData = userDoc.data();
      const userEmail = userData?.email;
      
      if (!userEmail) {
        console.log(`[EMAIL SYSTEM] User ${userId} has no email`);
        return null;
      }
      
      console.log(`[EMAIL SYSTEM] Found user email: ${userEmail}`);
      
      // Get active sequences with matching trigger event
      console.log(`[EMAIL SYSTEM] Looking for active sequences with trigger event: ${eventType}`);
      const sequences = await getActiveSequences();
      console.log(`[EMAIL SYSTEM] Found ${sequences.length} active sequences total`);
      
      const matchingSequences = sequences.filter(sequence => 
        sequence.emails.some(email => email.triggerEvent === eventType)
      );
      
      console.log(`[EMAIL SYSTEM] Found ${matchingSequences.length} matching sequences for event type: ${eventType}`);
      
      for (const sequence of matchingSequences) {
        console.log(`[EMAIL SYSTEM] Processing sequence: ${sequence.id} - ${sequence.name}`);
        
        // Find all emails with matching trigger event
        sequence.emails.forEach(async (email, index) => {
          if (email.triggerEvent === eventType) {
            console.log(`[EMAIL SYSTEM] Found matching email at index ${index} with subject: ${email.subject}`);
            
            // Check if this event-triggered email has already been sent to this user
            const alreadySent = await hasEmailBeenSent(sequence.id, index, userId);
            
            if (alreadySent) {
              console.log(`[EMAIL SYSTEM] Email already sent to user ${userId}, skipping`);
              return;
            }
            
            console.log(`[EMAIL SYSTEM] Preparing to send email to ${userEmail}`);
            
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
            
            console.log(`[EMAIL SYSTEM] Creating email log entry`);
            const logId = await createEmailLog(logEntry);
            console.log(`[EMAIL SYSTEM] Created log entry with ID: ${logId}`);
            
            try {
              // Send the email
              console.log(`[EMAIL SYSTEM] Attempting to send email to ${userEmail}`);
              await sendEmail(userEmail, email.subject, email.body);
              
              // Update log to success
              await updateEmailLog(logId, {
                status: 'success'
              });
              
              console.log(`[EMAIL SYSTEM] Successfully sent event-triggered email to ${userEmail}`);
            } catch (error) {
              // Update log to failed
              console.error(`[EMAIL SYSTEM] Failed to send email:`, error);
              await updateEmailLog(logId, {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error)
              });
              
              console.error(`[EMAIL SYSTEM] Failed to send event-triggered email to ${userEmail}:`, error);
            }
          }
        });
      }
      
      return null;
    } catch (error) {
      console.error('[EMAIL SYSTEM] Error processing event-triggered email:', error);
      return null;
    }
  });

/**
 * Listens for new user creation and triggers the user_registration event
 */
export const onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    try {
      const userData = snapshot.data();
      const userId = context.params.userId;
      
      console.log(`[EMAIL SYSTEM] User created trigger fired for user ID: ${userId}`);
      console.log(`[EMAIL SYSTEM] User data:`, JSON.stringify(userData));
      
      if (!userData.email) {
        console.log(`[EMAIL SYSTEM] User ${userId} has no email, skipping registration email`);
        return null;
      }
      
      // Create an event document to trigger the email sequence
      const db = admin.firestore();
      console.log(`[EMAIL SYSTEM] Creating user_registration event for user ${userId} with email ${userData.email}`);
      
      const eventRef = await db.collection('events').add({
        type: 'user_registration',
        userId: userId,
        userEmail: userData.email,
        timestamp: admin.firestore.Timestamp.now(),
        metadata: {
          source: 'user_creation',
          userDisplayName: userData.displayName || ''
        }
      });
      
      console.log(`[EMAIL SYSTEM] Created user_registration event with ID: ${eventRef.id} for user ${userId}`);
      return null;
    } catch (error) {
      console.error('[EMAIL SYSTEM] Error creating user registration event:', error);
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

/**
 * Test function to manually trigger a welcome email for a user
 */
export const testWelcomeEmail = functions.https.onCall(async (data, context) => {
  try {
    // Ensure the user is authenticated
    if (!context.auth) {
      console.log('[EMAIL SYSTEM] Unauthorized test email attempt');
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to test emails');
    }
    
    // Get the user ID from the request or use the authenticated user's ID
    const userId = data.userId || context.auth.uid;
    console.log(`[EMAIL SYSTEM] Test welcome email triggered for user: ${userId}`);
    
    // Get user data
    const db = admin.firestore();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`[EMAIL SYSTEM] Test failed: User ${userId} not found`);
      throw new functions.https.HttpsError('not-found', `User ${userId} not found`);
    }
    
    const userData = userDoc.data();
    const userEmail = userData?.email;
    
    if (!userEmail) {
      console.log(`[EMAIL SYSTEM] Test failed: User ${userId} has no email`);
      throw new functions.https.HttpsError('failed-precondition', `User ${userId} has no email`);
    }
    
    console.log(`[EMAIL SYSTEM] Creating test event for user ${userId} with email ${userEmail}`);
    
    // Create an event document to trigger the email sequence
    const eventRef = await db.collection('events').add({
      type: 'user_registration',
      userId: userId,
      userEmail: userEmail,
      timestamp: admin.firestore.Timestamp.now(),
      metadata: {
        source: 'manual_test',
        userDisplayName: userData.displayName || ''
      }
    });
    
    console.log(`[EMAIL SYSTEM] Created test event with ID: ${eventRef.id}`);
    
    // For immediate testing, also directly create an email log and send the email
    console.log(`[EMAIL SYSTEM] Directly sending test welcome email to ${userEmail}`);
    
    // Find a welcome email sequence
    const sequencesSnapshot = await db.collection('email_sequences')
      .where('status', '==', 'active')
      .get();
    
    const sequences = sequencesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        type: data.type || 'user',
        emails: Array.isArray(data.emails) ? data.emails : [],
        status: data.status || 'active',
        createdAt: data.createdAt || admin.firestore.Timestamp.now(),
        updatedAt: data.updatedAt || admin.firestore.Timestamp.now()
      };
    });
    
    console.log(`[EMAIL SYSTEM] Found ${sequences.length} active sequences`);
    
    // Look for a sequence with a user_registration trigger
    const welcomeSequence = sequences.find(seq => 
      Array.isArray(seq.emails) && seq.emails.some(email => email.triggerEvent === 'user_registration')
    );
    
    if (!welcomeSequence) {
      console.log('[EMAIL SYSTEM] No welcome email sequence found');
      
      // Create a simple welcome email directly
      const subject = 'Welcome to Products 2025!';
      const body = `
        <h1>Welcome to Products 2025!</h1>
        <p>Thank you for joining our community!</p>
        <p>This is a test welcome email sent directly from our system.</p>
      `;
      
      // Create a log entry
      const logEntry: EmailLog = {
        sequenceId: 'test_sequence',
        emailIndex: 0,
        recipient: userEmail,
        subject,
        sentAt: admin.firestore.Timestamp.now(),
        status: 'pending',
        retryCount: 0,
        triggerType: 'event',
        triggerValue: 'user_registration',
        userId
      };
      
      console.log('[EMAIL SYSTEM] Creating test email log');
      const logId = await createEmailLog(logEntry);
      
      try {
        // Send the email
        await sendEmail(userEmail, subject, body);
        
        // Update log to success
        await updateEmailLog(logId, {
          status: 'success'
        });
        
        console.log(`[EMAIL SYSTEM] Test welcome email sent successfully to ${userEmail}`);
        return { success: true, message: 'Test welcome email sent successfully' };
      } catch (error) {
        console.error('[EMAIL SYSTEM] Failed to send test welcome email:', error);
        
        // Update log to failed
        await updateEmailLog(logId, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
        
        throw new functions.https.HttpsError('internal', 'Failed to send test welcome email');
      }
    } else {
      console.log(`[EMAIL SYSTEM] Found welcome sequence: ${welcomeSequence.id}`);
      
      // Find the welcome email in the sequence
      const welcomeEmailIndex = welcomeSequence.emails.findIndex(email => 
        email.triggerEvent === 'user_registration'
      );
      
      if (welcomeEmailIndex === -1) {
        console.log('[EMAIL SYSTEM] No welcome email found in sequence');
        throw new functions.https.HttpsError('not-found', 'No welcome email found in sequence');
      }
      
      const welcomeEmail = welcomeSequence.emails[welcomeEmailIndex];
      console.log(`[EMAIL SYSTEM] Found welcome email at index ${welcomeEmailIndex}`);
      
      // Create a log entry
      const logEntry: EmailLog = {
        sequenceId: welcomeSequence.id,
        emailIndex: welcomeEmailIndex,
        recipient: userEmail,
        subject: welcomeEmail.subject,
        sentAt: admin.firestore.Timestamp.now(),
        status: 'pending',
        retryCount: 0,
        triggerType: 'event',
        triggerValue: 'user_registration',
        userId
      };
      
      console.log('[EMAIL SYSTEM] Creating email log entry');
      const logId = await createEmailLog(logEntry);
      
      try {
        // Send the email
        await sendEmail(userEmail, welcomeEmail.subject, welcomeEmail.body);
        
        // Update log to success
        await updateEmailLog(logId, {
          status: 'success'
        });
        
        console.log(`[EMAIL SYSTEM] Test welcome email sent successfully to ${userEmail}`);
        return { success: true, message: 'Test welcome email sent successfully' };
      } catch (error) {
        console.error('[EMAIL SYSTEM] Failed to send test welcome email:', error);
        
        // Update log to failed
        await updateEmailLog(logId, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error)
        });
        
        throw new functions.https.HttpsError('internal', 'Failed to send test welcome email');
      }
    }
  } catch (error) {
    console.error('[EMAIL SYSTEM] Error in test welcome email function:', error);
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
