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
import { Task, Subtask } from "@/types/financial";

const TASKS_COLLECTION = "tasks";

// Convert Firestore document to Task
const docToTask = (doc: any): Task => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title || "",
    description: data.description || "",
    status: (data.status as "new" | "in_progress" | "completed") || "new",
    priority: (data.priority as "low" | "mid" | "high") || "low",
    siteId: data.siteId || undefined,
    siteName: data.siteName || undefined,
    assignedTo: data.assignedTo || [],
    assignedToNames: data.assignedToNames || [],
    deadline: data.deadline || undefined,
    subtasks: data.subtasks || [],
    location: data.location || undefined,
    payRate: data.payRate || undefined,
    totalHours: data.totalHours || undefined,
    completedImages: data.completedImages || [],
    progress: data.progress || 0,
    category: data.category || undefined,
    createdBy: data.createdBy || "",
    createdByName: data.createdByName || "",
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
  };
};

// Convert Task to Firestore document
const taskToDoc = (task: Omit<Task, "id">) => {
  return {
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    siteId: task.siteId || null,
    siteName: task.siteName || null,
    assignedTo: task.assignedTo || [],
    assignedToNames: task.assignedToNames || [],
    deadline: task.deadline || null,
    subtasks: task.subtasks || [],
    location: task.location || null,
    payRate: task.payRate || null,
    totalHours: task.totalHours || null,
    completedImages: task.completedImages || [],
    progress: task.progress || 0,
    category: task.category || null,
    createdBy: task.createdBy,
    createdByName: task.createdByName || null,
    createdAt: task.createdAt ? Timestamp.fromDate(new Date(task.createdAt)) : Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all tasks
export const getAllTasks = async (): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToTask);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    throw error;
  }
};

// Get tasks by status
export const getTasksByStatus = async (status: "new" | "in_progress" | "completed"): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, where("status", "==", status), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToTask);
  } catch (error) {
    console.error("Error fetching tasks by status:", error);
    throw error;
  }
};

// Get tasks assigned to a user
export const getTasksByAssignedUser = async (userId: string): Promise<Task[]> => {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, where("assignedTo", "array-contains", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToTask);
  } catch (error) {
    console.error("Error fetching tasks by assigned user:", error);
    throw error;
  }
};

// Get task by ID
export const getTaskById = async (id: string): Promise<Task | null> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, id);
    const taskSnap = await getDoc(taskRef);
    if (taskSnap.exists()) {
      return docToTask(taskSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching task:", error);
    throw error;
  }
};

// Create a new task
export const createTask = async (task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<string> => {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const taskData = taskToDoc({
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const docRef = await addDoc(tasksRef, taskData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
};

// Update a task
export const updateTask = async (id: string, updates: Partial<Task>): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.siteId !== undefined) updateData.siteId = updates.siteId || null;
    if (updates.siteName !== undefined) updateData.siteName = updates.siteName || null;
    if (updates.assignedTo !== undefined) updateData.assignedTo = updates.assignedTo || [];
    if (updates.assignedToNames !== undefined) updateData.assignedToNames = updates.assignedToNames || [];
    if (updates.deadline !== undefined) updateData.deadline = updates.deadline || null;
    if (updates.subtasks !== undefined) updateData.subtasks = updates.subtasks || [];
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.payRate !== undefined) updateData.payRate = updates.payRate || null;
    if (updates.totalHours !== undefined) updateData.totalHours = updates.totalHours || null;
    if (updates.completedImages !== undefined) updateData.completedImages = updates.completedImages || [];
    if (updates.progress !== undefined) updateData.progress = updates.progress;
    if (updates.category !== undefined) updateData.category = updates.category || null;

    await updateDoc(taskRef, updateData);
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

// Update task status (for drag and drop)
export const updateTaskStatus = async (id: string, status: "new" | "in_progress" | "completed"): Promise<void> => {
  try {
    await updateTask(id, { status });
  } catch (error) {
    console.error("Error updating task status:", error);
    throw error;
  }
};

// Delete a task
export const deleteTask = async (id: string): Promise<void> => {
  try {
    const taskRef = doc(db, TASKS_COLLECTION, id);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};

