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
import { Employee } from "@/types/financial";

const EMPLOYEES_COLLECTION = "employees";

// Helper function to safely convert date to ISO string (YYYY-MM-DD)
const safeDateToString = (dateValue: any): string => {
  if (!dateValue) {
    return new Date().toISOString().split("T")[0];
  }
  
  try {
    let date: Date;
    if (dateValue.toDate) {
      // Firestore Timestamp
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === "string") {
      date = new Date(dateValue);
    } else {
      date = new Date(dateValue);
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split("T")[0];
    }
    
    return date.toISOString().split("T")[0];
  } catch (error) {
    console.error("Error converting date:", error);
    return new Date().toISOString().split("T")[0];
  }
};

// Convert Firestore document to Employee
const docToEmployee = (doc: any): Employee => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name || "",
    role: data.role || "",
    email: data.email || "",
    phone: data.phone || "",
    salary: data.salary || 0,
    startDate: safeDateToString(data.startDate),
    status: (data.status as "active" | "inactive") || "active",
    invoiceCollectionFrequency: data.invoiceCollectionFrequency || undefined,
    type: (data.type as "employee" | "client") || "employee", // Default to "employee" for backward compatibility
    isSkillCityEmployee: data.isSkillCityEmployee !== undefined ? data.isSkillCityEmployee : false, // Default to false for backward compatibility
  };
};

// Helper function to safely convert date string to Date object
const safeStringToDate = (dateString: string): Date => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string, using current date:", dateString);
      return new Date();
    }
    return date;
  } catch (error) {
    console.error("Error parsing date string:", error);
    return new Date();
  }
};

// Convert Employee to Firestore document
const employeeToDoc = (employee: Omit<Employee, "id">): any => {
  return {
    name: employee.name,
    role: employee.role,
    email: employee.email,
    phone: employee.phone,
    salary: employee.salary,
    startDate: Timestamp.fromDate(safeStringToDate(employee.startDate)),
    status: employee.status,
    invoiceCollectionFrequency: employee.invoiceCollectionFrequency || null,
    type: employee.type || "employee", // Default to "employee" for backward compatibility
    isSkillCityEmployee: employee.isSkillCityEmployee !== undefined ? employee.isSkillCityEmployee : false, // Default to false for backward compatibility
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
};

// Get all employees
export const getAllEmployees = async (): Promise<Employee[]> => {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(employeesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docToEmployee);
  } catch (error) {
    console.error("Error fetching employees:", error);
    throw error;
  }
};

// Get employee by ID
export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, id);
    const employeeSnap = await getDoc(employeeRef);
    if (employeeSnap.exists()) {
      return docToEmployee(employeeSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee:", error);
    throw error;
  }
};

// Add new employee
export const addEmployee = async (
  employee: Omit<Employee, "id">
): Promise<string> => {
  try {
    const employeeData = employeeToDoc(employee);
    const docRef = await addDoc(collection(db, EMPLOYEES_COLLECTION), employeeData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding employee:", error);
    throw error;
  }
};

// Update employee
export const updateEmployee = async (
  id: string,
  updates: Partial<Omit<Employee, "id">>
): Promise<void> => {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, id);
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    // Convert date string to Timestamp if present
    if (updates.startDate) {
      updateData.startDate = Timestamp.fromDate(safeStringToDate(updates.startDate));
    }

    // Add other fields
    Object.keys(updates).forEach((key) => {
      if (key !== "startDate" && updates[key as keyof typeof updates] !== undefined) {
        updateData[key] = updates[key as keyof typeof updates];
      }
    });

    await updateDoc(employeeRef, updateData);
  } catch (error) {
    console.error("Error updating employee:", error);
    throw error;
  }
};

// Delete employee
export const deleteEmployee = async (id: string): Promise<void> => {
  try {
    const employeeRef = doc(db, EMPLOYEES_COLLECTION, id);
    await deleteDoc(employeeRef);
  } catch (error) {
    console.error("Error deleting employee:", error);
    throw error;
  }
};

// Query employees with filters
export const queryEmployees = async (
  filters?: {
    status?: "active" | "inactive";
    role?: string;
    name?: string;
  }
): Promise<Employee[]> => {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filters?.status) {
      constraints.push(where("status", "==", filters.status));
    }
    if (filters?.role) {
      constraints.push(where("role", ">=", filters.role));
      constraints.push(where("role", "<=", filters.role + "\uf8ff"));
    }

    constraints.push(orderBy("createdAt", "desc"));

    const q = query(employeesRef, ...constraints);
    const querySnapshot = await getDocs(q);
    let employees = querySnapshot.docs.map(docToEmployee);

    // Apply client-side filters for complex queries
    if (filters?.name) {
      employees = employees.filter((emp) =>
        emp.name.toLowerCase().includes(filters.name!.toLowerCase())
      );
    }

    return employees;
  } catch (error) {
    console.error("Error querying employees:", error);
    throw error;
  }
};

// Get employee by email
export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  try {
    const employeesRef = collection(db, EMPLOYEES_COLLECTION);
    const q = query(employeesRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.docs.length > 0) {
      return docToEmployee(querySnapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee by email:", error);
    throw error;
  }
};








