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
import { Invoice, PaymentStatus } from "@/types/financial";

const INVOICES_COLLECTION = "invoices";

// Convert Firestore timestamp to string date
const timestampToDateString = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString().split("T")[0];
  }
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString().split("T")[0];
  }
  return timestamp || new Date().toISOString().split("T")[0];
};

// Convert Firestore document to Invoice
const docToInvoice = (doc: any): Invoice => {
  const data = doc.data();
  return {
    id: doc.id,
    invoiceNumber: data.invoiceNumber || "",
    clientName: data.clientName || "",
    name: data.name || undefined,
    siteId: data.siteId || "",
    siteOfWork: data.siteOfWork || undefined,
    amount: data.amount || 0,
    gst: data.gst || 0,
    totalAmount: data.totalAmount || 0,
    issueDate: timestampToDateString(data.issueDate),
    dueDate: timestampToDateString(data.dueDate),
    status: (data.status as PaymentStatus) || "pending",
    paymentDate: data.paymentDate ? timestampToDateString(data.paymentDate) : undefined,
    paymentMethod: data.paymentMethod || undefined,
    paymentReceiptNumber: data.paymentReceiptNumber || undefined,
    receiptUrl: data.receiptUrl || undefined,
    notes: data.notes || undefined,
  };
};

// Convert Invoice to Firestore document
const invoiceToDoc = (invoice: Omit<Invoice, "id">): any => {
  return {
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    name: invoice.name || null,
    siteId: invoice.siteId,
    siteOfWork: invoice.siteOfWork || null,
    amount: invoice.amount,
    gst: invoice.gst,
    totalAmount: invoice.totalAmount,
    issueDate: Timestamp.fromDate(new Date(invoice.issueDate)),
    dueDate: Timestamp.fromDate(new Date(invoice.dueDate)),
    status: invoice.status,
    paymentDate: invoice.paymentDate
      ? Timestamp.fromDate(new Date(invoice.paymentDate))
      : null,
    paymentMethod: invoice.paymentMethod || null,
    paymentReceiptNumber: invoice.paymentReceiptNumber || null,
    receiptUrl: invoice.receiptUrl || null,
    notes: invoice.notes || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all invoices
export const getAllInvoices = async (): Promise<Invoice[]> => {
  try {
    const invoicesRef = collection(db, INVOICES_COLLECTION);
    const q = query(invoicesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToInvoice);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
};

// Get invoice by ID
export const getInvoiceById = async (id: string): Promise<Invoice | null> => {
  try {
    const invoiceRef = doc(db, INVOICES_COLLECTION, id);
    const invoiceSnap = await getDoc(invoiceRef);
    if (invoiceSnap.exists()) {
      return docToInvoice(invoiceSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching invoice:", error);
    throw error;
  }
};

// Add new invoice
export const addInvoice = async (
  invoice: Omit<Invoice, "id">
): Promise<string> => {
  try {
    const invoiceData = invoiceToDoc(invoice);
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), invoiceData);
    
    // Trigger automation to process the new invoice (async, don't wait)
    // This will check status and create payroll if needed
    if (typeof window === "undefined") {
      // Server-side: import and process
      import("@/lib/invoice-payroll-automation")
        .then(({ processSingleInvoice }) => processSingleInvoice(docRef.id))
        .catch((err) => console.error("Error processing new invoice:", err));
    } else {
      // Client-side: call API route
      fetch("/api/process-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: docRef.id }),
      }).catch((err) => console.error("Error processing new invoice:", err));
    }
    
    return docRef.id;
  } catch (error) {
    console.error("Error adding invoice:", error);
    throw error;
  }
};

// Update invoice
export const updateInvoice = async (
  id: string,
  updates: Partial<Omit<Invoice, "id">>
): Promise<void> => {
  try {
    const invoiceRef = doc(db, INVOICES_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Convert date strings to Timestamps if present
    if (updates.issueDate) {
      updateData.issueDate = Timestamp.fromDate(new Date(updates.issueDate));
    }
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
    }
    if (updates.paymentDate) {
      updateData.paymentDate = Timestamp.fromDate(new Date(updates.paymentDate));
    }

    // Add other fields
    Object.keys(updates).forEach((key) => {
      if (
        key !== "issueDate" &&
        key !== "dueDate" &&
        key !== "paymentDate" &&
        updates[key as keyof typeof updates] !== undefined
      ) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    });

    await updateDoc(invoiceRef, updateData);
    
    // Trigger automation to process the updated invoice (async, don't wait)
    // This will check status and create payroll if needed
    if (typeof window === "undefined") {
      // Server-side: import and process
      import("@/lib/invoice-payroll-automation")
        .then(({ processSingleInvoice }) => processSingleInvoice(id))
        .catch((err) => console.error("Error processing updated invoice:", err));
    } else {
      // Client-side: call API route
      fetch("/api/process-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      }).catch((err) => console.error("Error processing updated invoice:", err));
    }
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
};

// Delete invoice
export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    const invoiceRef = doc(db, INVOICES_COLLECTION, id);
    await deleteDoc(invoiceRef);
  } catch (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
};

// Query invoices with filters
export const queryInvoices = async (
  filters?: {
    status?: PaymentStatus;
    clientName?: string;
    invoiceNumber?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<Invoice[]> => {
  try {
    const invoicesRef = collection(db, INVOICES_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters?.clientName) {
      constraints.push(where("clientName", ">=", filters.clientName));
      constraints.push(where("clientName", "<=", filters.clientName + "\uf8ff"));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(invoicesRef, ...constraints);
    const querySnapshot = await getDocs(q);
    let invoices = querySnapshot.docs.map(docToInvoice);

    // Apply client-side filters for complex queries
    if (filters?.invoiceNumber) {
      invoices = invoices.filter((inv) =>
        inv.invoiceNumber.toLowerCase().includes(filters.invoiceNumber!.toLowerCase())
      );
    }

    if (filters?.dateFrom || filters?.dateTo) {
      invoices = invoices.filter((inv) => {
        const issueDate = new Date(inv.issueDate);
        const dueDate = new Date(inv.dueDate);
        const fromDate = filters.dateFrom;
        const toDate = filters.dateTo;

        if (fromDate && toDate) {
          return (
            (issueDate >= fromDate && issueDate <= toDate) ||
            (dueDate >= fromDate && dueDate <= toDate) ||
            (issueDate <= fromDate && dueDate >= toDate)
          );
        } else if (fromDate) {
          return issueDate >= fromDate || dueDate >= fromDate;
        }
        return true;
      });
    }

    return invoices;
  } catch (error) {
    console.error("Error querying invoices:", error);
    throw error;
  }
};


