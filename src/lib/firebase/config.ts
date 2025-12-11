import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, Auth } from "firebase/auth";

// Helper function to safely get and trim environment variables
// IMPORTANT: Next.js only replaces process.env.NEXT_PUBLIC_* when accessed as literals
// So we must access each variable directly, not through a function parameter
const getEnvVar = (value: string | undefined): string => {
  return value ? value.trim() : "";
};

// Access environment variables directly as literals so Next.js can replace them at build time
// This is critical - Next.js webpack plugin only replaces process.env.NEXT_PUBLIC_* 
// when they are accessed as string literals, not through variables
const firebaseConfig = {
  apiKey: getEnvVar(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: getEnvVar(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: getEnvVar(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: getEnvVar(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getEnvVar(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: getEnvVar(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// Validate that required environment variables are set
// Access them directly as literals for Next.js to replace at build time
const envVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingVars = Object.entries(envVars)
  .filter(([key, value]) => !value || value.trim() === "")
  .map(([key]) => key);

const hasValidConfig = missingVars.length === 0 && firebaseConfig.apiKey !== "";

// Debug logging in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("🔍 Firebase Config Debug (client-side):", {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : "MISSING",
    authDomain: firebaseConfig.authDomain || "MISSING",
    projectId: firebaseConfig.projectId || "MISSING",
    hasValidConfig,
    missingVars: missingVars.length > 0 ? missingVars : "none",
    rawEnvCheck: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "present" : "missing",
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "present" : "missing",
    }
  });
}

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
    // Client-side: log detailed error
    console.error(
      `❌ Firebase configuration is missing in the browser!\n` +
      `Missing variables: ${missingVars.join(', ')}\n\n` +
      `This usually means:\n` +
      `1. The dev server needs to be restarted after creating/updating .env.local\n` +
      `2. The .next cache needs to be cleared: rm -rf .next\n` +
      `3. Browser cache needs to be cleared or use incognito mode\n\n` +
      `Run: npm run dev:clean to fix this.`
    );
  }
}

// Track if we're using a valid config
export const isFirebaseConfigured = hasValidConfig;

// Export the config for validation (safe - these are public keys)
export const getFirebaseConfig = () => firebaseConfig;

// Export config for debugging (safe to expose in client - these are public keys)
export const getFirebaseConfigForDebug = () => {
  if (typeof window === "undefined") {
    return { error: "This function can only be called from the browser" };
  }
  return {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : "MISSING",
    authDomain: firebaseConfig.authDomain || "MISSING",
    projectId: firebaseConfig.projectId || "MISSING",
    storageBucket: firebaseConfig.storageBucket || "MISSING",
    messagingSenderId: firebaseConfig.messagingSenderId || "MISSING",
    appId: firebaseConfig.appId || "MISSING",
    hasValidConfig,
    missingVars: missingVars.length > 0 ? missingVars : undefined,
  };
};

// Initialize Firebase with error handling
let app: FirebaseApp | null = null;
try {
  if (hasValidConfig) {
    // Validate API key format (should start with AIza)
    if (!firebaseConfig.apiKey.startsWith("AIza")) {
      console.error(
        `❌ Invalid Firebase API key format. API keys should start with "AIza".\n` +
        `Current key starts with: ${firebaseConfig.apiKey.substring(0, 10)}...\n` +
        `Please check your NEXT_PUBLIC_FIREBASE_API_KEY in .env.local`
      );
    }
    
    // Log config for debugging (without exposing full API key)
    if (typeof window === "undefined") {
      console.log("🔧 Firebase Config Loaded:");
      console.log(`   API Key: ${firebaseConfig.apiKey.substring(0, 20)}...`);
      console.log(`   Auth Domain: ${firebaseConfig.authDomain}`);
      console.log(`   Project ID: ${firebaseConfig.projectId}`);
    }
    
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log("✅ Firebase initialized successfully");
    } else {
      app = getApps()[0];
    }
  } else {
    // Log error but don't throw - allow app to load and show error in UI
    if (typeof window !== "undefined") {
      // Client-side: log error but don't crash the app
      const errorMessage = 
        `❌ Firebase configuration is missing!\n\n` +
        `Missing variables: ${missingVars.join(', ')}\n\n` +
        `Please ensure all Firebase environment variables are set:\n` +
        `- NEXT_PUBLIC_FIREBASE_API_KEY\n` +
        `- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n` +
        `- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n` +
        `- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n` +
        `- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n` +
        `- NEXT_PUBLIC_FIREBASE_APP_ID\n\n` +
        `For local development, add them to .env.local\n` +
        `For Vercel deployment, add them in Project Settings → Environment Variables`;
      
      console.error(errorMessage);
      
      // Use a minimal config that will fail gracefully when used
      // This allows the app to load and show proper error messages
      const fallbackConfig = {
        apiKey: "missing-config",
        authDomain: "missing.firebaseapp.com",
        projectId: "missing-project",
        storageBucket: "missing.firebasestorage.app",
        messagingSenderId: "000000000",
        appId: "1:000000000:web:missing",
      };
      if (getApps().length === 0) {
        app = initializeApp(fallbackConfig);
      } else {
        app = getApps()[0];
      }
    } else {
      // Server-side during build: use dummy config to allow build to complete
      const fallbackConfig = {
        apiKey: "dummy-key-for-build-only",
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
      console.warn("⚠️ Firebase initialized with dummy config for build. Set environment variables for runtime.");
    }
  }
} catch (error: any) {
  // If initialization fails, log but don't crash
  console.error("Failed to initialize Firebase:", error?.message || error);
  
  // Try to initialize with fallback to prevent app crash
  try {
    const fallbackConfig = {
      apiKey: "error-fallback",
      authDomain: "error.firebaseapp.com",
      projectId: "error-project",
      storageBucket: "error.firebasestorage.app",
      messagingSenderId: "000000000",
      appId: "1:000000000:web:error",
    };
    if (getApps().length === 0) {
      app = initializeApp(fallbackConfig);
    } else {
      app = getApps()[0];
    }
  } catch (fallbackError) {
    console.error("Failed to initialize Firebase even with fallback:", fallbackError);
    // Last resort: create a minimal app instance
    app = null as any;
  }
}

// Initialize services only if app is valid
export const db: Firestore = app ? getFirestore(app) : null as any;
export const storage: FirebaseStorage = app ? getStorage(app) : null as any;
export const auth: Auth = app ? getAuth(app) : null as any;

export default app;