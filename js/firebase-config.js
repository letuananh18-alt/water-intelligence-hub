// ==========================================================================
// FIREBASE CONFIGURATION & INITIALIZATION (FIREBASE SDK V10)
// ==========================================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Default Firebase Configuration (replace with your Firebase project config)
export const firebaseConfig = {
  apiKey: "AIzaSyYOUR_FIREBASE_API_KEY_HERE",
  authDomain: "thuduc-water-hub.firebaseapp.com",
  projectId: "thuduc-water-hub",
  storageBucket: "thuduc-water-hub.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

let app, auth, db;
let isFirebaseLive = false;

try {
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY_HERE")) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseLive = true;
    console.log("🔥 Firebase initialized successfully!");
  } else {
    console.warn("⚠️ Using local mock fallback mode. Update js/firebase-config.js with your real Firebase keys for live cloud sync.");
  }
} catch (e) {
  console.warn("⚠️ Running in offline standalone mode:", e.message);
}

export { app, auth, db, isFirebaseLive };
