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
import { Reminder } from "@/types/financial";

const REMINDERS_COLLECTION = "reminders";

// Convert Firestore document to Reminder
const docToReminder = (doc: any): Reminder => {
  const data = doc.data();
  return {
    id: doc.id,
    type: (data.type as "invoice" | "payroll" | "payment") || "payment",
    title: data.title || "",
    description: data.description || "",
    dueDate: data.dueDate ? (data.dueDate.toDate ? data.dueDate.toDate().toISOString().split("T")[0] : data.dueDate) : new Date().toISOString().split("T")[0],
    priority: (data.priority as "high" | "medium" | "low") || "medium",
    status: (data.status as "pending" | "completed") || "pending",
    relatedId: data.relatedId || "",
  };
};

// Convert Reminder to Firestore document
const reminderToDoc = (reminder: Omit<Reminder, "id">): any => {
  return {
    type: reminder.type,
    title: reminder.title,
    description: reminder.description,
    dueDate: Timestamp.fromDate(new Date(reminder.dueDate)),
    priority: reminder.priority,
    status: reminder.status,
    relatedId: reminder.relatedId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all reminders
export const getAllReminders = async (): Promise<Reminder[]> => {
  try {
    const remindersRef = collection(db, REMINDERS_COLLECTION);
    const q = query(remindersRef, orderBy("dueDate", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToReminder);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    throw error;
  }
};

// Get reminder by ID
export const getReminderById = async (id: string): Promise<Reminder | null> => {
  try {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    const reminderSnap = await getDoc(reminderRef);
    if (reminderSnap.exists()) {
      return docToReminder(reminderSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching reminder:", error);
    throw error;
  }
};

// Add new reminder
export const addReminder = async (
  reminder: Omit<Reminder, "id">
): Promise<string> => {
  try {
    const reminderData = reminderToDoc(reminder);
    const docRef = await addDoc(collection(db, REMINDERS_COLLECTION), reminderData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding reminder:", error);
    throw error;
  }
};

// Update reminder
export const updateReminder = async (
  id: string,
  updates: Partial<Omit<Reminder, "id">>
): Promise<void> => {
  try {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Convert date string to Timestamp if present
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
    }

    // Add other fields
    Object.keys(updates).forEach((key) => {
      if (key !== "dueDate" && updates[key as keyof typeof updates] !== undefined) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    });

    await updateDoc(reminderRef, updateData);
  } catch (error) {
    console.error("Error updating reminder:", error);
    throw error;
  }
};

// Delete reminder
export const deleteReminder = async (id: string): Promise<void> => {
  try {
    const reminderRef = doc(db, REMINDERS_COLLECTION, id);
    await deleteDoc(reminderRef);
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw error;
  }
};

// Mark reminder as completed
export const markReminderCompleted = async (id: string): Promise<void> => {
  try {
    await updateReminder(id, { status: "completed" });
  } catch (error) {
    console.error("Error marking reminder as completed:", error);
    throw error;
  }
};

// Query reminders with filters
export const queryReminders = async (
  filters?: {
    status?: "pending" | "completed";
    type?: "invoice" | "payroll" | "payment";
    priority?: "high" | "medium" | "low";
  }
): Promise<Reminder[]> => {
  try {
    const remindersRef = collection(db, REMINDERS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters?.type) {
      constraints.push(where("type", "==", filters.type));
    }
    if (filters?.priority) {
      constraints.push(where("priority", "==", filters.priority));
    }

    constraints.push(orderBy("dueDate", "asc"));

    const q = query(remindersRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToReminder);
  } catch (error) {
    console.error("Error querying reminders:", error);
    throw error;
  }
};









