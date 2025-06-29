// src/firebaseConfig.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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