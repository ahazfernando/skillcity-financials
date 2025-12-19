"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Filter, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActivityLog, ActivityType } from "@/types/financial";
import { getAllActivityLogs, queryActivityLogs } from "@/lib/firebase/activityLogs";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const activityTypeLabels: Record<ActivityType, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  view: "View",
  export: "Export",
  login: "Login",
  logout: "Logout",
  approve: "Approve",
  reject: "Reject",
  payment: "Payment",
};

const entityTypeLabels: Record<string, string> = {
  invoice: "Invoice",
  payroll: "Payroll",
  employee: "Employee",
  client: "Client",
  site: "Site",
  expense: "Expense",
  user: "User",
};

const ActivityLogPage = () => {
  const [searchValue, setSearchValue] = useState("");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    loadActivityLogs();
  }, [typeFilter, entityFilter]);

  const loadActivityLogs = async () => {
    try {
      setIsLoading(true);
      const filters: any = {};
      if (typeFilter !== "all") filters.type = typeFilter;
      if (entityFilter !== "all") filters.entityType = entityFilter;
      
      const logs = Object.keys(filters).length > 0 
        ? await queryActivityLogs(filters)
        : await getAllActivityLogs();
      
      setActivityLogs(logs);
    } catch (error) {
      console.error("Error loading activity logs:", error);
      toast.error("Failed to load activity logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadActivityLogs();
    toast.success("Activity logs refreshed");
  };

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchValue.toLowerCase()) ||
      log.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchValue.toLowerCase()) ||
      (log.entityType && log.entityType.toLowerCase().includes(searchValue.toLowerCase()));
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, typeFilter, entityFilter]);

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  const getActivityTypeColor = (type: ActivityType) => {
    const colors: Record<ActivityType, string> = {
      create: "bg-success",
      update: "bg-blue-500",
      delete: "bg-destructive",
      view: "bg-muted",
      export: "bg-purple-500",
      login: "bg-green-500",
      logout: "bg-gray-500",
      approve: "bg-success",
      reject: "bg-destructive",
      payment: "bg-green-600",
    };
    return colors[type] || "bg-muted";
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity Log</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Track system activities and user actions</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(activityTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {Object.entries(entityTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Timestamp</TableHead>
                  <TableHead className="min-w-[120px]">User</TableHead>
                  <TableHead className="min-w-[100px]">Type</TableHead>
                  <TableHead className="min-w-[150px]">Action</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="min-w-[100px]">Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading activity logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge className={getActivityTypeColor(log.type)}>
                          {activityTypeLabels[log.type] || log.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.description}
                      </TableCell>
                      <TableCell>
                        {log.entityType ? (
                          <Badge variant="outline">
                            {entityTypeLabels[log.entityType] || log.entityType}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length > 0 && totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;























