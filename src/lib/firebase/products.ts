import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./config";
import { Product, Repair } from "@/types/financial";

const PRODUCTS_COLLECTION = "products";

// Helper function to convert Firestore document to Product
const docToProduct = (doc: any): Product => {
  const data = doc.data();
  return {
    id: doc.id,
    equipmentCode: data.equipmentCode || "",
    name: data.name || "",
    category: data.category || "",
    quantity: data.quantity || 0,
    description: data.description || "",
    imageUrl: data.imageUrl || "",
    repairs: data.repairs?.map((repair: any) => ({
      id: repair.id,
      location: repair.location || "",
      repairBusiness: repair.repairBusiness || "",
      cause: repair.cause || "",
      repairPersonName: repair.repairPersonName || "",
      repairPersonContact: repair.repairPersonContact || "",
      cost: repair.cost,
      assignees: repair.assignees || [],
      repairStartDate: repair.repairStartDate?.toDate() || new Date(),
      repairEndDate: repair.repairEndDate?.toDate(),
      status: repair.status,
      createdAt: repair.createdAt?.toDate(),
    })) || [],
    siteIds: data.siteIds || [],
    employeeIds: data.employeeIds || [],
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

// Helper function to convert Product to Firestore document
const productToDoc = (product: Omit<Product, "id" | "createdAt" | "updatedAt">): any => {
  return {
    equipmentCode: product.equipmentCode,
    name: product.name,
    category: product.category,
    quantity: product.quantity,
    description: product.description || "",
    imageUrl: product.imageUrl || "",
    repairs: product.repairs?.map((repair) => ({
      id: repair.id || Date.now().toString(),
      location: repair.location,
      repairBusiness: repair.repairBusiness,
      cause: repair.cause,
      repairPersonName: repair.repairPersonName,
      repairPersonContact: repair.repairPersonContact,
      cost: repair.cost,
      assignees: repair.assignees || [],
      repairStartDate: repair.repairStartDate instanceof Date
        ? Timestamp.fromDate(repair.repairStartDate)
        : Timestamp.now(),
      repairEndDate: repair.repairEndDate instanceof Date
        ? Timestamp.fromDate(repair.repairEndDate)
        : null,
      status: repair.status || "Not in Repair",
      createdAt: repair.createdAt instanceof Date
        ? Timestamp.fromDate(repair.createdAt)
        : Timestamp.now(),
    })) || [],
    siteIds: product.siteIds || [],
    employeeIds: product.employeeIds || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all products
export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(productsRef, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToProduct);
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

// Get product by ID
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    const productSnap = await getDoc(productRef);
    if (productSnap.exists()) {
      return docToProduct(productSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
};

// Add new product
export const addProduct = async (
  product: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const productData = productToDoc(product);
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

// Update product
export const updateProduct = async (
  id: string,
  updates: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Convert dates to Timestamps if present
    if (updates.repairs) {
      updateData.repairs = updates.repairs.map((repair) => ({
        id: repair.id || Date.now().toString(),
        location: repair.location,
        repairBusiness: repair.repairBusiness,
        cause: repair.cause,
        repairPersonName: repair.repairPersonName,
        repairPersonContact: repair.repairPersonContact,
        cost: repair.cost,
        assignees: repair.assignees || [],
        repairStartDate: repair.repairStartDate instanceof Date
          ? Timestamp.fromDate(repair.repairStartDate)
          : Timestamp.now(),
        repairEndDate: repair.repairEndDate instanceof Date
          ? Timestamp.fromDate(repair.repairEndDate)
          : null,
        status: repair.status || "Not in Repair",
        createdAt: repair.createdAt instanceof Date
          ? Timestamp.fromDate(repair.createdAt)
          : Timestamp.now(),
      }));
    }

    // Add other fields
    Object.keys(updates).forEach((key) => {
      if (key !== "repairs" && updates[key as keyof typeof updates] !== undefined) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    });

    await updateDoc(productRef, updateData);
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(productRef);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Add repair to product (nested array update)
export const addRepair = async (
  productId: string,
  repair: Omit<Repair, "id" | "createdAt">
): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    const data = productSnap.data();
    const existingRepairs = data.repairs || [];

    const newRepair = {
      id: Date.now().toString(),
      location: repair.location,
      repairBusiness: repair.repairBusiness,
      cause: repair.cause,
      repairPersonName: repair.repairPersonName,
      repairPersonContact: repair.repairPersonContact,
      cost: repair.cost,
      assignees: repair.assignees || [],
      repairStartDate: repair.repairStartDate instanceof Date
        ? Timestamp.fromDate(repair.repairStartDate)
        : Timestamp.now(),
      repairEndDate: repair.repairEndDate instanceof Date
        ? Timestamp.fromDate(repair.repairEndDate)
        : null,
      status: repair.status || "Not in Repair",
      createdAt: Timestamp.now(),
    };

    await updateDoc(productRef, {
      repairs: [...existingRepairs, newRepair],
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error adding repair:", error);
    throw error;
  }
};

// Update repair in product
export const updateRepair = async (
  productId: string,
  repairId: string,
  updates: Partial<Omit<Repair, "id" | "createdAt">>
): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    const data = productSnap.data();
    const existingRepairs = data.repairs || [];

    const updatedRepairs = existingRepairs.map((repair: any) => {
      if (repair.id === repairId) {
        return {
          ...repair,
          ...updates,
          repairStartDate: updates.repairStartDate instanceof Date
            ? Timestamp.fromDate(updates.repairStartDate)
            : updates.repairStartDate !== undefined
              ? updates.repairStartDate
              : repair.repairStartDate,
          repairEndDate: updates.repairEndDate instanceof Date
            ? Timestamp.fromDate(updates.repairEndDate)
            : updates.repairEndDate !== undefined
              ? updates.repairEndDate
              : repair.repairEndDate,
        };
      }
      return repair;
    });

    await updateDoc(productRef, {
      repairs: updatedRepairs,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating repair:", error);
    throw error;
  }
};

// Delete repair from product
export const deleteRepair = async (productId: string, repairId: string): Promise<void> => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      throw new Error("Product not found");
    }

    const data = productSnap.data();
    const existingRepairs = data.repairs || [];
    const updatedRepairs = existingRepairs.filter((repair: any) => repair.id !== repairId);

    await updateDoc(productRef, {
      repairs: updatedRepairs,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error deleting repair:", error);
    throw error;
  }
};

