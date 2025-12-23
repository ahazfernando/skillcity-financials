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
import { CleaningTrackerEntry, CleaningTrackerCleaner } from "@/types/financial";

const CLEANING_TRACKER_COLLECTION = "cleaningTracker";

// Convert Firestore document to CleaningTrackerEntry
const docToCleaningTracker = (doc: any): CleaningTrackerEntry => {
  const data = doc.data();
  return {
    id: doc.id,
    workId: data.workId || 0,
    month: data.month || "",
    workDate: data.workDate || "",
    siteName: data.siteName || "",
    cleaners: (data.cleaners || []).map((cleaner: any) => ({
      cleanerName: cleaner.cleanerName || "",
      workedHours: cleaner.workedHours || 0,
      serviceCharge: cleaner.serviceCharge || 0,
      specialNotes: cleaner.specialNotes || undefined,
      photosUploaded: cleaner.photosUploaded || false,
    })) as CleaningTrackerCleaner[],
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString(),
  };
};

// Convert CleaningTrackerEntry to Firestore document
const cleaningTrackerToDoc = (entry: Omit<CleaningTrackerEntry, "id">): any => {
  return {
    workId: entry.workId,
    month: entry.month,
    workDate: entry.workDate,
    siteName: entry.siteName,
    cleaners: entry.cleaners.map((cleaner) => ({
      cleanerName: cleaner.cleanerName,
      workedHours: cleaner.workedHours,
      serviceCharge: cleaner.serviceCharge,
      specialNotes: cleaner.specialNotes || null,
      photosUploaded: cleaner.photosUploaded,
    })),
    createdAt: entry.createdAt ? Timestamp.fromDate(new Date(entry.createdAt)) : Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all cleaning tracker entries
export const getAllCleaningTrackerEntries = async (): Promise<CleaningTrackerEntry[]> => {
  try {
    const entriesRef = collection(db, CLEANING_TRACKER_COLLECTION);
    // Use single orderBy to avoid index requirement, then sort in memory
    const q = query(entriesRef, orderBy("workDate", "desc"));
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(docToCleaningTracker);
    // Sort by workDate desc, then workId desc
    return entries.sort((a, b) => {
      if (a.workDate !== b.workDate) {
        return b.workDate.localeCompare(a.workDate);
      }
      return b.workId - a.workId;
    });
  } catch (error) {
    console.error("Error fetching cleaning tracker entries:", error);
    throw error;
  }
};

// Get cleaning tracker entry by ID
export const getCleaningTrackerEntryById = async (id: string): Promise<CleaningTrackerEntry | null> => {
  try {
    const entryRef = doc(db, CLEANING_TRACKER_COLLECTION, id);
    const entrySnap = await getDoc(entryRef);
    if (entrySnap.exists()) {
      return docToCleaningTracker(entrySnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching cleaning tracker entry:", error);
    throw error;
  }
};

// Get next work ID
export const getNextWorkId = async (): Promise<number> => {
  try {
    const entriesRef = collection(db, CLEANING_TRACKER_COLLECTION);
    const q = query(entriesRef, orderBy("workId", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 1;
    }
    
    const lastEntry = docToCleaningTracker(querySnapshot.docs[0]);
    return lastEntry.workId + 1;
  } catch (error) {
    console.error("Error getting next work ID:", error);
    // Fallback to 1 if error
    return 1;
  }
};

// Add new cleaning tracker entry
export const addCleaningTrackerEntry = async (
  entry: Omit<CleaningTrackerEntry, "id" | "workId">
): Promise<string> => {
  try {
    // Get next work ID
    const workId = await getNextWorkId();
    
    const entryData = cleaningTrackerToDoc({
      ...entry,
      workId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    const docRef = await addDoc(collection(db, CLEANING_TRACKER_COLLECTION), entryData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding cleaning tracker entry:", error);
    throw error;
  }
};

// Update cleaning tracker entry
export const updateCleaningTrackerEntry = async (
  id: string,
  updates: Partial<Omit<CleaningTrackerEntry, "id" | "workId" | "createdAt">>
): Promise<void> => {
  try {
    const entryRef = doc(db, CLEANING_TRACKER_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };
    
    if (updates.month !== undefined) updateData.month = updates.month;
    if (updates.workDate !== undefined) updateData.workDate = updates.workDate;
    if (updates.siteName !== undefined) updateData.siteName = updates.siteName;
    if (updates.cleaners !== undefined) {
      updateData.cleaners = updates.cleaners.map((cleaner) => ({
        cleanerName: cleaner.cleanerName,
        workedHours: cleaner.workedHours,
        serviceCharge: cleaner.serviceCharge,
        specialNotes: cleaner.specialNotes || null,
        photosUploaded: cleaner.photosUploaded,
      }));
    }
    
    await updateDoc(entryRef, updateData);
  } catch (error) {
    console.error("Error updating cleaning tracker entry:", error);
    throw error;
  }
};

// Delete cleaning tracker entry
export const deleteCleaningTrackerEntry = async (id: string): Promise<void> => {
  try {
    const entryRef = doc(db, CLEANING_TRACKER_COLLECTION, id);
    await deleteDoc(entryRef);
  } catch (error) {
    console.error("Error deleting cleaning tracker entry:", error);
    throw error;
  }
};

// Get entries by date range
export const getCleaningTrackerEntriesByDateRange = async (
  startDate: string,
  endDate: string
): Promise<CleaningTrackerEntry[]> => {
  try {
    const entriesRef = collection(db, CLEANING_TRACKER_COLLECTION);
    // Use single orderBy to avoid index requirement, then sort in memory
    const q = query(
      entriesRef,
      where("workDate", ">=", startDate),
      where("workDate", "<=", endDate),
      orderBy("workDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(docToCleaningTracker);
    // Sort by workDate desc, then workId desc
    return entries.sort((a, b) => {
      if (a.workDate !== b.workDate) {
        return b.workDate.localeCompare(a.workDate);
      }
      return b.workId - a.workId;
    });
  } catch (error) {
    console.error("Error fetching cleaning tracker entries by date range:", error);
    throw error;
  }
};

// Get entries by site name
export const getCleaningTrackerEntriesBySite = async (
  siteName: string
): Promise<CleaningTrackerEntry[]> => {
  try {
    const entriesRef = collection(db, CLEANING_TRACKER_COLLECTION);
    // Use single orderBy to avoid index requirement, then sort in memory
    const q = query(
      entriesRef,
      where("siteName", "==", siteName),
      orderBy("workDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(docToCleaningTracker);
    // Sort by workDate desc, then workId desc
    return entries.sort((a, b) => {
      if (a.workDate !== b.workDate) {
        return b.workDate.localeCompare(a.workDate);
      }
      return b.workId - a.workId;
    });
  } catch (error) {
    console.error("Error fetching cleaning tracker entries by site:", error);
    throw error;
  }
};

