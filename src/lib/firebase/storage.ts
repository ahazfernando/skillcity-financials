import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./config";

const RECEIPTS_FOLDER = "receipts";

// Upload receipt file to Firebase Storage
export const uploadReceipt = async (
  file: File,
  invoiceId: string
): Promise<string> => {
  try {
    // Create a unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${invoiceId}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `${RECEIPTS_FOLDER}/${fileName}`);

    // Upload file
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading receipt:", error);
    throw error;
  }
};

// Delete receipt file from Firebase Storage
export const deleteReceipt = async (receiptUrl: string): Promise<void> => {
  try {
    // Extract the file path from the URL
    const url = new URL(receiptUrl);
    const path = decodeURIComponent(url.pathname.split("/o/")[1].split("?")[0]);
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting receipt:", error);
    throw error;
  }
};

// Get download URL for a receipt (if you have the path)
export const getReceiptUrl = async (filePath: string): Promise<string> => {
  try {
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error("Error getting receipt URL:", error);
    throw error;
  }
};


