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
import { Category } from "@/types/financial";

const CATEGORIES_COLLECTION = "categories";

// Helper function to convert Firestore document to Category
const docToCategory = (doc: any): Category => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || "",
    description: data.description || "",
    color: data.color || "",
    icon: data.icon || "",
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

// Helper function to convert Category to Firestore document
const categoryToDoc = (category: Omit<Category, "id" | "createdAt" | "updatedAt">): any => {
  return {
    name: category.name,
    description: category.description || "",
    color: category.color || "",
    icon: category.icon || "",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all categories
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, CATEGORIES_COLLECTION);
    const q = query(categoriesRef, orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToCategory);
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

// Get category by ID
export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
    const categorySnap = await getDoc(categoryRef);
    if (categorySnap.exists()) {
      return docToCategory(categorySnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching category:", error);
    throw error;
  }
};

// Add new category
export const addCategory = async (
  category: Omit<Category, "id" | "createdAt" | "updatedAt">
): Promise<string> => {
  try {
    const categoryData = categoryToDoc(category);
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), categoryData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
};

// Update category
export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    await updateDoc(categoryRef, updateData);
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

// Delete category
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    const categoryRef = doc(db, CATEGORIES_COLLECTION, id);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};

