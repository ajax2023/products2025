import * as functions from 'firebase-functions';
import sgMail from '@sendgrid/mail';

/**
 * Validates an email address format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Direct SendGrid mail test function - simplified to minimize points of failure
 */
export const directMailTest = functions.https.onCall(async (data, context) => {
  console.log('Starting direct mail test...');
  
  try {
    // Get the API key from config
    const apiKey = functions.config().sendgrid?.api_key;
    if (!apiKey) {
      throw new Error('SendGrid API key is missing');
    }
    
    // Get and validate the email address
    const emailAddress = data.email || 'qcajax@gmail.com';
    
    // Validate email format
    if (!isValidEmail(emailAddress)) {
      throw new Error(`Invalid email format: "${emailAddress}"`);
    }
    
    console.log('Setting API key...');
    sgMail.setApiKey(apiKey);
    
    // Get the sender email from config or use a default that might be verified already
    const fromEmail = functions.config().sendgrid?.from_email || 'ajax@canada2025.com';
    console.log(`Using sender email: ${fromEmail}`);
    
    // Create a simple test email
    const msg = {
      to: emailAddress,
      from: {
        email: fromEmail, // Use the configured email
        name: 'Canada 2025 Products'
      },
      subject: 'Direct SendGrid Test - ' + new Date().toISOString(),
      text: 'This is a direct test of the SendGrid API',
      html: '<strong>This is a direct test of the SendGrid API</strong>',
    };
    
    console.log(`Sending direct test email to ${emailAddress}...`);
    await sgMail.send(msg);
    
    console.log('Direct test email sent successfully');
    return { success: true, message: 'Test email sent successfully' };
  } catch (error: any) {
    console.error('Error in direct mail test:', error);
    
    // Return detailed error information for debugging
    return { 
      success: false, 
      error: {
        message: error.message || 'Unknown error',
        details: error.toString(),
        response: error.response ? {
          body: error.response.body,
          headers: error.response.headers,
          statusCode: error.response.statusCode
        } : null
      }
    };
  }
});
