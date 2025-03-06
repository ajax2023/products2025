"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryFailedEmails = exports.onUserCreated = exports.processEventTriggeredEmail = exports.processScheduledEmails = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer = __importStar(require("nodemailer"));
const date_fns_1 = require("date-fns");
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
    }
    catch (error) {
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
async function sendEmail(recipient, subject, body) {
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
    }
    catch (error) {
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
async function createEmailLog(log) {
    try {
        const db = admin.firestore();
        const logRef = await db.collection(COLLECTIONS.EMAIL_LOGS).add({
            ...log,
            sentAt: log.sentAt || admin.firestore.FieldValue.serverTimestamp()
        });
        return logRef.id;
    }
    catch (error) {
        console.error('Error creating email log:', error);
        throw error;
    }
}
/**
 * Updates an existing email log entry
 */
async function updateEmailLog(logId, updates) {
    try {
        const db = admin.firestore();
        await db.collection(COLLECTIONS.EMAIL_LOGS).doc(logId).update(updates);
    }
    catch (error) {
        console.error('Error updating email log:', error);
        throw error;
    }
}
/**
 * Gets all active email sequences
 */
async function getActiveSequences() {
    try {
        const db = admin.firestore();
        const sequencesSnapshot = await db
            .collection(COLLECTIONS.EMAIL_SEQUENCES)
            .where('status', '==', 'active')
            .get();
        const sequences = [];
        sequencesSnapshot.forEach((doc) => {
            const data = doc.data();
            sequences.push({
                id: doc.id,
                ...data
            });
        });
        return sequences;
    }
    catch (error) {
        console.error('Error getting active sequences:', error);
        throw error;
    }
}
/**
 * Gets all users for sending emails
 */
async function getUsers() {
    try {
        const db = admin.firestore();
        const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
        const users = [];
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
    }
    catch (error) {
        console.error('Error getting users:', error);
        throw error;
    }
}
/**
 * Checks if an email has already been sent to a user
 */
async function hasEmailBeenSent(sequenceId, emailIndex, userId) {
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
    }
    catch (error) {
        console.error('Error checking if email has been sent:', error);
        throw error;
    }
}
/**
 * Gets emails that need to be retried
 */
async function getFailedEmailsForRetry() {
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
        const failedEmails = [];
        logsSnapshot.forEach((doc) => {
            failedEmails.push({
                id: doc.id,
                log: doc.data()
            });
        });
        return failedEmails;
    }
    catch (error) {
        console.error('Error getting failed emails for retry:', error);
        throw error;
    }
}
/**
 * Processes scheduled emails based on user creation date
 */
exports.processScheduledEmails = functions.pubsub
    .schedule('0 9 * * *') // Run daily at 9:00 AM
    .timeZone('America/New_York')
    .onRun(async () => {
    try {
        const sequences = await getActiveSequences();
        const users = await getUsers();
        for (const sequence of sequences) {
            // Only process sequences with scheduled emails
            const scheduledEmails = sequence.emails.filter(email => email.sendAfterDays !== undefined);
            if (scheduledEmails.length === 0)
                continue;
            for (const user of users) {
                // Skip if user doesn't have a creation date
                if (!user.createdAt)
                    continue;
                const userCreationDate = user.createdAt.toDate();
                const today = new Date();
                const daysSinceCreation = (0, date_fns_1.differenceInDays)(today, userCreationDate);
                for (let i = 0; i < scheduledEmails.length; i++) {
                    const emailIndex = sequence.emails.indexOf(scheduledEmails[i]);
                    const email = scheduledEmails[i];
                    const sendAfterDays = email.sendAfterDays;
                    // Check if it's time to send this email
                    if (daysSinceCreation === sendAfterDays) {
                        // Check if this email has already been sent to this user
                        const alreadySent = await hasEmailBeenSent(sequence.id, emailIndex, user.id);
                        if (alreadySent)
                            continue;
                        // Create a pending log entry
                        const logEntry = {
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
                        }
                        catch (error) {
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
    }
    catch (error) {
        console.error('Error processing scheduled emails:', error);
        return null;
    }
});
/**
 * Processes event-triggered emails
 */
exports.processEventTriggeredEmail = functions.firestore
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
        const userEmail = userData === null || userData === void 0 ? void 0 : userData.email;
        if (!userEmail) {
            console.log(`[EMAIL SYSTEM] User ${userId} has no email`);
            return null;
        }
        console.log(`[EMAIL SYSTEM] Found user email: ${userEmail}`);
        // Get active sequences with matching trigger event
        console.log(`[EMAIL SYSTEM] Looking for active sequences with trigger event: ${eventType}`);
        const sequences = await getActiveSequences();
        console.log(`[EMAIL SYSTEM] Found ${sequences.length} active sequences total`);
        const matchingSequences = sequences.filter(sequence => sequence.emails.some(email => email.triggerEvent === eventType));
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
                    const logEntry = {
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
                    }
                    catch (error) {
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
    }
    catch (error) {
        console.error('[EMAIL SYSTEM] Error processing event-triggered email:', error);
        return null;
    }
});
/**
 * Listens for new user creation and triggers the user_registration event
 */
exports.onUserCreated = functions.firestore
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
    }
    catch (error) {
        console.error('[EMAIL SYSTEM] Error creating user registration event:', error);
        return null;
    }
});
/**
 * Retries failed emails
 */
exports.retryFailedEmails = functions.pubsub
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
                const sequence = sequenceDoc.data();
                // Skip if sequence is no longer active
                if (sequence.status !== 'active')
                    continue;
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
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Error retrying failed emails:', error);
        return null;
    }
});
//# sourceMappingURL=emailAutomation.js.map