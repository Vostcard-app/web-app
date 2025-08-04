// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBFnR-0QZ6lIzgXfwEEXSt6lp6fKZt4fNc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bnb-keeper-baced.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bnb-keeper-baced",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bnb-keeper-baced.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "268443900050",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:268443900050:web:703857a981493eb6796e4b"
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

console.log('✅ Firebase services initialized:', {
  auth: !!auth,
  db: !!db,
  storage: !!storage
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