import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if a valid API key is present (not undefined, empty, or placeholder string).
const isConfigValid =
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY" &&
  import.meta.env.VITE_FIREBASE_API_KEY.trim() !== "";

const app = initializeApp(isConfigValid ? firebaseConfig : {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
});

export const db = initializeFirestore(app, isConfigValid ? {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
} : {});

export const firebaseIsConfigured = isConfigValid;
export const auth = firebaseIsConfigured ? getAuth(app) : null;
