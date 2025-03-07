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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.directMailTest = void 0;
const functions = __importStar(require("firebase-functions"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
/**
 * Validates an email address format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Direct SendGrid mail test function - simplified to minimize points of failure
 */
exports.directMailTest = functions.https.onCall(async (data, context) => {
    var _a, _b;
    console.log('Starting direct mail test...');
    try {
        // Get the API key from config
        const apiKey = (_a = functions.config().sendgrid) === null || _a === void 0 ? void 0 : _a.api_key;
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
        mail_1.default.setApiKey(apiKey);
        // Get the sender email from config or use a default that might be verified already
        const fromEmail = ((_b = functions.config().sendgrid) === null || _b === void 0 ? void 0 : _b.from_email) || 'ajax@canada2025.com';
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
        await mail_1.default.send(msg);
        console.log('Direct test email sent successfully');
        return { success: true, message: 'Test email sent successfully' };
    }
    catch (error) {
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
//# sourceMappingURL=directMailTest.js.map