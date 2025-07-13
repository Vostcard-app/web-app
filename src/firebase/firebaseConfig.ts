// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDNbo5KseD17nVAGw2jvGykVbelgJoIpFo",
  authDomain: "vostcard-a3b71.firebaseapp.com",
  projectId: "vostcard-a3b71",
  storageBucket: "vostcard-a3b71.firebasestorage.app",  // ✅ Fixed this line
  messagingSenderId: "897191018962",
  appId: "1:897191018962:web:f989f240aa68cd7099080b",
  measurementId: "G-G6BVKFH8BE"
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
fetch('https://firebase.googleapis.com/v1/projects/vostcard-a3b71')
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