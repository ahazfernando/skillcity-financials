import { useState, useEffect } from "react";
import { LeaveRequest } from "@/types/financial";
import { getLeaveRequestsByEmployee, subscribeToLeaveRequests, createLeaveRequest } from "@/lib/firebase/leaveRequests";

interface UseLeaveRequestsResult {
  leaveRequests: LeaveRequest[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
  submitLeaveRequest: (request: Omit<LeaveRequest, "id" | "status" | "createdAt" | "updatedAt">) => Promise<void>;
}

export const useLeaveRequests = (employeeId: string | null): UseLeaveRequestsResult => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setIsLoading(false);
      setLeaveRequests([]);
      return;
    }

    // Set up real-time listener
    try {
      const unsubscribe = subscribeToLeaveRequests(employeeId, (requests) => {
        setLeaveRequests(requests);
        setIsLoading(false);
        setError(null);
      });

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up leave requests listener:", err);
      setError(err.message || "Failed to load leave requests");
      setIsLoading(false);
      setLeaveRequests([]);
    }
  }, [employeeId]);

  const submitLeaveRequest = async (
    request: Omit<LeaveRequest, "id" | "status" | "createdAt" | "updatedAt">
  ): Promise<void> => {
    try {
      setError(null);
      await createLeaveRequest(request);
    } catch (err: any) {
      setError(err.message || "Failed to submit leave request");
      throw err;
    }
  };

  const pendingCount = leaveRequests.filter((r) => r.status === "pending").length;

  return {
    leaveRequests,
    pendingCount,
    isLoading,
    error,
    submitLeaveRequest,
  };
};

