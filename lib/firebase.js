// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAuwHQOXrr1zKVuaQfSC56asa0nONwBoNE",
  authDomain: "fancy-academic.firebaseapp.com",
  databaseURL: "https://fancy-academic-default-rtdb.firebaseio.com",
  projectId: "fancy-academic",
  storageBucket: "fancy-academic.firebasestorage.app",
  messagingSenderId: "640640340261",
  appId: "1:640640340261:web:f8a6aec0088922b6258acc",
  measurementId: "G-EGR1VWZFXJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
console.log("✅ Firebase connected:", firebaseConfig.projectId);