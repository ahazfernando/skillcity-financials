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
  limit,
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
    startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt || undefined,
    completedAt: data.completedAt?.toDate?.()?.toISOString() || data.completedAt || undefined,
    clonedAt: data.clonedAt?.toDate?.()?.toISOString() || data.clonedAt || undefined,
    clonedFrom: data.clonedFrom || undefined,
    taskNumber: data.taskNumber || undefined,
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
    startedAt: task.startedAt ? Timestamp.fromDate(new Date(task.startedAt)) : null,
    completedAt: task.completedAt ? Timestamp.fromDate(new Date(task.completedAt)) : null,
    clonedAt: task.clonedAt ? Timestamp.fromDate(new Date(task.clonedAt)) : null,
    clonedFrom: task.clonedFrom || null,
    taskNumber: task.taskNumber || null,
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

// Get next task number
export const getNextTaskNumber = async (): Promise<number> => {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, orderBy("taskNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return 1;
    }
    
    const lastTask = docToTask(querySnapshot.docs[0]);
    return (lastTask.taskNumber || 0) + 1;
  } catch (error) {
    console.error("Error getting next task number:", error);
    // Fallback: try to get max from all tasks
    try {
      const allTasks = await getAllTasks();
      if (allTasks.length === 0) return 1;
      const maxNumber = Math.max(...allTasks.map(t => t.taskNumber || 0));
      return maxNumber + 1;
    } catch {
      return 1;
    }
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
    if (updates.startedAt !== undefined) updateData.startedAt = updates.startedAt ? Timestamp.fromDate(new Date(updates.startedAt)) : null;
    if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt ? Timestamp.fromDate(new Date(updates.completedAt)) : null;

    await updateDoc(taskRef, updateData);
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

// Update task status (for drag and drop)
export const updateTaskStatus = async (id: string, status: "new" | "in_progress" | "completed", oldStatus?: "new" | "in_progress" | "completed"): Promise<void> => {
  try {
    const now = new Date().toISOString();
    const updates: Partial<Task> = { status };

    // Set startedAt when moving to "in_progress" (only if not already set)
    if (status === "in_progress" && oldStatus !== "in_progress") {
      // Get current task to check if startedAt is already set
      const currentTask = await getTaskById(id);
      if (currentTask && !currentTask.startedAt) {
        updates.startedAt = now;
      }
    }

    // Set completedAt when moving to "completed" (only if not already set)
    if (status === "completed" && oldStatus !== "completed") {
      // Get current task to check if completedAt is already set
      const currentTask = await getTaskById(id);
      if (currentTask && !currentTask.completedAt) {
        updates.completedAt = now;
      }
    }

    // Clear timestamps if moving backwards
    if (status === "new" && oldStatus === "in_progress") {
      updates.startedAt = undefined;
    }
    if (status !== "completed" && oldStatus === "completed") {
      updates.completedAt = undefined;
    }

    await updateTask(id, updates);
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


