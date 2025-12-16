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

// Get user by email
export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    return {
      uid: userDoc.id,
      email: data.email || "",
      name: data.name || "",
      role: data.role || (data.isAdmin ? "admin" : "employee"),
      isAdmin: data.isAdmin || data.role === "admin",
      approved: data.approved || false,
      approvedAt: data.approvedAt?.toDate(),
      approvedBy: data.approvedBy || "",
      createdAt: data.createdAt?.toDate() || new Date(),
    } as UserData;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    throw error;
  }
}

// Update user role by email (for employees)
export async function updateUserRoleByEmail(email: string, role: UserRole = "employee", updatedBy?: string): Promise<void> {
  try {
    if (!email) {
      return;
    }
    
    const user = await getUserByEmail(email);
    if (!user) {
      // User doesn't exist yet, skip silently
      return;
    }
    
    // Don't change admin users to employee
    if (user.isAdmin || user.role === "admin") {
      return;
    }
    
    const userRef = doc(db, "users", user.uid);
    const updateData: any = {
      role: role,
      updatedAt: Timestamp.now(),
    };
    
    if (updatedBy) {
      updateData.updatedBy = updatedBy;
    }
    
    // Update isAdmin for backward compatibility
    if (role === "admin") {
      updateData.isAdmin = true;
    } else {
      updateData.isAdmin = false;
    }
    
    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error("Error updating user role by email:", error);
    // Don't throw - this is a background operation
  }
}

// Sync all employees to have "employee" role in users collection
export async function syncAllEmployeesToUserRole(updatedBy?: string): Promise<{ updated: number; skipped: number }> {
  try {
    const { getAllEmployees } = await import("./employees");
    const employees = await getAllEmployees();
    
    let updated = 0;
    let skipped = 0;
    
    for (const employee of employees) {
      if (employee.email && employee.type === "employee") {
        try {
          await updateUserRoleByEmail(employee.email, "employee", updatedBy);
          updated++;
        } catch (error) {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
    
    return { updated, skipped };
  } catch (error) {
    console.error("Error syncing employees to user roles:", error);
    throw error;
  }
}



















