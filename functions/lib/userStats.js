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
exports.updateUserStats = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.updateUserStats = functions.firestore
    .document('products/{productId}')
    .onWrite(async (change, context) => {
    var _a, _b;
    // Get an admin firestore instance
    const db = admin.firestore();
    try {
        // Get the user ID from the document
        const userId = change.after.exists
            ? (_a = change.after.data()) === null || _a === void 0 ? void 0 : _a.created_by
            : (_b = change.before.data()) === null || _b === void 0 ? void 0 : _b.created_by;
        if (!userId) {
            console.log('No user ID found in product document');
            return null;
        }
        // Get all products by this user
        const productsSnapshot = await db
            .collection('products')
            .where('created_by', '==', userId)
            .get();
        // Update user stats
        const userStatsRef = db.collection('user_stats').doc(userId);
        await userStatsRef.set({
            _id: userId,
            total_products: productsSnapshot.size,
            last_contribution: change.after.exists ? new Date() : null,
            updated_at: new Date()
        }, { merge: true });
        console.log(`Updated stats for user ${userId}: ${productsSnapshot.size} products`);
        return null;
    }
    catch (error) {
        console.error('Error updating user stats:', error);
        return null;
    }
});
//# sourceMappingURL=userStats.js.map