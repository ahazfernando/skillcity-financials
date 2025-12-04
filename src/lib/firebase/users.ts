import { collection, getDocs, doc, updateDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "./config";
import { UserData, UserRole } from "../authService";

export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const users: UserData[] = [];
    
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email || "",
        name: data.name || "",
        role: data.role || (data.isAdmin ? "admin" : "employee"),
        isAdmin: data.isAdmin || data.role === "admin",
        approved: data.approved || false,
        approvedAt: data.approvedAt?.toDate(),
        approvedBy: data.approvedBy || "",
        createdAt: data.createdAt?.toDate() || new Date(),
      } as UserData);
    });
    
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
}

export async function getPendingUsers(): Promise<UserData[]> {
  try {
    const q = query(collection(db, "users"), where("approved", "==", false));
    const querySnapshot = await getDocs(q);
    const users: UserData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email || "",
        name: data.name || "",
        role: data.role || "employee",
        isAdmin: data.isAdmin || false,
        approved: false,
        approvedAt: data.approvedAt?.toDate(),
        approvedBy: data.approvedBy || "",
        createdAt: data.createdAt?.toDate() || new Date(),
      } as UserData);
    });
    
    return users;
  } catch (error) {
    console.error("Error fetching pending users:", error);
    throw error;
  }
}

export async function approveUser(userId: string, approvedBy: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      approved: true,
      approvedAt: Timestamp.now(),
      approvedBy: approvedBy,
    });
  } catch (error) {
    console.error("Error approving user:", error);
    throw error;
  }
}

export async function updateUserRole(userId: string, role: UserRole, updatedBy: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    const updateData: any = {
      role: role,
      updatedBy: updatedBy,
      updatedAt: Timestamp.now(),
    };
    
    // Update isAdmin for backward compatibility
    if (role === "admin") {
      updateData.isAdmin = true;
    } else {
      updateData.isAdmin = false;
    }
    
    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
}

export async function rejectUser(userId: string): Promise<void> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      approved: false,
      rejectedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error rejecting user:", error);
    throw error;
  }
}





