"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, LogIn, LogOut, Building2, DollarSign, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  clockIn, 
  clockOut, 
  getTodayWorkRecord, 
  getMonthlySummary,
  getWorkRecordsByEmployee 
} from "@/lib/firebase/workRecords";
import { getAllocationsByEmployee } from "@/lib/firebase/siteEmployeeAllocations";
import { getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeeDashboard = () => {
  const { user, userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [assignedSites, setAssignedSites] = useState<any[]>([]);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [estimatedEarnings, setEstimatedEarnings] = useState(0);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  useEffect(() => {
    if (user?.uid) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const firebaseAuthUid = user?.uid || "";

      // Load today's work record (uses Firebase Auth UID)
      const today = await getTodayWorkRecord(firebaseAuthUid);
      setTodayRecord(today);

      // Load assigned sites - first try to find employee by email
      let allocations: any[] = [];
      let employeeRecordId = firebaseAuthUid; // Fallback to Firebase Auth UID

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

      // If no allocations found, try with Firebase Auth UID as fallback
      if (allocations.length === 0) {
        try {
          allocations = await getAllocationsByEmployee(firebaseAuthUid);
        } catch (error) {
          console.error("Error loading allocations:", error);
        }
      }

      setAssignedSites(allocations);

      // Set selected site to first assigned site if available
      if (allocations.length > 0 && !selectedSiteId) {
        setSelectedSiteId(allocations[0].siteId);
      }

      // Load monthly summary (uses Firebase Auth UID for work records)
      const now = new Date();
      const summary = await getMonthlySummary(firebaseAuthUid, now.getFullYear(), now.getMonth() + 1);
      setMonthlyHours(summary.totalHours);

      // Calculate estimated earnings - try both employee ID and Firebase Auth UID
      let payRates: any[] = [];
      try {
        payRates = await getEmployeePayRatesByEmployee(employeeRecordId);
      } catch (error) {
        // Fallback to Firebase Auth UID
        try {
          payRates = await getEmployeePayRatesByEmployee(firebaseAuthUid);
        } catch (err) {
          console.error("Error loading pay rates:", err);
        }
      }

      if (payRates.length > 0 && summary.totalHours > 0) {
        // Use average hourly rate or first rate
        const avgRate = payRates.reduce((sum, pr) => sum + pr.hourlyRate, 0) / payRates.length;
        setEstimatedEarnings(summary.totalHours * avgRate);
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

      // Get site info if selected
      let siteId: string | undefined;
      let siteName: string | undefined;
      if (selectedSiteId) {
        const allocation = assignedSites.find(a => a.siteId === selectedSiteId);
        if (allocation) {
          siteId = allocation.siteId;
          siteName = allocation.siteName;
        }
      }

      await clockIn(employeeId, employeeName, siteId, siteName);
      toast.success("Clocked in successfully!");
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
      await loadDashboardData();
    } catch (error: any) {
      console.error("Error clocking out:", error);
      toast.error(error.message || "Failed to clock out");
    } finally {
      setIsClocking(false);
    }
  };

  const isClockedIn = todayRecord && !todayRecord.clockOutTime;
  const clockInTime = todayRecord?.clockInTime 
    ? new Date(todayRecord.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Employee Dashboard
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back, {userData?.name || user?.email}
          </p>
        </div>
      </div>

      {/* Clock In/Out Section */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracking
          </CardTitle>
          <CardDescription>Clock in and out for your work shifts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
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
                        <Badge className="bg-green-500">Clocked In</Badge>
                        {clockInTime && (
                          <span className="text-sm text-muted-foreground">
                            Since {clockInTime}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline">Clocked Out</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Site Selection (if multiple sites) */}
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
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Clock In
                  </Button>
                ) : (
                  <Button
                    onClick={handleClockOut}
                    disabled={isClocking}
                    className="flex-1 bg-red-600 hover:bg-red-700"
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {assignedSites.length > 1 ? (
                    <span>{assignedSites.map(s => s.siteName).join(", ")}</span>
                  ) : (
                    <span>Your work location</span>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-1 text-blue-600 dark:text-blue-400">
                  -
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>No site assigned</span>
                </div>
              </>
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
                <div className="text-3xl font-bold mb-1 text-purple-600 dark:text-purple-400">
                  {monthlyHours.toFixed(1)} hrs
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>This month</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Estimated Earnings */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50 rounded-3xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Estimated Earnings</CardTitle>
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
                  {formatCurrency(estimatedEarnings)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>This month</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;




