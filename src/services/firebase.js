import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
 apiKey: "AIzaSyD0AOm4ELi935hCyZUus7d2qd4PNkAZstI",
  authDomain: "flash-card-72702.firebaseapp.com",
  projectId: "flash-card-72702",
  storageBucket: "flash-card-72702.firebasestorage.app",
  messagingSenderId: "459354106645",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);