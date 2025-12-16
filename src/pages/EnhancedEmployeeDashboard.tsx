"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  LogIn,
  LogOut,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Clock3,
  Building2,
  FileCheck,
  DollarSign,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { clockIn, clockOut, getWorkRecordsByEmployee, getMonthlySummary } from "@/lib/firebase/workRecords";
import { getAllocationsByEmployee } from "@/lib/firebase/siteEmployeeAllocations";
import { getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";
import { getWorkHoursByEmployee } from "@/lib/firebase/workHours";
import { formatCurrency } from "@/lib/utils";
import { useLiveClock } from "@/hooks/use-live-clock";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { useLeaveRequests } from "@/hooks/use-leave-requests";
import { useWorkRecord } from "@/hooks/use-work-record";
import { WorkRecord } from "@/types/financial";
import { format } from "date-fns";

const EnhancedEmployeeDashboard = () => {
  const { user, userData } = useAuth();
  const clockTime = useLiveClock();
  const { todayRecord, isLoading: isLoadingRecord, isClockedIn } = useWorkRecord(user?.uid || null);
  const { leaveRequests, pendingCount, submitLeaveRequest } = useLeaveRequests(user?.uid || null);
  const sessionTimer = useSessionTimer(todayRecord?.clockInTime);

  const [isClocking, setIsClocking] = useState(false);
  const [assignedSites, setAssignedSites] = useState<any[]>([]);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [hourlyRate, setHourlyRate] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isClockOutDialogOpen, setIsClockOutDialogOpen] = useState(false);
  const [nextShift, setNextShift] = useState<any>(null);
  const [lastClockIn, setLastClockIn] = useState<WorkRecord | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [reminders, setReminders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Annual" as "Annual" | "Sick" | "Casual" | "Unpaid",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Auto-start timer if clocked in
    if (isClockedIn && todayRecord?.clockInTime && !sessionTimer.isRunning) {
      sessionTimer.start();
    } else if (!isClockedIn) {
      sessionTimer.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClockedIn, todayRecord?.clockInTime]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const firebaseAuthUid = user?.uid || "";

      // Load assigned sites
      let allocations: any[] = [];
      let employeeRecordId = firebaseAuthUid;

      if (userData?.email) {
        try {
          const { getEmployeeByEmail } = await import("@/lib/firebase/employees");
          const employee = await getEmployeeByEmail(userData.email);
          if (employee) {
            employeeRecordId = employee.id;
            allocations = await getAllocationsByEmployee(employee.id);
          }
        } catch (error) {
          console.error("Error finding employee by email:", error);
        }
      }

      if (allocations.length === 0) {
        try {
          allocations = await getAllocationsByEmployee(firebaseAuthUid);
        } catch (error) {
          console.error("Error loading allocations:", error);
        }
      }

      setAssignedSites(allocations);
      if (allocations.length > 0 && !selectedSiteId) {
        setSelectedSiteId(allocations[0].siteId);
      }

      // Load monthly summary
      const now = new Date();
      const summary = await getMonthlySummary(firebaseAuthUid, now.getFullYear(), now.getMonth() + 1);
      setMonthlyHours(summary.totalHours);

      // Get hourly rate
      let payRates: any[] = [];
      try {
        payRates = await getEmployeePayRatesByEmployee(employeeRecordId);
      } catch (error) {
        try {
          payRates = await getEmployeePayRatesByEmployee(firebaseAuthUid);
        } catch (err) {
          console.error("Error loading pay rates:", err);
        }
      }

      if (payRates.length > 0) {
        // Use average hourly rate if multiple rates exist, otherwise use the first one
        const avgRate = payRates.reduce((sum, pr) => sum + pr.hourlyRate, 0) / payRates.length;
        setHourlyRate(avgRate);
      } else {
        setHourlyRate(null);
      }

      // Load next scheduled shift (from WorkHours)
      try {
        const workHours = await getWorkHoursByEmployee(employeeRecordId);
        const today = new Date().toISOString().split("T")[0];
        const futureShifts = workHours
          .filter((wh) => wh.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date));
        if (futureShifts.length > 0) {
          setNextShift(futureShifts[0]);
        }
      } catch (error) {
        console.error("Error loading next shift:", error);
      }

      // Load last clock-in record
      try {
        const records = await getWorkRecordsByEmployee(firebaseAuthUid);
        const completedRecords = records.filter((r) => r.clockOutTime);
        if (completedRecords.length > 0) {
          setLastClockIn(completedRecords[0]);
        }
      } catch (error) {
        console.error("Error loading last clock-in:", error);
      }

      // Load pending approvals
      try {
        const records = await getWorkRecordsByEmployee(firebaseAuthUid);
        const pending = records.filter((r) => r.approvalStatus === "pending" && r.clockOutTime);
        setPendingApprovals(pending.length);
      } catch (error) {
        console.error("Error loading pending approvals:", error);
      }

      // Check for reminders (forgot to clock out yesterday)
      try {
        const records = await getWorkRecordsByEmployee(firebaseAuthUid);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const yesterdayRecord = records.find((r) => r.date === yesterdayStr && !r.clockOutTime);
        if (yesterdayRecord) {
          setReminders(["You forgot to clock out yesterday"]);
        }
      } catch (error) {
        console.error("Error checking reminders:", error);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!user?.uid || !userData) {
      toast.error("User information not available");
      return;
    }

    try {
      setIsClocking(true);
      const employeeId = user.uid;
      const employeeName = userData.name || user.email || "Employee";

      let siteId: string | undefined;
      let siteName: string | undefined;
      if (selectedSiteId) {
        const allocation = assignedSites.find((a) => a.siteId === selectedSiteId);
        if (allocation) {
          siteId = allocation.siteId;
          siteName = allocation.siteName;
        }
      }

      await clockIn(employeeId, employeeName, siteId, siteName);
      toast.success("Clocked in successfully!");
      sessionTimer.start();
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error clocking in:", error);
      toast.error(error.message || "Failed to clock in");
    } finally {
      setIsClocking(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord) {
      toast.error("No active clock-in record found");
      return;
    }

    try {
      setIsClocking(true);
      await clockOut(todayRecord.id);
      toast.success("Clocked out successfully!");
      sessionTimer.stop();
      setIsClockOutDialogOpen(false);
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error clocking out:", error);
      toast.error(error.message || "Failed to clock out");
    } finally {
      setIsClocking(false);
    }
  };

  const handleSubmitLeaveRequest = async () => {
    if (!user?.uid || !userData) {
      toast.error("User information not available");
      return;
    }

    if (!leaveForm.startDate || !leaveForm.endDate) {
      toast.error("Please select start and end dates");
      return;
    }

    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    try {
      setIsSubmittingLeave(true);
      await submitLeaveRequest({
        employeeId: user.uid,
        employeeName: userData.name || user.email || "Employee",
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason || undefined,
      });
      toast.success("Leave request submitted successfully!");
      setIsLeaveDialogOpen(false);
      setLeaveForm({
        leaveType: "Annual",
        startDate: "",
        endDate: "",
        reason: "",
      });
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast.error(error.message || "Failed to submit leave request");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const calculateTodayHours = (): number => {
    if (!todayRecord || !todayRecord.clockOutTime) {
      return 0;
    }
    return todayRecord.hoursWorked;
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatTime = (dateString: string): string => {
    return format(new Date(dateString), "h:mm a");
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Real-time Clock Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Employee Dashboard
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Welcome back, {userData?.name || user?.email}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-4xl sm:text-5xl font-mono font-bold text-foreground">
                {clockTime.time}
              </div>
              <div className="text-sm sm:text-base text-muted-foreground mt-1">
                {clockTime.dayOfWeek}, {clockTime.date}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner for Forgot Clock Out */}
      {reminders.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {reminders[0]}
            </p>
          </div>
        </div>
      )}

      {/* Time Tracking Section */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <CardDescription>Clock in and out for your work shifts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingRecord ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <>
              {/* Current Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-card border">
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    {isClockedIn ? (
                      <>
                        <Badge className="bg-green-500 animate-pulse">Clocked In</Badge>
                        {todayRecord?.clockInTime && (
                          <span className="text-sm text-muted-foreground">
                            Since {formatTime(todayRecord.clockInTime)}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline">Clocked Out</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Session Timer */}
              {isClockedIn && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900/50">
                  <p className="text-sm text-muted-foreground mb-1">Session Timer</p>
                  <div className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">
                    {sessionTimer.elapsedTime}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Time worked today</p>
                </div>
              )}

              {/* Site Selection */}
              {assignedSites.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Site</label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    disabled={isClockedIn}
                  >
                    <option value="">Select a site...</option>
                    {assignedSites.map((site) => (
                      <option key={site.siteId} value={site.siteId}>
                        {site.siteName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clock In/Out Buttons */}
              <div className="flex gap-4">
                {!isClockedIn ? (
                  <Button
                    onClick={handleClockIn}
                    disabled={isClocking || (assignedSites.length > 1 && !selectedSiteId)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Clock In
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsClockOutDialogOpen(true)}
                    disabled={isClocking}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Clock Out
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Helper Widgets Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Next Scheduled Shift */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/30 dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-transparent dark:border-indigo-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Next Shift</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/30 group-hover:scale-110 transition-transform">
              <CalendarDays className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : nextShift ? (
              <>
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatDate(nextShift.date)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {nextShift.startTime} - {nextShift.endTime}
                </div>
                <div className="text-xs text-muted-foreground">{nextShift.siteName}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No upcoming shifts</div>
            )}
          </CardContent>
        </Card>

        {/* Last Clock-In Record */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/30 dark:from-cyan-500/20 dark:via-cyan-500/10 dark:to-transparent dark:border-cyan-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Last Clock-In</CardTitle>
            <div className="p-2 rounded-lg bg-cyan-500/20 dark:bg-cyan-500/30 group-hover:scale-110 transition-transform">
              <Clock3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : lastClockIn ? (
              <>
                <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{formatDate(lastClockIn.date)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {lastClockIn.hoursWorked.toFixed(2)} hours
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No records</div>
            )}
          </CardContent>
        </Card>

        {/* Approval Status */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-transparent dark:border-amber-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Approval Status</CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/20 dark:bg-amber-500/30 group-hover:scale-110 transition-transform">
              <FileCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : pendingApprovals > 0 ? (
              <>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {pendingApprovals} Pending
                </div>
                <div className="text-xs text-muted-foreground mt-1">Awaiting approval</div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">All Clear</div>
                <div className="text-xs text-muted-foreground mt-1">No pending approvals</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leave Requests Summary */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent border-pink-500/30 dark:from-pink-500/20 dark:via-pink-500/10 dark:to-transparent dark:border-pink-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Leave Requests</CardTitle>
            <div className="p-2 rounded-lg bg-pink-500/20 dark:bg-pink-500/30 group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {pendingCount > 0 ? (
              <>
                <div className="text-lg font-bold text-pink-600 dark:text-pink-400">
                  {pendingCount} Pending
                </div>
                <div className="text-xs text-muted-foreground mt-1">Awaiting review</div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-muted-foreground">0 Pending</div>
                <div className="text-xs text-muted-foreground mt-1">All processed</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Assigned Site */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Assigned Site</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20 dark:bg-blue-500/30 group-hover:scale-110 transition-transform">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : assignedSites.length > 0 ? (
              <>
                <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                  {assignedSites.length === 1
                    ? assignedSites[0].siteName
                    : `${assignedSites.length} Sites`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {assignedSites.length > 1
                    ? assignedSites.map((s) => s.siteName).join(", ")
                    : "Your work location"}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No site assigned</div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Hours */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent dark:border-purple-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Monthly Hours</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-purple-600 dark:text-purple-400">{monthlyHours.toFixed(1)} hrs</div>
                <div className="text-xs text-muted-foreground">This month</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Hourly Rate */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Hourly Rate</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20 dark:bg-green-500/30 group-hover:scale-110 transition-transform">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoading ? (
              <Skeleton className="h-10 w-40" />
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-green-600 dark:text-green-400">
                  {hourlyRate !== null ? `${formatCurrency(hourlyRate)}/hr` : "Not set"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {hourlyRate !== null ? "Per hour" : "Contact admin to set rate"}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Section */}
      <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/30 dark:from-violet-500/20 dark:via-violet-500/10 dark:to-transparent dark:border-violet-500/50 rounded-3xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-transparent rounded-bl-full"></div>
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                Leave Requests
              </CardTitle>
              <CardDescription>Manage your leave requests</CardDescription>
            </div>
            <Button onClick={() => setIsLeaveDialogOpen(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
              <Plus className="mr-2 h-4 w-4" />
              Request Leave
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card/50 backdrop-blur-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{request.leaveType}</span>
                      <Badge
                        variant={
                          request.status === "approved"
                            ? "default"
                            : request.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(request.startDate)} - {formatDate(request.endDate)}
                    </div>
                    {request.reason && (
                      <div className="text-xs text-muted-foreground mt-1">{request.reason}</div>
                    )}
                  </div>
                  <div className="ml-4">
                    {request.status === "approved" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : request.status === "rejected" ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Request Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a new leave request</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={leaveForm.leaveType}
                onValueChange={(value: any) =>
                  setLeaveForm({ ...leaveForm, leaveType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                min={leaveForm.startDate || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason/Notes (Optional)</Label>
              <Textarea
                id="reason"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder="Enter reason for leave..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLeaveDialogOpen(false)}
              disabled={isSubmittingLeave}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitLeaveRequest} disabled={isSubmittingLeave}>
              {isSubmittingLeave ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clock Out Confirmation Dialog */}
      <AlertDialog open={isClockOutDialogOpen} onOpenChange={setIsClockOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Clock Out</AlertDialogTitle>
            <AlertDialogDescription>
              {todayRecord && (
                <div className="space-y-2 mt-2">
                  <p>You are about to clock out.</p>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Total hours worked today:</p>
                    <p className="text-2xl font-bold mt-1">
                      {sessionTimer.elapsedTime}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clocked in at: {todayRecord.clockInTime ? formatTime(todayRecord.clockInTime) : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClockOut} className="bg-red-600 hover:bg-red-700">
              Clock Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EnhancedEmployeeDashboard;

