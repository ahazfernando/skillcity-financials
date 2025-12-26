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
import { Expense } from "@/types/financial";

const EXPENSES_COLLECTION = "expenses";

// Convert Firestore document to Expense
const docToExpense = (doc: any): Expense => {
  const data = doc.data();
  return {
    id: doc.id,
    category: data.category || "other",
    description: data.description || "",
    amount: data.amount || 0,
    date: data.date || "",
    paymentMethod: data.paymentMethod || "bank_transfer",
    vendor: data.vendor || undefined,
    receiptUrl: data.receiptUrl || undefined,
    notes: data.notes || undefined,
    status: data.status || "pending",
    approvedBy: data.approvedBy || undefined,
    approvedAt: data.approvedAt || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : undefined,
  };
};

// Get all expenses
export const getAllExpenses = async (): Promise<Expense[]> => {
  try {
    const expensesRef = collection(db, EXPENSES_COLLECTION);
    const q = query(expensesRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToExpense);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
};

// Get expense by ID
export const getExpenseById = async (id: string): Promise<Expense | null> => {
  try {
    const expenseRef = doc(db, EXPENSES_COLLECTION, id);
    const expenseSnap = await getDoc(expenseRef);
    if (expenseSnap.exists()) {
      return docToExpense(expenseSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching expense:", error);
    throw error;
  }
};

// Add new expense
export const addExpense = async (
  expense: Omit<Expense, "id">
): Promise<string> => {
  try {
    const expenseData = {
      ...expense,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), expenseData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
};

// Update expense
export const updateExpense = async (
  id: string,
  updates: Partial<Omit<Expense, "id">>
): Promise<void> => {
  try {
    const expenseRef = doc(db, EXPENSES_COLLECTION, id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };
    await updateDoc(expenseRef, updateData);
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
};

// Delete expense
export const deleteExpense = async (id: string): Promise<void> => {
  try {
    const expenseRef = doc(db, EXPENSES_COLLECTION, id);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

// Query expenses with filters
export const queryExpenses = async (
  filters?: {
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<Expense[]> => {
  try {
    const expensesRef = collection(db, EXPENSES_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.category) {
      constraints.push(where("category", "==", filters.category));
    }

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }

    constraints.push(orderBy("date", "desc"));

    const q = query(expensesRef, ...constraints);
    const querySnapshot = await getDocs(q);
    let expenses = querySnapshot.docs.map(docToExpense);

    // Apply date filters client-side if provided
    if (filters?.startDate || filters?.endDate) {
      expenses = expenses.filter((expense) => {
        const expenseDate = expense.date;
        if (filters.startDate && expenseDate < filters.startDate) return false;
        if (filters.endDate && expenseDate > filters.endDate) return false;
        return true;
      });
    }

    return expenses;
  } catch (error) {
    console.error("Error querying expenses:", error);
    throw error;
  }
};































