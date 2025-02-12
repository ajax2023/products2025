// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Helper function to get environment variables that works in both Vite and Node
const getEnvVar = (key: string): string => {
  // Try Vite environment variables first
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const viteKey = `VITE_${key}`;
    return import.meta.env[viteKey];
  }
  // Fallback to process.env
  return process.env[key] || '';
};

const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('FIREBASE_APP_ID'),
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID')
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);