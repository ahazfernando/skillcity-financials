import { useState, useEffect } from "react";
import { WorkRecord } from "@/types/financial";
import { getTodayWorkRecord } from "@/lib/firebase/workRecords";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const WORK_RECORDS_COLLECTION = "workRecords";

interface UseWorkRecordResult {
  todayRecord: WorkRecord | null;
  isLoading: boolean;
  isClockedIn: boolean;
}

export const useWorkRecord = (employeeId: string | null): UseWorkRecordResult => {
  const [todayRecord, setTodayRecord] = useState<WorkRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) {
      setIsLoading(false);
      return;
    }

    // Set up real-time listener for today's work record
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const recordsRef = collection(db, WORK_RECORDS_COLLECTION);
    const q = query(
      recordsRef,
      where("employeeId", "==", employeeId)
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const records = querySnapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            employeeId: data.employeeId || "",
            employeeName: data.employeeName || "",
            siteId: data.siteId || undefined,
            siteName: data.siteName || undefined,
            date: data.date || "",
            clockInTime: data.clockInTime || "",
            clockOutTime: data.clockOutTime || undefined,
            hoursWorked: data.hoursWorked || 0,
            isWeekend: data.isWeekend || false,
            approvalStatus: (data.approvalStatus as "pending" | "approved" | "rejected") || "pending",
            approvedBy: data.approvedBy || undefined,
            approvedAt: data.approvedAt ? (data.approvedAt.toDate ? data.approvedAt.toDate().toISOString() : data.approvedAt) : undefined,
            notes: data.notes || undefined,
            createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : "",
            updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : "",
          } as WorkRecord;
        })
        .filter((r) => r.date === today)
        .sort((a, b) => b.clockInTime.localeCompare(a.clockInTime));

      setTodayRecord(records.length > 0 ? records[0] : null);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [employeeId]);

  const isClockedIn = todayRecord !== null && !todayRecord.clockOutTime;

  return {
    todayRecord,
    isLoading,
    isClockedIn,
  };
};
















