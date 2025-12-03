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
} from "firebase/firestore";
import { db } from "./config";
import { EmployeePayRate } from "@/types/financial";

const EMPLOYEE_PAY_RATES_COLLECTION = "employeePayRates";

// Convert Firestore document to EmployeePayRate
const docToEmployeePayRate = (doc: any): EmployeePayRate => {
  const data = doc.data();
  return {
    id: doc.id,
    siteId: data.siteId || "",
    siteName: data.siteName || "",
    employeeId: data.employeeId || "",
    employeeName: data.employeeName || "",
    hourlyRate: data.hourlyRate || 0,
    travelAllowance: data.travelAllowance || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : undefined,
  };
};

// Convert EmployeePayRate to Firestore document
const employeePayRateToDoc = (payRate: Omit<EmployeePayRate, "id">): any => {
  const doc: any = {
    siteId: payRate.siteId,
    siteName: payRate.siteName,
    employeeId: payRate.employeeId,
    employeeName: payRate.employeeName,
    hourlyRate: payRate.hourlyRate,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  // Only include optional fields if they have values (not undefined)
  if (payRate.travelAllowance !== undefined) {
    doc.travelAllowance = payRate.travelAllowance || null;
  }
  if (payRate.notes !== undefined) {
    doc.notes = payRate.notes || null;
  }
  
  return doc;
};

// Get all employee pay rates
export const getAllEmployeePayRates = async (): Promise<EmployeePayRate[]> => {
  try {
    const payRatesRef = collection(db, EMPLOYEE_PAY_RATES_COLLECTION);
    const q = query(payRatesRef, orderBy("siteName", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToEmployeePayRate);
  } catch (error) {
    console.error("Error fetching employee pay rates:", error);
    throw error;
  }
};

// Get employee pay rates by site ID
export const getEmployeePayRatesBySite = async (siteId: string): Promise<EmployeePayRate[]> => {
  try {
    const payRatesRef = collection(db, EMPLOYEE_PAY_RATES_COLLECTION);
    const q = query(
      payRatesRef,
      where("siteId", "==", siteId),
      orderBy("employeeName", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToEmployeePayRate);
  } catch (error) {
    console.error("Error fetching employee pay rates by site:", error);
    throw error;
  }
};

// Get employee pay rates by employee ID
export const getEmployeePayRatesByEmployee = async (employeeId: string): Promise<EmployeePayRate[]> => {
  try {
    const payRatesRef = collection(db, EMPLOYEE_PAY_RATES_COLLECTION);
    // Remove orderBy to avoid requiring a composite index - we'll sort client-side instead
    const q = query(
      payRatesRef,
      where("employeeId", "==", employeeId)
    );
    const querySnapshot = await getDocs(q);
    const payRates = querySnapshot.docs.map(docToEmployeePayRate);
    // Sort by siteName client-side
    return payRates.sort((a, b) => a.siteName.localeCompare(b.siteName));
  } catch (error) {
    console.error("Error fetching employee pay rates by employee:", error);
    throw error;
  }
};

// Get employee pay rate by ID
export const getEmployeePayRateById = async (id: string): Promise<EmployeePayRate | null> => {
  try {
    const payRateRef = doc(db, EMPLOYEE_PAY_RATES_COLLECTION, id);
    const payRateSnap = await getDoc(payRateRef);
    if (payRateSnap.exists()) {
      return docToEmployeePayRate(payRateSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee pay rate:", error);
    throw error;
  }
};

// Add new employee pay rate
export const addEmployeePayRate = async (
  payRate: Omit<EmployeePayRate, "id">
): Promise<string> => {
  try {
    const payRateData = employeePayRateToDoc(payRate);
    const docRef = await addDoc(collection(db, EMPLOYEE_PAY_RATES_COLLECTION), payRateData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding employee pay rate:", error);
    throw error;
  }
};

// Update employee pay rate
export const updateEmployeePayRate = async (
  id: string,
  updates: Partial<Omit<EmployeePayRate, "id">>
): Promise<void> => {
  try {
    const payRateRef = doc(db, EMPLOYEE_PAY_RATES_COLLECTION, id);
    
    // Remove undefined values and convert to Firestore-compatible format
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    
    if (updates.hourlyRate !== undefined) {
      updateData.hourlyRate = updates.hourlyRate;
    }
    if (updates.travelAllowance !== undefined) {
      updateData.travelAllowance = updates.travelAllowance || null;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes || null;
    }
    if (updates.siteId !== undefined) {
      updateData.siteId = updates.siteId;
    }
    if (updates.siteName !== undefined) {
      updateData.siteName = updates.siteName;
    }
    if (updates.employeeId !== undefined) {
      updateData.employeeId = updates.employeeId;
    }
    if (updates.employeeName !== undefined) {
      updateData.employeeName = updates.employeeName;
    }
    
    await updateDoc(payRateRef, updateData);
  } catch (error) {
    console.error("Error updating employee pay rate:", error);
    throw error;
  }
};

// Delete employee pay rate
export const deleteEmployeePayRate = async (id: string): Promise<void> => {
  try {
    const payRateRef = doc(db, EMPLOYEE_PAY_RATES_COLLECTION, id);
    await deleteDoc(payRateRef);
  } catch (error) {
    console.error("Error deleting employee pay rate:", error);
    throw error;
  }
};

// Check if employee pay rate exists for site and employee
export const getEmployeePayRateBySiteAndEmployee = async (
  siteId: string,
  employeeId: string
): Promise<EmployeePayRate | null> => {
  try {
    const payRatesRef = collection(db, EMPLOYEE_PAY_RATES_COLLECTION);
    const q = query(
      payRatesRef,
      where("siteId", "==", siteId),
      where("employeeId", "==", employeeId)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.docs.length > 0) {
      return docToEmployeePayRate(querySnapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee pay rate by site and employee:", error);
    throw error;
  }
};

