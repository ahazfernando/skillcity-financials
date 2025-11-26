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
import { Payroll } from "@/types/financial";

const PAYROLL_COLLECTION = "payroll";

// Convert Firestore document to Payroll
const docToPayroll = (doc: any): Payroll => {
  const data = doc.data();
  return {
    id: doc.id,
    month: data.month || "",
    date: data.date || "",
    modeOfCashFlow: data.modeOfCashFlow || "outflow",
    typeOfCashFlow: data.typeOfCashFlow || "cleaner_payroll",
    name: data.name || "",
    siteOfWork: data.siteOfWork || undefined,
    abnRegistered: data.abnRegistered || false,
    gstRegistered: data.gstRegistered || false,
    invoiceNumber: data.invoiceNumber || undefined,
    amountExclGst: data.amountExclGst || 0,
    gstAmount: data.gstAmount || 0,
    totalAmount: data.totalAmount || 0,
    currency: data.currency || "AUD",
    paymentMethod: data.paymentMethod || "bank_transfer",
    paymentDate: data.paymentDate || undefined,
    paymentReceiptNumber: data.paymentReceiptNumber || undefined,
    status: data.status || "pending",
    notes: data.notes || undefined,
    // Legacy fields
    employeeId: data.employeeId || undefined,
    employeeName: data.employeeName || undefined,
    period: data.period || undefined,
    basicSalary: data.basicSalary || undefined,
    allowances: data.allowances || undefined,
    deductions: data.deductions || undefined,
    receiptUrl: data.receiptUrl || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : undefined,
  };
};

// Convert Payroll to Firestore document
const payrollToDoc = (payroll: Omit<Payroll, "id">): any => {
  const doc: any = {
    month: payroll.month,
    date: payroll.date,
    modeOfCashFlow: payroll.modeOfCashFlow,
    typeOfCashFlow: payroll.typeOfCashFlow,
    name: payroll.name,
    abnRegistered: payroll.abnRegistered,
    gstRegistered: payroll.gstRegistered,
    amountExclGst: payroll.amountExclGst,
    gstAmount: payroll.gstAmount,
    totalAmount: payroll.totalAmount,
    currency: payroll.currency || "AUD",
    paymentMethod: payroll.paymentMethod,
    status: payroll.status,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Optional fields
  if (payroll.siteOfWork) doc.siteOfWork = payroll.siteOfWork;
  if (payroll.invoiceNumber) doc.invoiceNumber = payroll.invoiceNumber;
  if (payroll.paymentDate) doc.paymentDate = payroll.paymentDate;
  if (payroll.paymentReceiptNumber) doc.paymentReceiptNumber = payroll.paymentReceiptNumber;
  if (payroll.notes) doc.notes = payroll.notes;
  
  // Legacy fields
  if (payroll.employeeId) doc.employeeId = payroll.employeeId;
  if (payroll.employeeName) doc.employeeName = payroll.employeeName;
  if (payroll.period) doc.period = payroll.period;
  if (payroll.basicSalary !== undefined) doc.basicSalary = payroll.basicSalary;
  if (payroll.allowances !== undefined) doc.allowances = payroll.allowances;
  if (payroll.deductions !== undefined) doc.deductions = payroll.deductions;
  if (payroll.receiptUrl) doc.receiptUrl = payroll.receiptUrl;

  return doc;
};

// Get all payroll records
export const getAllPayrolls = async (): Promise<Payroll[]> => {
  try {
    const payrollRef = collection(db, PAYROLL_COLLECTION);
    const q = query(payrollRef, orderBy("date", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToPayroll);
  } catch (error) {
    console.error("Error fetching payrolls:", error);
    throw error;
  }
};

// Get payroll by ID
export const getPayrollById = async (id: string): Promise<Payroll | null> => {
  try {
    const payrollRef = doc(db, PAYROLL_COLLECTION, id);
    const payrollSnap = await getDoc(payrollRef);
    if (payrollSnap.exists()) {
      return docToPayroll(payrollSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching payroll:", error);
    throw error;
  }
};

// Get payrolls by mode (inflow/outflow)
export const getPayrollsByMode = async (mode: "inflow" | "outflow"): Promise<Payroll[]> => {
  try {
    const payrollRef = collection(db, PAYROLL_COLLECTION);
    const q = query(
      payrollRef,
      where("modeOfCashFlow", "==", mode),
      orderBy("date", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToPayroll);
  } catch (error) {
    console.error("Error fetching payrolls by mode:", error);
    throw error;
  }
};

// Get payrolls by status
export const getPayrollsByStatus = async (status: string): Promise<Payroll[]> => {
  try {
    const payrollRef = collection(db, PAYROLL_COLLECTION);
    const q = query(
      payrollRef,
      where("status", "==", status),
      orderBy("date", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToPayroll);
  } catch (error) {
    console.error("Error fetching payrolls by status:", error);
    throw error;
  }
};

// Add new payroll record
export const addPayroll = async (
  payroll: Omit<Payroll, "id">
): Promise<string> => {
  try {
    const payrollData = payrollToDoc(payroll);
    const docRef = await addDoc(collection(db, PAYROLL_COLLECTION), payrollData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding payroll:", error);
    throw error;
  }
};

// Update payroll record
export const updatePayroll = async (
  id: string,
  updates: Partial<Omit<Payroll, "id">>
): Promise<void> => {
  try {
    const payrollRef = doc(db, PAYROLL_COLLECTION, id);
    
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Add all update fields
    Object.keys(updates).forEach((key) => {
      const value = updates[key as keyof typeof updates];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    await updateDoc(payrollRef, updateData);
  } catch (error) {
    console.error("Error updating payroll:", error);
    throw error;
  }
};

// Delete payroll record
export const deletePayroll = async (id: string): Promise<void> => {
  try {
    const payrollRef = doc(db, PAYROLL_COLLECTION, id);
    await deleteDoc(payrollRef);
  } catch (error) {
    console.error("Error deleting payroll:", error);
    throw error;
  }
};




