// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDNbo5KseD17nVAGw2jvGykVbelgJoIpFo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vostcard-a3b71.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vostcard-a3b71",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vostcard-a3b71.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "897191018962",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:897191018962:web:f989f240aa68cd7099080b",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-G6BVKFH8BE"
};

console.log('🔥 Initializing Firebase with config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

console.log('✅ Firebase services initialized:', {
  auth: !!auth,
  db: !!db,
  storage: !!storage,
  analytics: !!analytics
});

// Test Firebase connectivity
console.log('🌐 Testing Firebase connectivity...');
fetch(`https://firebase.googleapis.com/v1/projects/${firebaseConfig.projectId}`)
  .then(response => {
    console.log('✅ Firebase API is reachable:', response.status);
  })
  .catch(error => {
    console.error('❌ Firebase API connectivity issue:', error);
  });

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  try {
    // Enable Firebase emulators for local development;
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // connectStorageEmulator(storage, 'localhost', 9199);
    console.log('✅ Using production Firebase services (emulators disabled)');
  } catch (error) {
    console.log('Firebase emulators already connected or not available');
  }
}