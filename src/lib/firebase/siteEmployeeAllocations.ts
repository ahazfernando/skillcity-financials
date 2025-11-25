import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config";
import { SiteEmployeeAllocation } from "@/types/financial";

const SITE_EMPLOYEE_ALLOCATIONS_COLLECTION = "siteEmployeeAllocations";

// Convert Firestore document to SiteEmployeeAllocation
const docToAllocation = (doc: any): SiteEmployeeAllocation => {
  const data = doc.data();
  return {
    id: doc.id,
    siteId: data.siteId || "",
    siteName: data.siteName || "",
    employeeId: data.employeeId || "",
    employeeName: data.employeeName || "",
    employeeNumber: data.employeeNumber || 1,
    actualWorkingTime: data.actualWorkingTime || data.allocatedHours || "",
    hasExtraTime: data.hasExtraTime || false,
    extraTime: data.extraTime || undefined,
    extraTimeDay: data.extraTimeDay || undefined,
    notes: data.notes || undefined,
    allocatedHours: data.allocatedHours || "", // Legacy field for backward compatibility
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : undefined,
  };
};

// Convert SiteEmployeeAllocation to Firestore document
const allocationToDoc = (allocation: Omit<SiteEmployeeAllocation, "id">): any => {
  return {
    siteId: allocation.siteId,
    siteName: allocation.siteName,
    employeeId: allocation.employeeId,
    employeeName: allocation.employeeName,
    employeeNumber: allocation.employeeNumber,
    actualWorkingTime: allocation.actualWorkingTime || "",
    hasExtraTime: allocation.hasExtraTime || false,
    extraTime: allocation.extraTime || null,
    extraTimeDay: allocation.extraTimeDay || null,
    notes: allocation.notes || null,
    allocatedHours: allocation.allocatedHours || null, // Legacy field for backward compatibility
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all allocations
export const getAllAllocations = async (): Promise<SiteEmployeeAllocation[]> => {
  try {
    const allocationsRef = collection(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION);
    const querySnapshot = await getDocs(allocationsRef);
    const allocations = querySnapshot.docs.map(docToAllocation);
    
    // Sort by siteName first, then by employeeNumber (client-side sort to avoid composite index requirement)
    return allocations.sort((a, b) => {
      if (a.siteName !== b.siteName) {
        return a.siteName.localeCompare(b.siteName);
      }
      return a.employeeNumber - b.employeeNumber;
    });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    throw error;
  }
};

// Get allocations by site ID
export const getAllocationsBySite = async (siteId: string): Promise<SiteEmployeeAllocation[]> => {
  try {
    const allocationsRef = collection(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION);
    const q = query(
      allocationsRef,
      where("siteId", "==", siteId)
    );
    const querySnapshot = await getDocs(q);
    const allocations = querySnapshot.docs.map(docToAllocation);
    
    // Sort by employeeNumber (client-side sort to avoid index requirement)
    return allocations.sort((a, b) => a.employeeNumber - b.employeeNumber);
  } catch (error) {
    console.error("Error fetching allocations by site:", error);
    throw error;
  }
};

// Get allocation by ID
export const getAllocationById = async (id: string): Promise<SiteEmployeeAllocation | null> => {
  try {
    const allocationRef = doc(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION, id);
    const allocationSnap = await getDoc(allocationRef);
    if (allocationSnap.exists()) {
      return docToAllocation(allocationSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching allocation:", error);
    throw error;
  }
};

// Add new allocation
export const addAllocation = async (
  allocation: Omit<SiteEmployeeAllocation, "id">
): Promise<string> => {
  try {
    const allocationData = allocationToDoc(allocation);
    const docRef = await addDoc(collection(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION), allocationData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding allocation:", error);
    throw error;
  }
};

// Update allocation
export const updateAllocation = async (
  id: string,
  updates: Partial<Omit<SiteEmployeeAllocation, "id">>
): Promise<void> => {
  try {
    const allocationRef = doc(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Convert undefined values to null for Firestore compatibility
    Object.keys(updates).forEach((key) => {
      const value = updates[key as keyof typeof updates];
      if (value !== undefined) {
        updateData[key] = value;
      } else {
        // Set to null if explicitly undefined (to clear the field)
        updateData[key] = null;
      }
    });

    await updateDoc(allocationRef, updateData);
  } catch (error) {
    console.error("Error updating allocation:", error);
    throw error;
  }
};

// Delete allocation
export const deleteAllocation = async (id: string): Promise<void> => {
  try {
    const allocationRef = doc(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION, id);
    await deleteDoc(allocationRef);
  } catch (error) {
    console.error("Error deleting allocation:", error);
    throw error;
  }
};

// Reorder employees for a site (update all employee numbers)
export const reorderEmployeesForSite = async (
  siteId: string,
  allocationIds: string[]
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    allocationIds.forEach((allocationId, index) => {
      const allocationRef = doc(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION, allocationId);
      batch.update(allocationRef, {
        employeeNumber: index + 1,
        updatedAt: Timestamp.now(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error reordering employees:", error);
    throw error;
  }
};

// Delete all allocations for a site
export const deleteAllocationsBySite = async (siteId: string): Promise<void> => {
  try {
    const allocations = await getAllocationsBySite(siteId);
    const batch = writeBatch(db);
    
    allocations.forEach((allocation) => {
      const allocationRef = doc(db, SITE_EMPLOYEE_ALLOCATIONS_COLLECTION, allocation.id);
      batch.delete(allocationRef);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting allocations by site:", error);
    throw error;
  }
};

