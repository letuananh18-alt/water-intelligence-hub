// ==========================================================================
// LIVE FIREBASE CLOUD CONFIGURATION & INITIALIZATION
// Connected to project: thuduc-water-hub
// ==========================================================================

const firebaseConfig = {
  apiKey: "AIzaSyBvDBnrQvUMfYzwk15VFLM0XqDqY2-UYzw",
  authDomain: "thuduc-water-hub.firebaseapp.com",
  projectId: "thuduc-water-hub",
  storageBucket: "thuduc-water-hub.firebasestorage.app",
  messagingSenderId: "1078655296118",
  appId: "1:1078655296118:web:9cd66c44aa5ba2cce67557",
  measurementId: "G-Q7R7BJ5D5J"
};

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let isFirebaseLive = false;

try {
  if (typeof firebase !== 'undefined') {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    firebaseStorage = firebase.storage();
    isFirebaseLive = true;
    console.log("🔥 Live Firebase Cloud Services successfully initialized for thuduc-water-hub!");
  } else {
    console.warn("⚠️ Firebase SDK script tags not yet loaded.");
  }
} catch (err) {
  console.warn("⚠️ Firebase initialization notice:", err.message);
}

window.firebaseConfig = firebaseConfig;
window.firebaseAuth = firebaseAuth;
window.firebaseDb = firebaseDb;
window.firebaseStorage = firebaseStorage;
window.isFirebaseLive = isFirebaseLive;
