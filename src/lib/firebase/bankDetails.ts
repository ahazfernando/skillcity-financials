import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { BankDetails } from "@/types/financial";

const BANK_DETAILS_COLLECTION = "bankDetails";

// Convert Firestore document to BankDetails
const docToBankDetails = (doc: any): BankDetails => {
  const data = doc.data();
  return {
    id: doc.id,
    employeeId: data.employeeId || "",
    bankName: data.bankName || "",
    accountHolderName: data.accountHolderName || "",
    accountNumber: data.accountNumber || "",
    branch: data.branch || "",
    idNumber: data.idNumber || undefined,
    swiftCode: data.swiftCode || undefined,
    createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "",
    updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : "",
  };
};

// Convert BankDetails to Firestore document
const bankDetailsToDoc = (details: Omit<BankDetails, "id">): any => {
  return {
    employeeId: details.employeeId,
    bankName: details.bankName,
    accountHolderName: details.accountHolderName,
    accountNumber: details.accountNumber,
    branch: details.branch,
    idNumber: details.idNumber || null,
    swiftCode: details.swiftCode || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get bank details by employee ID
export const getBankDetailsByEmployee = async (employeeId: string): Promise<BankDetails | null> => {
  try {
    const bankDetailsRef = collection(db, BANK_DETAILS_COLLECTION);
    const q = query(bankDetailsRef, where("employeeId", "==", employeeId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.docs.length > 0) {
      return docToBankDetails(querySnapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.error("Error fetching bank details:", error);
    throw error;
  }
};

// Get bank details by ID
export const getBankDetailsById = async (id: string): Promise<BankDetails | null> => {
  try {
    const detailsRef = doc(db, BANK_DETAILS_COLLECTION, id);
    const detailsSnap = await getDoc(detailsRef);
    if (detailsSnap.exists()) {
      return docToBankDetails(detailsSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching bank details:", error);
    throw error;
  }
};

// Create or update bank details
export const upsertBankDetails = async (
  employeeId: string,
  details: Omit<BankDetails, "id" | "employeeId" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    // Check if bank details already exist
    const existing = await getBankDetailsByEmployee(employeeId);
    
    if (existing) {
      // Update existing
      const updateData: any = {
        bankName: details.bankName,
        accountHolderName: details.accountHolderName,
        accountNumber: details.accountNumber,
        branch: details.branch,
        idNumber: details.idNumber || null,
        swiftCode: details.swiftCode || null,
        updatedAt: Timestamp.now(),
      };
      
      await updateDoc(doc(db, BANK_DETAILS_COLLECTION, existing.id), updateData);
      return existing.id;
    } else {
      // Create new
      const newDetails: Omit<BankDetails, "id"> = {
        employeeId,
        ...details,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const docRef = await addDoc(collection(db, BANK_DETAILS_COLLECTION), bankDetailsToDoc(newDetails));
      return docRef.id;
    }
  } catch (error) {
    console.error("Error upserting bank details:", error);
    throw error;
  }
};

// Delete bank details
export const deleteBankDetails = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, BANK_DETAILS_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting bank details:", error);
    throw error;
  }
};




