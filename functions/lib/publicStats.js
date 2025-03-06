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
exports.onUserStatusChange = exports.updatePublicStats = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
/**
 * Updates the public stats document with current counts
 */
exports.updatePublicStats = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async (context) => {
    const db = admin.firestore();
    try {
        // Get count of active users
        const usersSnapshot = await db
            .collection('users')
            .where('status', '==', 'active')
            .get();
        // Get count of Canadian products and public products
        const productsSnapshot = await db
            .collection('canadian_products')
            .get();
        const totalProducts = productsSnapshot.size;
        const publicProducts = productsSnapshot.docs.filter(doc => doc.data().isPubliclyVisible === true).length;
        // Update the public stats document
        await db.doc('public_stats/user_counts').set({
            activeUsers: usersSnapshot.size,
            totalProducts,
            publicProducts,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Public stats updated successfully');
        return null;
    }
    catch (error) {
        console.error('Error updating public stats:', error);
        throw error;
    }
});
/**
 * Also update stats when user status changes
 */
exports.onUserStatusChange = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
    var _a, _b;
    // Only update if status field changed
    const oldStatus = (_a = change.before.data()) === null || _a === void 0 ? void 0 : _a.status;
    const newStatus = (_b = change.after.data()) === null || _b === void 0 ? void 0 : _b.status;
    if (oldStatus === newStatus) {
        return null;
    }
    // Since we can't directly call the function, we'll update the stats manually
    try {
        const db = admin.firestore();
        // Get count of active users
        const usersSnapshot = await db
            .collection('users')
            .where('status', '==', 'active')
            .get();
        // Get count of Canadian products and public products
        const productsSnapshot = await db
            .collection('canadian_products')
            .get();
        const totalProducts = productsSnapshot.size;
        const publicProducts = productsSnapshot.docs.filter(doc => doc.data().isPubliclyVisible === true).length;
        // Update the public stats document
        await db.doc('public_stats/user_counts').set({
            activeUsers: usersSnapshot.size,
            totalProducts,
            publicProducts,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('Public stats updated after user status change');
        return null;
    }
    catch (error) {
        console.error('Error updating stats after user change:', error);
        return null;
    }
});
//# sourceMappingURL=publicStats.js.map