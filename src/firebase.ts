// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCcSAlfYfh9KrbN3NbI2CTyGY1wqZJ4Mxg",
  authDomain: "vostcard-web-app.firebaseapp.com",
  projectId: "vostcard-web-app",
  storageBucket: "vostcard-web-app.appspot.com",
  messagingSenderId: "963319253335",
  appId: "1:963319253335:web:7f508c7c3297f562e5d612"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);