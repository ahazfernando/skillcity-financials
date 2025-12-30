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
import { EmployeeLocation } from "@/types/financial";

const EMPLOYEE_LOCATIONS_COLLECTION = "employeeLocations";

// Convert Firestore document to EmployeeLocation
const docToEmployeeLocation = (doc: any): EmployeeLocation => {
  const data = doc.data();
  return {
    id: doc.id,
    employeeId: data.employeeId || "",
    employeeName: data.employeeName || "",
    siteId: data.siteId || "",
    siteName: data.siteName || data.locationName || "", // Support legacy locationName field
    address: data.address || undefined,
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    radiusMeters: data.radiusMeters || 50,
    allowWorkFromAnywhere: data.allowWorkFromAnywhere || false,
    status: (data.status as "pending" | "approved" | "rejected") || "pending",
    approvedBy: data.approvedBy || undefined,
    approvedAt: data.approvedAt ? (data.approvedAt.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt) : undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "",
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : "",
  };
};

// Convert EmployeeLocation to Firestore document
const employeeLocationToDoc = (location: Omit<EmployeeLocation, "id">): any => {
  const doc: any = {
    employeeId: location.employeeId,
    employeeName: location.employeeName,
    siteId: location.siteId,
    siteName: location.siteName,
    latitude: location.latitude,
    longitude: location.longitude,
    radiusMeters: location.radiusMeters,
    allowWorkFromAnywhere: location.allowWorkFromAnywhere,
    status: location.status,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (location.address) doc.address = location.address;
  if (location.approvedBy) doc.approvedBy = location.approvedBy;
  if (location.approvedAt) doc.approvedAt = Timestamp.fromDate(new Date(location.approvedAt));
  if (location.notes) doc.notes = location.notes;

  return doc;
};

// Get all employee locations
export const getAllEmployeeLocations = async (): Promise<EmployeeLocation[]> => {
  try {
    const locationsRef = collection(db, EMPLOYEE_LOCATIONS_COLLECTION);
    const q = query(locationsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToEmployeeLocation);
  } catch (error) {
    console.error("Error fetching employee locations:", error);
    throw error;
  }
};

// Get employee locations by employee ID
export const getEmployeeLocationsByEmployee = async (employeeId: string): Promise<EmployeeLocation[]> => {
  try {
    const locationsRef = collection(db, EMPLOYEE_LOCATIONS_COLLECTION);
    const q = query(
      locationsRef,
      where("employeeId", "==", employeeId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToEmployeeLocation);
  } catch (error: any) {
    // If index error, fallback to client-side filtering
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.warn("Index not found, using client-side filtering. Please deploy Firestore indexes.");
      try {
        // Fallback: Get all locations and filter client-side
        const locationsRef = collection(db, EMPLOYEE_LOCATIONS_COLLECTION);
        const q = query(locationsRef, where("employeeId", "==", employeeId));
        const querySnapshot = await getDocs(q);
        const locations = querySnapshot.docs.map(docToEmployeeLocation);
        // Sort by createdAt descending on client side
        return locations.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
      } catch (fallbackError) {
        console.error("Error in fallback query:", fallbackError);
        throw fallbackError;
      }
    }
    console.error("Error fetching employee locations by employee:", error);
    throw error;
  }
};

// Get approved employee locations by employee ID
export const getApprovedEmployeeLocationsByEmployee = async (employeeId: string): Promise<EmployeeLocation[]> => {
  try {
    const locationsRef = collection(db, EMPLOYEE_LOCATIONS_COLLECTION);
    const q = query(
      locationsRef,
      where("employeeId", "==", employeeId),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToEmployeeLocation);
  } catch (error: any) {
    // If composite index error, fallback to client-side filtering
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.warn("Index not found, using client-side filtering. Please deploy Firestore indexes.");
      const allLocations = await getEmployeeLocationsByEmployee(employeeId);
      return allLocations.filter((loc) => loc.status === "approved");
    }
    console.error("Error fetching approved employee locations:", error);
    throw error;
  }
};

// Get employee location by ID
export const getEmployeeLocationById = async (id: string): Promise<EmployeeLocation | null> => {
  try {
    const locationRef = doc(db, EMPLOYEE_LOCATIONS_COLLECTION, id);
    const locationSnap = await getDoc(locationRef);
    if (locationSnap.exists()) {
      return docToEmployeeLocation(locationSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee location:", error);
    throw error;
  }
};

// Add employee location
export const addEmployeeLocation = async (
  location: Omit<EmployeeLocation, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const newLocation: Omit<EmployeeLocation, "id"> = {
      ...location,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await addDoc(
      collection(db, EMPLOYEE_LOCATIONS_COLLECTION),
      employeeLocationToDoc(newLocation)
    );
    return docRef.id;
  } catch (error) {
    console.error("Error adding employee location:", error);
    throw error;
  }
};

// Update employee location
export const updateEmployeeLocation = async (
  id: string,
  updates: Partial<Pick<EmployeeLocation, "siteId" | "siteName" | "address" | "latitude" | "longitude" | "radiusMeters" | "allowWorkFromAnywhere" | "status" | "approvedBy" | "approvedAt" | "notes">>
): Promise<void> => {
  try {
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (updates.siteId !== undefined) updateData.siteId = updates.siteId;
    if (updates.siteName !== undefined) updateData.siteName = updates.siteName;
    if (updates.address !== undefined) updateData.address = updates.address || null;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
    if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
    if (updates.radiusMeters !== undefined) updateData.radiusMeters = updates.radiusMeters;
    if (updates.allowWorkFromAnywhere !== undefined) updateData.allowWorkFromAnywhere = updates.allowWorkFromAnywhere;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.approvedBy !== undefined) updateData.approvedBy = updates.approvedBy || null;
    if (updates.approvedAt !== undefined) {
      updateData.approvedAt = updates.approvedAt ? Timestamp.fromDate(new Date(updates.approvedAt)) : null;
    }
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    await updateDoc(doc(db, EMPLOYEE_LOCATIONS_COLLECTION, id), updateData);
  } catch (error) {
    console.error("Error updating employee location:", error);
    throw error;
  }
};

// Delete employee location
export const deleteEmployeeLocation = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, EMPLOYEE_LOCATIONS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting employee location:", error);
    throw error;
  }
};

// Approve employee location
export const approveEmployeeLocation = async (id: string, approvedBy: string): Promise<void> => {
  try {
    await updateEmployeeLocation(id, {
      status: "approved",
      approvedBy,
      approvedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error approving employee location:", error);
    throw error;
  }
};

// Reject employee location
export const rejectEmployeeLocation = async (id: string, approvedBy: string): Promise<void> => {
  try {
    await updateEmployeeLocation(id, {
      status: "rejected",
      approvedBy,
      approvedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error rejecting employee location:", error);
    throw error;
  }
};
