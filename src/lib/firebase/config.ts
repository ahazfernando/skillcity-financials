import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Validate that required environment variables are set
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter(
  (varName) => !process.env[varName] || process.env[varName] === ""
);

const hasValidConfig = missingVars.length === 0 && firebaseConfig.apiKey !== "";

// Only log errors, don't throw during build
if (missingVars.length > 0) {
  if (typeof window === "undefined") {
    // Server-side: log error but don't throw
    console.error(
      `❌ Missing Firebase environment variables: ${missingVars.join(', ')}\n` +
      `Please create a .env.local file in the root directory with your Firebase configuration.\n` +
      `See FIREBASE_SETUP.md for instructions.`
    );
  } else {
    // Client-side: log warning
    console.warn(
      "❌ Firebase API key is missing. Please check your .env.local file and restart your development server."
    );
  }
}

// Initialize Firebase with error handling
let app: FirebaseApp;
try {
  if (hasValidConfig) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  } else {
    // Create a minimal config to prevent build errors
    // This won't work for actual Firebase operations, but allows build to complete
    const fallbackConfig = {
      apiKey: "dummy-key",
      authDomain: "dummy.firebaseapp.com",
      projectId: "dummy-project",
      storageBucket: "dummy.firebasestorage.app",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:dummy",
    };
    if (getApps().length === 0) {
      app = initializeApp(fallbackConfig);
    } else {
      app = getApps()[0];
    }
    console.warn("⚠️ Firebase initialized with dummy config. Please set up your .env.local file.");
  }
} catch (error: any) {
  // If initialization fails, try with fallback config
  console.error("Failed to initialize Firebase:", error?.message || error);
  const fallbackConfig = {
    apiKey: "dummy-key",
    authDomain: "dummy.firebaseapp.com",
    projectId: "dummy-project",
    storageBucket: "dummy.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:dummy",
  };
  if (getApps().length === 0) {
    app = initializeApp(fallbackConfig);
  } else {
    app = getApps()[0];
  }
}

// Initialize services
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const auth: Auth = getAuth(app);

export default app;