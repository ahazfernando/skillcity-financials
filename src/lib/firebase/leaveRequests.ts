import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";
import { LeaveRequest } from "@/types/financial";

const LEAVE_REQUESTS_COLLECTION = "leaveRequests";

// Convert Firestore document to LeaveRequest
const docToLeaveRequest = (doc: any): LeaveRequest => {
  const data = doc.data();
  return {
    id: doc.id,
    employeeId: data.employeeId || "",
    employeeName: data.employeeName || "",
    leaveType: (data.leaveType as "Annual" | "Sick" | "Casual" | "Unpaid") || "Annual",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    reason: data.reason || undefined,
    status: (data.status as "pending" | "approved" | "rejected") || "pending",
    approvedBy: data.approvedBy || undefined,
    approvedAt: data.approvedAt ? (data.approvedAt.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt) : undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "",
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : "",
  };
};

// Convert LeaveRequest to Firestore document
const leaveRequestToDoc = (request: Omit<LeaveRequest, "id">): any => {
  return {
    employeeId: request.employeeId,
    employeeName: request.employeeName,
    leaveType: request.leaveType,
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason || null,
    status: request.status,
    approvedBy: request.approvedBy || null,
    approvedAt: request.approvedAt ? Timestamp.fromDate(new Date(request.approvedAt)) : null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all leave requests for an employee
export const getLeaveRequestsByEmployee = async (employeeId: string): Promise<LeaveRequest[]> => {
  try {
    const requestsRef = collection(db, LEAVE_REQUESTS_COLLECTION);
    const q = query(
      requestsRef,
      where("employeeId", "==", employeeId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToLeaveRequest);
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    throw error;
  }
};

// Subscribe to leave requests for an employee (real-time)
export const subscribeToLeaveRequests = (
  employeeId: string,
  callback: (requests: LeaveRequest[]) => void
): (() => void) => {
  const requestsRef = collection(db, LEAVE_REQUESTS_COLLECTION);
  
  // Use query without orderBy to avoid index requirement, sort client-side
  const q = query(
    requestsRef,
    where("employeeId", "==", employeeId)
  );

  return onSnapshot(
    q,
    (querySnapshot) => {
      let requests = querySnapshot.docs.map(docToLeaveRequest);
      // Client-side sort by createdAt descending
      requests.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Descending
      });
      callback(requests);
    },
    (error) => {
      console.error("Error in leave requests subscription:", error);
      // Return empty array on error so UI doesn't break
      callback([]);
    }
  );
};

// Create a new leave request
export const createLeaveRequest = async (
  request: Omit<LeaveRequest, "id" | "status" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const requestData: Omit<LeaveRequest, "id"> = {
      ...request,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, LEAVE_REQUESTS_COLLECTION), leaveRequestToDoc(requestData));
    return docRef.id;
  } catch (error) {
    console.error("Error creating leave request:", error);
    throw error;
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (id: string): Promise<LeaveRequest | null> => {
  try {
    const requestRef = doc(db, LEAVE_REQUESTS_COLLECTION, id);
    const requestSnap = await getDoc(requestRef);
    if (requestSnap.exists()) {
      return docToLeaveRequest(requestSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching leave request:", error);
    throw error;
  }
};

