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
import { Client } from "@/types/financial";

const CLIENTS_COLLECTION = "clients";

// Convert Firestore document to Client
const docToClient = (doc: any): Client => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || "",
    companyName: data.companyName || undefined,
    email: data.email || "",
    phone: data.phone || "",
    address: data.address || undefined,
    contactPerson: data.contactPerson || undefined,
    status: (data.status as "active" | "inactive") || "active",
    notes: data.notes || undefined,
  };
};

// Convert Client to Firestore document
const clientToDoc = (client: Omit<Client, "id">): any => {
  return {
    name: client.name,
    companyName: client.companyName || null,
    email: client.email,
    phone: client.phone,
    address: client.address || null,
    contactPerson: client.contactPerson || null,
    status: client.status,
    notes: client.notes || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all clients
export const getAllClients = async (): Promise<Client[]> => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const q = query(clientsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToClient);
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw error;
  }
};

// Get client by ID
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, id);
    const clientSnap = await getDoc(clientRef);
    if (clientSnap.exists()) {
      return docToClient(clientSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching client:", error);
    throw error;
  }
};

// Add new client
export const addClient = async (
  client: Omit<Client, "id">
): Promise<string> => {
  try {
    const clientData = clientToDoc(client);
    const docRef = await addDoc(collection(db, CLIENTS_COLLECTION), clientData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding client:", error);
    throw error;
  }
};

// Update client
export const updateClient = async (
  id: string,
  updates: Partial<Omit<Client, "id">>
): Promise<void> => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Add other fields
    Object.keys(updates).forEach((key) => {
      if (updates[key as keyof typeof updates] !== undefined) {
        const value = updates[key as keyof typeof updates];
        updateData[key] = value || null;
      }
    });

    await updateDoc(clientRef, updateData);
  } catch (error) {
    console.error("Error updating client:", error);
    throw error;
  }
};

// Delete client
export const deleteClient = async (id: string): Promise<void> => {
  try {
    const clientRef = doc(db, CLIENTS_COLLECTION, id);
    await deleteDoc(clientRef);
  } catch (error) {
    console.error("Error deleting client:", error);
    throw error;
  }
};

// Query clients with filters
export const queryClients = async (
  filters?: {
    status?: "active" | "inactive";
    name?: string;
  }
): Promise<Client[]> => {
  try {
    const clientsRef = collection(db, CLIENTS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(clientsRef, ...constraints);
    const querySnapshot = await getDocs(q);
    let clients = querySnapshot.docs.map(docToClient);

    // Apply client-side filters for complex queries
    if (filters?.name) {
      clients = clients.filter((client) =>
        client.name.toLowerCase().includes(filters.name!.toLowerCase()) ||
        (client.companyName && client.companyName.toLowerCase().includes(filters.name!.toLowerCase()))
      );
    }

    return clients;
  } catch (error) {
    console.error("Error querying clients:", error);
    throw error;
  }
};




