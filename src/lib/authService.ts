import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase/config";

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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error: any) {
      // Handle Firebase errors
      if (error.code === "auth/user-not-found") {
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
}

export const authService = new AuthService();

