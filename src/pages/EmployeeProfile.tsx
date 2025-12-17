"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Download, 
  Grid3x3, 
  List, 
  ArrowUpDown, 
  Filter,
  Clock,
  LogIn,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Briefcase
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getEmployeeByEmail } from "@/lib/firebase/employees";
import { getWorkRecordsByEmployee } from "@/lib/firebase/workRecords";
import { WorkRecord } from "@/types/financial";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = "grid" | "list";
type SortOption = "date-desc" | "date-asc" | "status";
type FilterOption = "all" | "on-time" | "late" | "absent";

const EmployeeProfile = () => {
  const { user, userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Generate years list (current year and past 5 years)
  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    if (user?.uid && userData?.email) {
      loadProfileData();
    }
  }, [user, userData, selectedYear]);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      
      // Get employee data
      if (userData?.email) {
        try {
          const employee = await getEmployeeByEmail(userData.email);
          if (employee) {
            setEmployeeData(employee);
          }
        } catch (error) {
          console.error("Error loading employee data:", error);
        }
      }

      // Get work records for selected year
      const employeeId = user?.uid || "";
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;
      const records = await getWorkRecordsByEmployee(employeeId, startDate, endDate);
      setWorkRecords(records);
    } catch (error) {
      console.error("Error loading profile data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const completedRecords = workRecords.filter(r => r.clockOutTime);
    const totalAttendance = completedRecords.length;

    // Calculate average check-in time
    let totalCheckInMinutes = 0;
    let checkInCount = 0;
    completedRecords.forEach(record => {
      if (record.clockInTime) {
        const date = new Date(record.clockInTime);
        const minutes = date.getHours() * 60 + date.getMinutes();
        totalCheckInMinutes += minutes;
        checkInCount++;
      }
    });
    const avgCheckInMinutes = checkInCount > 0 ? totalCheckInMinutes / checkInCount : 0;
    const avgCheckInHours = Math.floor(avgCheckInMinutes / 60);
    const avgCheckInMins = Math.round(avgCheckInMinutes % 60);
    const avgCheckInTime = checkInCount > 0 
      ? `${String(avgCheckInHours).padStart(2, '0')}:${String(avgCheckInMins).padStart(2, '0')}`
      : "--:--";

    // Calculate average check-out time
    let totalCheckOutMinutes = 0;
    let checkOutCount = 0;
    completedRecords.forEach(record => {
      if (record.clockOutTime) {
        const date = new Date(record.clockOutTime);
        const minutes = date.getHours() * 60 + date.getMinutes();
        totalCheckOutMinutes += minutes;
        checkOutCount++;
      }
    });
    const avgCheckOutMinutes = checkOutCount > 0 ? totalCheckOutMinutes / checkOutCount : 0;
    const avgCheckOutHours = Math.floor(avgCheckOutMinutes / 60);
    const avgCheckOutMins = Math.round(avgCheckOutMinutes % 60);
    const avgCheckOutTime = checkOutCount > 0
      ? `${String(avgCheckOutHours).padStart(2, '0')}:${String(avgCheckOutMins).padStart(2, '0')}`
      : "--:--";

    return {
      totalAttendance,
      avgCheckInTime,
      avgCheckOutTime,
    };
  }, [workRecords]);

  // Determine attendance status (On Time, Late, Absent)
  const getAttendanceStatus = (record: WorkRecord | null): "on-time" | "late" | "absent" => {
    if (!record || !record.clockInTime) {
      return "absent";
    }

    // Consider late if check-in is after 9:00 AM (adjust threshold as needed)
    const clockInDate = new Date(record.clockInTime);
    const hours = clockInDate.getHours();
    const minutes = clockInDate.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const lateThreshold = 9 * 60; // 9:00 AM in minutes

    if (totalMinutes > lateThreshold) {
      return "late";
    }
    return "on-time";
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Get initials for avatar
  const getInitials = (name: string | undefined): string => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Filter and sort records
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = workRecords;

    // Apply filter
    if (filterOption !== "all") {
      filtered = workRecords.filter(record => {
        const status = getAttendanceStatus(record);
        return status === filterOption;
      });
    }

    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "date-desc":
          return b.date.localeCompare(a.date);
        case "date-asc":
          return a.date.localeCompare(b.date);
        case "status":
          const statusA = getAttendanceStatus(a);
          const statusB = getAttendanceStatus(b);
          const statusOrder = { "on-time": 0, "late": 1, "absent": 2 };
          return statusOrder[statusA] - statusOrder[statusB];
        default:
          return 0;
      }
    });

    return sorted;
  }, [workRecords, filterOption, sortOption]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRecords, currentPage]);

  const handleDownload = () => {
    // Create CSV content
    const headers = ["Date", "Status", "Check In Time", "Check Out Time"];
    const rows = filteredAndSortedRecords.map(record => {
      const status = getAttendanceStatus(record);
      const statusText = status === "on-time" ? "On Time" : status === "late" ? "Late" : "Absent";
      return [
        formatDate(record.date),
        statusText,
        record.clockInTime ? formatTime(record.clockInTime) : "-",
        record.clockOutTime ? formatTime(record.clockOutTime) : "-"
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Attendance data downloaded successfully");
  };

  const employeeName = userData?.name || employeeData?.name || user?.email || "Employee";
  const employeeRole = employeeData?.role || userData?.role || "Employee";
  const employeePhone = employeeData?.phone || userData?.phone || "N/A";
  const employeeEmail = user?.email || employeeData?.email || "N/A";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Detail Employee Section */}
      <Card className="border-2 shadow-xl rounded-3xl">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-12 bg-green-500 rounded-full"></div>
              <CardTitle className="text-2xl font-bold">Detail Employee</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={String(year)}>
                      {year === new Date().getFullYear() ? "This Year" : String(year)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Download Info
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="flex items-start gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Employee Info */}
              <div className="flex items-start gap-6 mb-8">
                <Avatar className="h-24 w-24 border-4 border-green-500">
                  <AvatarImage src={employeeData?.photoUrl || userData?.photoURL} />
                  <AvatarFallback className="text-2xl font-bold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {getInitials(employeeName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <h3 className="text-3xl font-bold">{employeeName}</h3>
                  <div className="flex flex-wrap items-start gap-8 md:gap-12">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span>Role</span>
                      </div>
                      <span className="text-foreground font-medium">{employeeRole}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>Phone Number</span>
                      </div>
                      <span className="text-foreground font-medium">{employeePhone}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>Email Address</span>
                      </div>
                      <span className="text-foreground font-medium">{employeeEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 rounded-3xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Attendance</p>
                        <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.totalAttendance}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/20">
                        <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-900/50 rounded-3xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Avg Check In Time</p>
                        <p className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.avgCheckInTime}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/20">
                        <LogIn className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-2 border-purple-200 dark:border-purple-900/50 rounded-3xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Avg Check Out Time</p>
                        <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">{stats.avgCheckOutTime}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-500/20">
                        <LogOut className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border-2 border-orange-200 dark:border-orange-900/50 rounded-3xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Employee Predicate</p>
                        <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">Role Model</p>
                      </div>
                      <div className="p-3 rounded-lg bg-orange-500/20">
                        <User className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Attendance History Section */}
      <Card className="border-2 shadow-xl rounded-3xl">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-12 bg-green-500 rounded-full"></div>
              <CardTitle className="text-2xl font-bold">Attendance History</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-none"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortOption("date-desc")}>
                    Date (Newest First)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("date-asc")}>
                    Date (Oldest First)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("status")}>
                    Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterOption("all")}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterOption("on-time")}>
                    On Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterOption("late")}>
                    Late
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterOption("absent")}>
                    Absent
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className={viewMode === "grid" ? "h-40" : "h-20"} />
              ))}
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No attendance records found for {selectedYear}</p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedRecords.map((record) => {
                    const status = getAttendanceStatus(record);
                    const statusConfig = {
                      "on-time": { label: "On Time", className: "bg-green-500 hover:bg-green-600 text-white" },
                      "late": { label: "Late", className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
                      "absent": { label: "Absent", className: "bg-gray-500 hover:bg-gray-600 text-white" },
                    };
                    const config = statusConfig[status];

                    return (
                      <Card key={record.id} className="border-2 hover:shadow-lg transition-shadow rounded-3xl">
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-muted-foreground">
                                {formatDate(record.date)}
                              </p>
                              <Badge className={config.className}>
                                {config.label}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Check In Time:</span>
                                <span className="font-medium">
                                  {record.clockInTime ? formatTime(record.clockInTime) : "-"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Check Out Time:</span>
                                <span className="font-medium">
                                  {record.clockOutTime ? formatTime(record.clockOutTime) : "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {paginatedRecords.map((record) => {
                    const status = getAttendanceStatus(record);
                    const statusConfig = {
                      "on-time": { label: "On Time", className: "bg-green-500 text-white" },
                      "late": { label: "Late", className: "bg-yellow-500 text-white" },
                      "absent": { label: "Absent", className: "bg-gray-500 text-white" },
                    };
                    const config = statusConfig[status];

                    return (
                      <Card key={record.id} className="border rounded-3xl">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <p className="font-medium min-w-[180px]">{formatDate(record.date)}</p>
                              <Badge className={config.className}>{config.label}</Badge>
                              <div className="flex items-center gap-6 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Check In: </span>
                                  <span className="font-medium">
                                    {record.clockInTime ? formatTime(record.clockInTime) : "-"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Check Out: </span>
                                  <span className="font-medium">
                                    {record.clockOutTime ? formatTime(record.clockOutTime) : "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 10) {
                      pageNum = i + 1;
                    } else if (currentPage <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 4) {
                      pageNum = totalPages - 9 + i;
                    } else {
                      pageNum = currentPage - 5 + i;
                    }

                    if (i === 0 && currentPage > 5 && totalPages > 10) {
                      return (
                        <div key="start" className="flex items-center gap-1">
                          <Button
                            variant={currentPage === 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                          >
                            1
                          </Button>
                          <span className="px-2">...</span>
                        </div>
                      );
                    }
                    if (i === 9 && currentPage < totalPages - 4 && totalPages > 10) {
                      return (
                        <div key="end" className="flex items-center gap-1">
                          <span className="px-2">...</span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                          >
                            {totalPages}
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeProfile;

