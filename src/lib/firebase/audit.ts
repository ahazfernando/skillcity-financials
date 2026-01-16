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

const AUDIT_COLLECTION = "siteAudits";

export interface AuditQuestion {
  id: string;
  question: string;
  answer: string;
  required?: boolean;
}

export interface SiteAudit {
  id: string;
  cleanerId: string;
  cleanerName: string;
  cleanerEmail: string;
  siteId?: string;
  siteName?: string;
  date: string; // ISO date string
  questions: AuditQuestion[];
  images: string[]; // Array of image URLs
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Convert Firestore document to SiteAudit
const docToAudit = (doc: any): SiteAudit => {
  const data = doc.data();
  return {
    id: doc.id,
    cleanerId: data.cleanerId || "",
    cleanerName: data.cleanerName || "",
    cleanerEmail: data.cleanerEmail || "",
    siteId: data.siteId || undefined,
    siteName: data.siteName || undefined,
    date: data.date || "",
    questions: data.questions || [],
    images: data.images || [],
    status: data.status || "pending",
    approvedBy: data.approvedBy || undefined,
    approvedByName: data.approvedByName || undefined,
    approvedAt: data.approvedAt || undefined,
    rejectionReason: data.rejectionReason || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt
      ? data.createdAt.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt
      : new Date().toISOString(),
    updatedAt: data.updatedAt
      ? data.updatedAt.toDate
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt
      : new Date().toISOString(),
  };
};

// Create a new audit submission
export const createAuditSubmission = async (
  audit: Omit<SiteAudit, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const auditData: any = {
      cleanerId: audit.cleanerId,
      cleanerName: audit.cleanerName,
      cleanerEmail: audit.cleanerEmail,
      date: audit.date,
      questions: audit.questions,
      images: audit.images,
      status: "pending",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    if (audit.siteId) auditData.siteId = audit.siteId;
    if (audit.siteName) auditData.siteName = audit.siteName;
    if (audit.notes) auditData.notes = audit.notes;

    const docRef = await addDoc(collection(db, AUDIT_COLLECTION), auditData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating audit submission:", error);
    throw error;
  }
};

// Get all audit submissions
export const getAllAuditSubmissions = async (): Promise<SiteAudit[]> => {
  try {
    const auditsRef = collection(db, AUDIT_COLLECTION);
    const q = query(auditsRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const audits = querySnapshot.docs.map(docToAudit);
    // Sort by createdAt as secondary sort (client-side)
    return audits.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } catch (error) {
    console.error("Error fetching audit submissions:", error);
    throw error;
  }
};

// Get audit submissions by cleaner
export const getAuditSubmissionsByCleaner = async (
  cleanerId: string
): Promise<SiteAudit[]> => {
  try {
    const auditsRef = collection(db, AUDIT_COLLECTION);
    const q = query(
      auditsRef,
      where("cleanerId", "==", cleanerId),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    const audits = querySnapshot.docs.map(docToAudit);
    // Sort by createdAt as secondary sort (client-side)
    return audits.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } catch (error) {
    console.error("Error fetching cleaner audit submissions:", error);
    throw error;
  }
};

// Get audit submission by ID
export const getAuditSubmissionById = async (
  id: string
): Promise<SiteAudit | null> => {
  try {
    const auditRef = doc(db, AUDIT_COLLECTION, id);
    const auditSnap = await getDoc(auditRef);
    if (auditSnap.exists()) {
      return docToAudit(auditSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching audit submission:", error);
    throw error;
  }
};

// Get audit submissions by date range
export const getAuditSubmissionsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<SiteAudit[]> => {
  try {
    const auditsRef = collection(db, AUDIT_COLLECTION);
    const q = query(
      auditsRef,
      where("date", ">=", startDate),
      where("date", "<=", endDate),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    const audits = querySnapshot.docs.map(docToAudit);
    // Sort by createdAt as secondary sort (client-side)
    return audits.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } catch (error) {
    console.error("Error fetching audit submissions by date range:", error);
    throw error;
  }
};

// Approve audit submission
export const approveAuditSubmission = async (
  id: string,
  approvedBy: string,
  approvedByName: string,
  notes?: string
): Promise<void> => {
  try {
    const auditRef = doc(db, AUDIT_COLLECTION, id);
    const updateData: any = {
      status: "approved",
      approvedBy,
      approvedByName,
      approvedAt: Timestamp.now().toDate().toISOString(),
      updatedAt: Timestamp.now(),
    };
    if (notes) updateData.notes = notes;
    await updateDoc(auditRef, updateData);
  } catch (error) {
    console.error("Error approving audit submission:", error);
    throw error;
  }
};

// Reject audit submission
export const rejectAuditSubmission = async (
  id: string,
  approvedBy: string,
  approvedByName: string,
  rejectionReason: string
): Promise<void> => {
  try {
    const auditRef = doc(db, AUDIT_COLLECTION, id);
    await updateDoc(auditRef, {
      status: "rejected",
      approvedBy,
      approvedByName,
      rejectionReason,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error rejecting audit submission:", error);
    throw error;
  }
};

// Update audit submission (for cleaners to update pending submissions)
export const updateAuditSubmission = async (
  id: string,
  updates: Partial<Omit<SiteAudit, "id" | "createdAt" | "updatedAt" | "status">>
): Promise<void> => {
  try {
    const auditRef = doc(db, AUDIT_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (updates.questions !== undefined) updateData.questions = updates.questions;
    if (updates.images !== undefined) updateData.images = updates.images;
    if (updates.siteId !== undefined) updateData.siteId = updates.siteId;
    if (updates.siteName !== undefined) updateData.siteName = updates.siteName;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    await updateDoc(auditRef, updateData);
  } catch (error) {
    console.error("Error updating audit submission:", error);
    throw error;
  }
};

// Delete audit submission
export const deleteAuditSubmission = async (id: string): Promise<void> => {
  try {
    const auditRef = doc(db, AUDIT_COLLECTION, id);
    await deleteDoc(auditRef);
  } catch (error) {
    console.error("Error deleting audit submission:", error);
    throw error;
  }
};
