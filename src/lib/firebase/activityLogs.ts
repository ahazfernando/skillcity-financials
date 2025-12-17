import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";
import { ActivityLog } from "@/types/financial";

const ACTIVITY_LOGS_COLLECTION = "activityLogs";

// Convert Firestore document to ActivityLog
const docToActivityLog = (doc: any): ActivityLog => {
  const data = doc.data();
  return {
    id: doc.id,
    type: data.type || "view",
    action: data.action || "",
    description: data.description || "",
    userId: data.userId || "",
    userName: data.userName || "",
    entityType: data.entityType || undefined,
    entityId: data.entityId || undefined,
    metadata: data.metadata || undefined,
    timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toISOString() : data.timestamp) : new Date().toISOString(),
    ipAddress: data.ipAddress || undefined,
  };
};

// Get all activity logs
export const getAllActivityLogs = async (maxResults: number = 1000): Promise<ActivityLog[]> => {
  try {
    const logsRef = collection(db, ACTIVITY_LOGS_COLLECTION);
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(maxResults));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToActivityLog);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    throw error;
  }
};

// Add new activity log
export const addActivityLog = async (
  log: Omit<ActivityLog, "id" | "timestamp">
): Promise<string> => {
  try {
    const logData = {
      ...log,
      timestamp: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), logData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding activity log:", error);
    throw error;
  }
};

// Query activity logs with filters
export const queryActivityLogs = async (
  filters?: {
    userId?: string;
    type?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  },
  maxResults: number = 500
): Promise<ActivityLog[]> => {
  try {
    const logsRef = collection(db, ACTIVITY_LOGS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    if (filters?.type) {
      constraints.push(where("type", "==", filters.type));
    }

    if (filters?.entityType) {
      constraints.push(where("entityType", "==", filters.entityType));
    }

    constraints.push(orderBy("timestamp", "desc"));
    constraints.push(limit(maxResults));

    const q = query(logsRef, ...constraints);
    const querySnapshot = await getDocs(q);
    let logs = querySnapshot.docs.map(docToActivityLog);

    // Apply date filters client-side if provided
    if (filters?.startDate || filters?.endDate) {
      logs = logs.filter((log) => {
        const logDate = new Date(log.timestamp).toISOString().split("T")[0];
        if (filters.startDate && logDate < filters.startDate) return false;
        if (filters.endDate && logDate > filters.endDate) return false;
        return true;
      });
    }

    return logs;
  } catch (error) {
    console.error("Error querying activity logs:", error);
    throw error;
  }
};


















