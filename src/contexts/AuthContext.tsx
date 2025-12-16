"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { authService, UserData } from "@/lib/authService";
import { getEmployeeByEmail, addEmployee } from "@/lib/firebase/employees";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    if (user) {
      const data = await authService.getUserData(user.uid);
      setUserData(data);
    } else {
      setUserData(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const data = await authService.getUserData(firebaseUser.uid);
        setUserData(data);
        
        // Auto-create employee record if user doesn't have one
        if (data && data.approved && (data.role === "employee" || !data.role)) {
          try {
            const employeeEmail = data.email;
            if (employeeEmail) {
              const existingEmployee = await getEmployeeByEmail(employeeEmail);
              if (!existingEmployee) {
                // Safely convert createdAt to date string
                let startDate: string;
                if (data.createdAt) {
                  try {
                    const date = data.createdAt instanceof Date 
                      ? data.createdAt 
                      : new Date(data.createdAt);
                    if (!isNaN(date.getTime())) {
                      startDate = date.toISOString().split("T")[0];
                    } else {
                      startDate = new Date().toISOString().split("T")[0];
                    }
                  } catch {
                    startDate = new Date().toISOString().split("T")[0];
                  }
                } else {
                  startDate = new Date().toISOString().split("T")[0];
                }
                
                // Create employee record from user data
                await addEmployee({
                  name: data.name || "Unknown",
                  role: data.role || "Employee",
                  email: employeeEmail,
                  phone: "",
                  salary: 0,
                  startDate,
                  status: "active",
                  type: "employee",
                  isSkillCityEmployee: false,
                });
                console.log("Auto-created employee record for user:", employeeEmail);
              }
            }
          } catch (error) {
            // Silently fail - this is not critical
            console.error("Error auto-creating employee record:", error);
          }
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    userData,
    loading,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During build time, AuthProvider might not be available
    // Return a default context to prevent build errors
    if (typeof window === 'undefined') {
      return {
        user: null,
        userData: null,
        loading: true,
        refreshUserData: async () => {},
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}





