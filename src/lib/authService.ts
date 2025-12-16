import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, isFirebaseConfigured, getFirebaseConfig } from "./firebase/config";

export type UserRole = "admin" | "employee" | "manager";

export interface UserData {
  uid: string;
  email: string;
  name?: string;
  role?: UserRole;
  isAdmin?: boolean; // Keep for backward compatibility
  approved?: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt?: Date;
}

class AuthService {
  async register(email: string, password: string, name?: string): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email || email,
        name: name || "",
        role: "employee",
        isAdmin: false,
        approved: false,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", user.uid), userData);

      return userCredential;
    } catch (error: any) {
      // Handle Firebase errors
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Email is already registered. Please sign in instead.");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Password is too weak. Please use a stronger password.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      } else {
        throw new Error(error.message || "Registration failed. Please try again.");
      }
    }
  }

  async login(email: string, password: string): Promise<UserCredential> {
    try {
      // Check if Firebase is properly configured using the exported config
      const firebaseConfig = getFirebaseConfig();
      const apiKey = firebaseConfig.apiKey;
      
      if (!isFirebaseConfigured || 
          !apiKey || 
          apiKey === "dummy-key-for-build-only" || 
          apiKey === "missing-config" || 
          apiKey === "error-fallback") {
        throw new Error(
          "Firebase is not configured. Please set up your Firebase environment variables.\n\n" +
          "For local development: Add them to .env.local file\n" +
          "For Vercel deployment: Go to Project Settings → Environment Variables and add:\n" +
          "- NEXT_PUBLIC_FIREBASE_API_KEY\n" +
          "- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n" +
          "- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n" +
          "- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n" +
          "- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n" +
          "- NEXT_PUBLIC_FIREBASE_APP_ID\n\n" +
          "After adding variables, RESTART your development server (stop with Ctrl+C, then run 'npm run dev')."
        );
      }
      
      // Log the API key prefix for debugging (only in development)
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 Firebase API Key (first 20 chars):", apiKey.substring(0, 20) + "...");
      }
      
      if (!auth) {
        throw new Error("Firebase Auth is not initialized. Please check your Firebase configuration.");
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error: any) {
      // Handle Firebase errors
      if (error.code === "auth/api-key-not-valid" || error.code === "auth/invalid-api-key") {
        const firebaseConfig = getFirebaseConfig();
        const apiKey = firebaseConfig.apiKey;
        const apiKeyPreview = apiKey ? `${apiKey.substring(0, 20)}...` : "MISSING";
        
        // Import the debug function
        import("./firebase/config").then(({ getFirebaseConfigForDebug }) => {
          const debugInfo = getFirebaseConfigForDebug();
          console.error("🔍 Firebase Config Debug Info:", debugInfo);
        }).catch(() => {
          // Ignore if import fails
        });
        
        throw new Error(
          "Firebase API key is invalid or not properly configured.\n\n" +
          `Current API Key: ${apiKeyPreview}\n\n` +
          "⚠️ IMPORTANT: If you just added/updated .env.local:\n" +
          "   1. STOP your dev server (press Ctrl+C in the terminal)\n" +
          "   2. RESTART it with: npm run dev\n" +
          "   3. Clear your browser cache or use incognito mode\n" +
          "   4. Try again\n\n" +
          "If the problem persists:\n" +
          "1. Verify your API key in Firebase Console:\n" +
          "   - Go to https://console.firebase.google.com/\n" +
          "   - Select your project: skillcity-finflow\n" +
          "   - Go to Project Settings (gear icon) → General → Your apps\n" +
          "   - Check the Web app configuration\n" +
          "2. Verify .env.local file exists in the project root and contains:\n" +
          "   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBrotKP6Eu4ETzkvpaQmoAOWUjXPEFZvMw\n" +
          "3. Check browser console for 'Firebase Config Debug Info' to see what's loaded\n" +
          "4. For Vercel: Ensure all Firebase variables are set in Project Settings → Environment Variables"
        );
      } else if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email. Please sign up first.");
      } else if (error.code === "auth/wrong-password") {
        throw new Error("Incorrect password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      } else if (error.code === "auth/invalid-credential") {
        throw new Error("Invalid email or password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("Too many failed attempts. Please try again later.");
      } else {
        throw new Error(error.message || "Login failed. Please try again.");
      }
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || "Logout failed. Please try again.");
    }
  }

  async getUserData(uid: string): Promise<UserData | null> {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        return userDoc.data() as UserData;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  async resetPassword(email: string): Promise<void> {
    try {
      if (!auth) {
        throw new Error("Firebase Auth is not initialized. Please check your Firebase configuration.");
      }
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      } else {
        throw new Error(error.message || "Failed to send password reset email. Please try again.");
      }
    }
  }

  // Create user account for employee (admin function)
  async createEmployeeAccount(email: string, password: string, name: string, employeeId?: string): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email || email,
        name: name || "",
        role: "employee",
        isAdmin: false,
        approved: true, // Auto-approve employee accounts created by admin
        createdAt: new Date(),
        approvedAt: new Date(),
        approvedBy: employeeId || "admin",
      };

      await setDoc(doc(db, "users", user.uid), userData);

      return userCredential;
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Email is already registered. Please use a different email.");
      } else if (error.code === "auth/weak-password") {
        throw new Error("Password is too weak. Please use a stronger password (at least 6 characters).");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.");
      } else {
        throw new Error(error.message || "Failed to create employee account. Please try again.");
      }
    }
  }
}

export const authService = new AuthService();

