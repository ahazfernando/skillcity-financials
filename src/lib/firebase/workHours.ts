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
} from "firebase/firestore";
import { db } from "./config";
import { WorkHours } from "@/types/financial";

const WORK_HOURS_COLLECTION = "workHours";

// Convert Firestore document to WorkHours
const docToWorkHours = (doc: any): WorkHours => {
  const data = doc.data();
  return {
    id: doc.id,
    employeeId: data.employeeId || "",
    employeeName: data.employeeName || "",
    siteId: data.siteId || "",
    siteName: data.siteName || "",
    date: data.date || "",
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    hoursWorked: data.hoursWorked || 0,
    notes: data.notes || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : undefined,
  };
};

// Convert WorkHours to Firestore document
const workHoursToDoc = (workHours: Omit<WorkHours, "id">): any => {
  return {
    employeeId: workHours.employeeId,
    employeeName: workHours.employeeName,
    siteId: workHours.siteId,
    siteName: workHours.siteName,
    date: workHours.date,
    startTime: workHours.startTime,
    endTime: workHours.endTime,
    hoursWorked: workHours.hoursWorked,
    notes: workHours.notes || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Calculate hours worked from start and end time
export const calculateHoursWorked = (startTime: string, endTime: string): number => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  const hours = diffMinutes / 60;
  
  return Math.round(hours * 100) / 100; // Round to 2 decimal places
};

// Get all work hours
export const getAllWorkHours = async (): Promise<WorkHours[]> => {
  try {
    const workHoursRef = collection(db, WORK_HOURS_COLLECTION);
    const q = query(workHoursRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const workHours = querySnapshot.docs.map(docToWorkHours);
    
    // Sort by date descending, then by createdAt descending for ties
    return workHours.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      const aCreated = a.createdAt || "";
      const bCreated = b.createdAt || "";
      return bCreated.localeCompare(aCreated);
    });
  } catch (error) {
    console.error("Error fetching work hours:", error);
    throw error;
  }
};

// Get work hours by ID
export const getWorkHoursById = async (id: string): Promise<WorkHours | null> => {
  try {
    const workHoursRef = doc(db, WORK_HOURS_COLLECTION, id);
    const workHoursSnap = await getDoc(workHoursRef);
    if (workHoursSnap.exists()) {
      return docToWorkHours(workHoursSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching work hours:", error);
    throw error;
  }
};

// Get work hours by employee ID
export const getWorkHoursByEmployee = async (employeeId: string): Promise<WorkHours[]> => {
  try {
    const workHoursRef = collection(db, WORK_HOURS_COLLECTION);
    const q = query(
      workHoursRef,
      where("employeeId", "==", employeeId),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToWorkHours);
  } catch (error) {
    console.error("Error fetching work hours by employee:", error);
    throw error;
  }
};

// Get work hours by site ID
export const getWorkHoursBySite = async (siteId: string): Promise<WorkHours[]> => {
  try {
    const workHoursRef = collection(db, WORK_HOURS_COLLECTION);
    const q = query(
      workHoursRef,
      where("siteId", "==", siteId),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToWorkHours);
  } catch (error) {
    console.error("Error fetching work hours by site:", error);
    throw error;
  }
};

// Get employees who worked at a site (unique employees)
export const getEmployeesBySite = async (siteId: string): Promise<{ employeeId: string; employeeName: string; lastWorkDate: string }[]> => {
  try {
    const workHours = await getWorkHoursBySite(siteId);
    const employeeMap = new Map<string, { employeeId: string; employeeName: string; lastWorkDate: string }>();
    
    workHours.forEach((wh) => {
      if (!employeeMap.has(wh.employeeId)) {
        employeeMap.set(wh.employeeId, {
          employeeId: wh.employeeId,
          employeeName: wh.employeeName,
          lastWorkDate: wh.date,
        });
      } else {
        const existing = employeeMap.get(wh.employeeId)!;
        if (wh.date > existing.lastWorkDate) {
          existing.lastWorkDate = wh.date;
        }
      }
    });
    
    return Array.from(employeeMap.values());
  } catch (error) {
    console.error("Error fetching employees by site:", error);
    throw error;
  }
};

// Get work hours by date range
export const getWorkHoursByDateRange = async (
  startDate: string,
  endDate: string
): Promise<WorkHours[]> => {
  try {
    const workHoursRef = collection(db, WORK_HOURS_COLLECTION);
    const q = query(
      workHoursRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToWorkHours);
  } catch (error) {
    console.error("Error fetching work hours by date range:", error);
    throw error;
  }
};

// Get work hours for a specific employee on a specific date
export const getWorkHoursByEmployeeAndDate = async (
  employeeId: string,
  date: string
): Promise<WorkHours[]> => {
  try {
    const workHoursRef = collection(db, WORK_HOURS_COLLECTION);
    const q = query(
      workHoursRef,
      where("employeeId", "==", employeeId),
      where("date", "==", date),
      orderBy("startTime", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToWorkHours);
  } catch (error) {
    console.error("Error fetching work hours by employee and date:", error);
    throw error;
  }
};

// Add new work hours
export const addWorkHours = async (
  workHours: Omit<WorkHours, "id">
): Promise<string> => {
  try {
    // Calculate hours worked
    const hoursWorked = calculateHoursWorked(workHours.startTime, workHours.endTime);
    
    const workHoursData = workHoursToDoc({
      ...workHours,
      hoursWorked,
    });
    
    const docRef = await addDoc(collection(db, WORK_HOURS_COLLECTION), workHoursData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding work hours:", error);
    throw error;
  }
};

// Update work hours
export const updateWorkHours = async (
  id: string,
  updates: Partial<Omit<WorkHours, "id">>
): Promise<void> => {
  try {
    const workHoursRef = doc(db, WORK_HOURS_COLLECTION, id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Recalculate hours if start or end time changed
    if (updates.startTime || updates.endTime) {
      const existing = await getWorkHoursById(id);
      if (existing) {
        const startTime = updates.startTime || existing.startTime;
        const endTime = updates.endTime || existing.endTime;
        updateData.hoursWorked = calculateHoursWorked(startTime, endTime);
      }
    }

    await updateDoc(workHoursRef, updateData);
  } catch (error) {
    console.error("Error updating work hours:", error);
    throw error;
  }
};

// Delete work hours
export const deleteWorkHours = async (id: string): Promise<void> => {
  try {
    const workHoursRef = doc(db, WORK_HOURS_COLLECTION, id);
    await deleteDoc(workHoursRef);
  } catch (error) {
    console.error("Error deleting work hours:", error);
    throw error;
  }
};

// Query work hours with filters
export const queryWorkHours = async (
  filters?: {
    employeeId?: string;
    siteId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<WorkHours[]> => {
  try {
    const workHoursRef = collection(db, WORK_HOURS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.employeeId) {
      constraints.push(where("employeeId", "==", filters.employeeId));
    }
    if (filters?.siteId) {
      constraints.push(where("siteId", "==", filters.siteId));
    }
    if (filters?.date) {
      constraints.push(where("date", "==", filters.date));
    }
    if (filters?.startDate && filters?.endDate) {
      constraints.push(where("date", ">=", filters.startDate));
      constraints.push(where("date", "<=", filters.endDate));
    }

    constraints.push(orderBy("date", "desc"));

    const q = query(workHoursRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToWorkHours);
  } catch (error) {
    console.error("Error querying work hours:", error);
    throw error;
  }
};

