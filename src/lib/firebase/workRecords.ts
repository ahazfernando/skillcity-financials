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
  limit,
} from "firebase/firestore";
import { db } from "./config";
import { WorkRecord } from "@/types/financial";

const WORK_RECORDS_COLLECTION = "workRecords";

// Helper function to check if a date is a weekend
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

// Calculate hours worked between two timestamps
const calculateHours = (clockIn: string, clockOut: string): number => {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
};

// Convert Firestore document to WorkRecord
const docToWorkRecord = (doc: any): WorkRecord => {
  const data = doc.data();
  return {
    id: doc.id,
    employeeId: data.employeeId || "",
    employeeName: data.employeeName || "",
    siteId: data.siteId || undefined,
    siteName: data.siteName || undefined,
    date: data.date || "",
    clockInTime: data.clockInTime || "",
    clockOutTime: data.clockOutTime || undefined,
    hoursWorked: data.hoursWorked || 0,
    isWeekend: data.isWeekend || false,
    approvalStatus: (data.approvalStatus as "pending" | "approved" | "rejected") || "pending",
    approvedBy: data.approvedBy || undefined,
    approvedAt: data.approvedAt ? (data.approvedAt.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt) : undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "",
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : "",
  };
};

// Convert WorkRecord to Firestore document
const workRecordToDoc = (record: Omit<WorkRecord, "id">): any => {
  const doc: any = {
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    date: record.date,
    clockInTime: record.clockInTime,
    hoursWorked: record.hoursWorked,
    isWeekend: record.isWeekend,
    approvalStatus: record.approvalStatus,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (record.siteId) doc.siteId = record.siteId;
  if (record.siteName) doc.siteName = record.siteName;
  if (record.clockOutTime) doc.clockOutTime = record.clockOutTime;
  if (record.approvedBy) doc.approvedBy = record.approvedBy;
  if (record.approvedAt) doc.approvedAt = Timestamp.fromDate(new Date(record.approvedAt));
  if (record.notes) doc.notes = record.notes;

  return doc;
};

// Get all work records for an employee
export const getWorkRecordsByEmployee = async (
  employeeId: string,
  startDate?: string,
  endDate?: string
): Promise<WorkRecord[]> => {
  try {
    const recordsRef = collection(db, WORK_RECORDS_COLLECTION);
    
    // Fetch by employeeId only (no orderBy to avoid composite index requirement)
    // Sort and filter client-side
    const q = query(
      recordsRef,
      where("employeeId", "==", employeeId)
    );
    
    const querySnapshot = await getDocs(q);
    let records = querySnapshot.docs.map(docToWorkRecord);
    
    // Sort by date descending (newest first)
    records.sort((a, b) => {
      // First compare by date
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // If dates are equal, sort by clockInTime descending
      return b.clockInTime.localeCompare(a.clockInTime);
    });
    
    // Apply date filters client-side
    if (startDate || endDate) {
      records = records.filter((record) => {
        if (startDate && record.date < startDate) return false;
        if (endDate && record.date > endDate) return false;
        return true;
      });
    }
    
    return records;
  } catch (error) {
    console.error("Error fetching work records:", error);
    throw error;
  }
};

// Get all work records (for admin view)
export const getAllWorkRecords = async (
  startDate?: string,
  endDate?: string
): Promise<WorkRecord[]> => {
  try {
    const recordsRef = collection(db, WORK_RECORDS_COLLECTION);
    const querySnapshot = await getDocs(recordsRef);
    let records = querySnapshot.docs.map(docToWorkRecord);
    
    // Sort by date descending (newest first), then by employee name
    records.sort((a, b) => {
      // First compare by date
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      // If dates are equal, sort by employee name
      return a.employeeName.localeCompare(b.employeeName);
    });
    
    // Apply date filters client-side
    if (startDate || endDate) {
      records = records.filter((record) => {
        if (startDate && record.date < startDate) return false;
        if (endDate && record.date > endDate) return false;
        return true;
      });
    }
    
    return records;
  } catch (error) {
    console.error("Error fetching all work records:", error);
    throw error;
  }
};

// Get work record by ID
export const getWorkRecordById = async (id: string): Promise<WorkRecord | null> => {
  try {
    const recordRef = doc(db, WORK_RECORDS_COLLECTION, id);
    const recordSnap = await getDoc(recordRef);
    if (recordSnap.exists()) {
      return docToWorkRecord(recordSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching work record:", error);
    throw error;
  }
};

// Get today's work record for an employee (if clocked in)
export const getTodayWorkRecord = async (employeeId: string): Promise<WorkRecord | null> => {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const recordsRef = collection(db, WORK_RECORDS_COLLECTION);
    
    // Fetch by employeeId only to avoid composite index requirement
    // Filter and sort client-side
    const q = query(
      recordsRef,
      where("employeeId", "==", employeeId)
    );
    
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs
      .map(docToWorkRecord)
      .filter((r) => r.date === today)
      .sort((a, b) => b.clockInTime.localeCompare(a.clockInTime));
    
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error("Error fetching today's work record:", error);
    return null;
  }
};

// Clock in - create a new work record
export const clockIn = async (
  employeeId: string,
  employeeName: string,
  siteId?: string,
  siteName?: string
): Promise<string> => {
  try {
    // Check if already clocked in today
    const todayRecord = await getTodayWorkRecord(employeeId);
    if (todayRecord && !todayRecord.clockOutTime) {
      throw new Error("You are already clocked in today. Please clock out first.");
    }

    const now = new Date();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const clockInTime = now.toISOString();

    const newRecord: Omit<WorkRecord, "id"> = {
      employeeId,
      employeeName,
      siteId,
      siteName,
      date,
      clockInTime,
      hoursWorked: 0,
      isWeekend: isWeekend(now),
      approvalStatus: "pending",
      createdAt: clockInTime,
      updatedAt: clockInTime,
    };

    const docRef = await addDoc(collection(db, WORK_RECORDS_COLLECTION), workRecordToDoc(newRecord));
    return docRef.id;
  } catch (error: any) {
    console.error("Error clocking in:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Failed to clock in. Please try again.");
  }
};

// Clock out - update existing work record
export const clockOut = async (recordId: string): Promise<void> => {
  try {
    const record = await getWorkRecordById(recordId);
    if (!record) {
      throw new Error("Work record not found.");
    }

    if (record.clockOutTime) {
      throw new Error("You have already clocked out for this record.");
    }

    const now = new Date();
    const clockOutTime = now.toISOString();
    const hoursWorked = calculateHours(record.clockInTime, clockOutTime);

    await updateDoc(doc(db, WORK_RECORDS_COLLECTION, recordId), {
      clockOutTime,
      hoursWorked,
      updatedAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error("Error clocking out:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Failed to clock out. Please try again.");
  }
};

// Update work record (for editing clock times)
export const updateWorkRecord = async (
  id: string,
  updates: Partial<Pick<WorkRecord, "clockInTime" | "clockOutTime" | "notes" | "siteId" | "siteName">>
): Promise<void> => {
  try {
    const record = await getWorkRecordById(id);
    if (!record) {
      throw new Error("Work record not found.");
    }

    // Prevent editing approved records
    if (record.approvalStatus === "approved") {
      throw new Error("Cannot edit approved work records.");
    }

    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (updates.clockInTime !== undefined) {
      updateData.clockInTime = updates.clockInTime;
    }
    if (updates.clockOutTime !== undefined) {
      updateData.clockOutTime = updates.clockOutTime;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes || null;
    }
    if (updates.siteId !== undefined) {
      updateData.siteId = updates.siteId || null;
    }
    if (updates.siteName !== undefined) {
      updateData.siteName = updates.siteName || null;
    }

    // Recalculate hours if clock times changed
    if (updates.clockInTime || updates.clockOutTime) {
      const clockIn = updates.clockInTime || record.clockInTime;
      const clockOut = updates.clockOutTime || record.clockOutTime;
      if (clockOut) {
        updateData.hoursWorked = calculateHours(clockIn, clockOut);
      } else {
        updateData.hoursWorked = 0;
      }
    }

    await updateDoc(doc(db, WORK_RECORDS_COLLECTION, id), updateData);
  } catch (error: any) {
    console.error("Error updating work record:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Failed to update work record. Please try again.");
  }
};

// Create work record manually (for manual entry)
export const createWorkRecord = async (
  employeeId: string,
  employeeName: string,
  date: string,
  clockInTime: string,
  clockOutTime?: string,
  siteId?: string,
  siteName?: string,
  notes?: string
): Promise<string> => {
  try {
    // Check if record already exists for this date
    const todayRecord = await getTodayWorkRecord(employeeId);
    if (todayRecord && todayRecord.date === date && !todayRecord.clockOutTime) {
      throw new Error("A work record already exists for this date. Please edit the existing record.");
    }

    const dateObj = new Date(date);
    const clockIn = new Date(clockInTime);
    let hoursWorked = 0;

    if (clockOutTime) {
      const clockOut = new Date(clockOutTime);
      hoursWorked = calculateHours(clockIn.toISOString(), clockOut.toISOString());
    }

    const newRecord: Omit<WorkRecord, "id"> = {
      employeeId,
      employeeName,
      siteId,
      siteName,
      date,
      clockInTime: clockIn.toISOString(),
      clockOutTime: clockOutTime ? new Date(clockOutTime).toISOString() : undefined,
      hoursWorked,
      isWeekend: isWeekend(dateObj),
      approvalStatus: "pending",
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, WORK_RECORDS_COLLECTION), workRecordToDoc(newRecord));
    return docRef.id;
  } catch (error: any) {
    console.error("Error creating work record:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Failed to create work record. Please try again.");
  }
};

// Delete work record
export const deleteWorkRecord = async (id: string): Promise<void> => {
  try {
    const record = await getWorkRecordById(id);
    if (!record) {
      throw new Error("Work record not found.");
    }

    // Prevent deleting approved records
    if (record.approvalStatus === "approved") {
      throw new Error("Cannot delete approved work records.");
    }

    await deleteDoc(doc(db, WORK_RECORDS_COLLECTION, id));
  } catch (error: any) {
    console.error("Error deleting work record:", error);
    if (error.message) {
      throw error;
    }
    throw new Error("Failed to delete work record. Please try again.");
  }
};

// Get monthly summary for an employee
export const getMonthlySummary = async (
  employeeId: string,
  year: number,
  month: number
): Promise<{ totalHours: number; totalRecords: number }> => {
  try {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
    const records = await getWorkRecordsByEmployee(employeeId, startDate, endDate);
    
    const totalHours = records
      .filter((r) => r.clockOutTime) // Only count completed records
      .reduce((sum, r) => sum + r.hoursWorked, 0);
    
    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalRecords: records.length,
    };
  } catch (error) {
    console.error("Error calculating monthly summary:", error);
    return { totalHours: 0, totalRecords: 0 };
  }
};



