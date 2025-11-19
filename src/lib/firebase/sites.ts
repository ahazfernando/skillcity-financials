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
import { Site } from "@/types/financial";

const SITES_COLLECTION = "sites";

// Convert Firestore document to Site
const docToSite = (doc: any): Site => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || "",
    address: data.address || "",
    clientName: data.clientName || "",
    contactPerson: data.contactPerson || "",
    contactPhone: data.contactPhone || "",
    contractValue: data.contractValue || 0,
    status: (data.status as "active" | "inactive") || "active",
    workingDays: data.workingDays || [],
    invoicingWorkingHours: data.invoicingWorkingHours || undefined,
    hourlyRate: data.hourlyRate || undefined,
    dayRate: data.dayRate || undefined,
    invoicingFrequency: data.invoicingFrequency || undefined,
    specialNote: data.specialNote || undefined,
  };
};

// Convert Site to Firestore document
const siteToDoc = (site: Omit<Site, "id">): any => {
  return {
    name: site.name,
    address: site.address,
    clientName: site.clientName,
    contactPerson: site.contactPerson,
    contactPhone: site.contactPhone,
    contractValue: site.contractValue,
    status: site.status,
    workingDays: site.workingDays || [],
    invoicingWorkingHours: site.invoicingWorkingHours || null,
    hourlyRate: site.hourlyRate || null,
    dayRate: site.dayRate || null,
    invoicingFrequency: site.invoicingFrequency || null,
    specialNote: site.specialNote || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all sites
export const getAllSites = async (): Promise<Site[]> => {
  try {
    const sitesRef = collection(db, SITES_COLLECTION);
    const q = query(sitesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToSite);
  } catch (error) {
    console.error("Error fetching sites:", error);
    throw error;
  }
};

// Get site by ID
export const getSiteById = async (id: string): Promise<Site | null> => {
  try {
    const siteRef = doc(db, SITES_COLLECTION, id);
    const siteSnap = await getDoc(siteRef);
    if (siteSnap.exists()) {
      return docToSite(siteSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching site:", error);
    throw error;
  }
};

// Add new site
export const addSite = async (
  site: Omit<Site, "id">
): Promise<string> => {
  try {
    const siteData = siteToDoc(site);
    const docRef = await addDoc(collection(db, SITES_COLLECTION), siteData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding site:", error);
    throw error;
  }
};

// Update site
export const updateSite = async (
  id: string,
  updates: Partial<Omit<Site, "id">>
): Promise<void> => {
  try {
    const siteRef = doc(db, SITES_COLLECTION, id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(siteRef, updateData);
  } catch (error) {
    console.error("Error updating site:", error);
    throw error;
  }
};

// Delete site
export const deleteSite = async (id: string): Promise<void> => {
  try {
    const siteRef = doc(db, SITES_COLLECTION, id);
    await deleteDoc(siteRef);
  } catch (error) {
    console.error("Error deleting site:", error);
    throw error;
  }
};

// Query sites with filters
export const querySites = async (
  filters?: {
    status?: "active" | "inactive";
    clientName?: string;
    name?: string;
  }
): Promise<Site[]> => {
  try {
    const sitesRef = collection(db, SITES_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters?.clientName) {
      constraints.push(where("clientName", ">=", filters.clientName));
      constraints.push(where("clientName", "<=", filters.clientName + "\uf8ff"));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(sitesRef, ...constraints);
    const querySnapshot = await getDocs(q);
    let sites = querySnapshot.docs.map(docToSite);

    // Apply client-side filters for complex queries
    if (filters?.name) {
      sites = sites.filter((site) =>
        site.name.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }

    return sites;
  } catch (error) {
    console.error("Error querying sites:", error);
    throw error;
  }
};

