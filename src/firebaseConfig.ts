// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDNbo5KseD17nVAGw2jvGykVbelgJoIpFo",
  authDomain: "vostcard-a3b71.firebaseapp.com",
  projectId: "vostcard-a3b71",
  storageBucket: "vostcard-a3b71.appspot.com",  // ✅ Fixed this line
  messagingSenderId: "897191018962",
  appId: "1:897191018962:web:f989f240aa68cd7099080b",
  measurementId: "G-G6BVKFH8BE"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development') {
  try {
    // Enable Firebase emulators for local development;
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    console.log('✅ Firebase emulators connected for development');
  } catch (error) {
    console.log('Firebase emulators already connected or not available');
  }
}