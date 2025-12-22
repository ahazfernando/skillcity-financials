"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Filter, RefreshCw, Clock, CheckCircle2, User, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ActivityLog, ActivityType, Task, Employee } from "@/types/financial";
import { getAllActivityLogs, queryActivityLogs } from "@/lib/firebase/activityLogs";
import { getAllTasks } from "@/lib/firebase/tasks";
import { getAllEmployees } from "@/lib/firebase/employees";
import { toast } from "sonner";
import { format } from "date-fns";
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  useEffect(() => {
    loadActivityLogs();
    loadTaskStatus();
  }, [typeFilter, entityFilter]);

  const loadTaskStatus = async () => {
    try {
      setIsLoadingTasks(true);
      const [allTasks, allEmployees] = await Promise.all([
        getAllTasks(),
        getAllEmployees(),
      ]);
      setTasks(allTasks);
      setEmployees(allEmployees);
    } catch (error) {
      console.error("Error loading task status:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

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
    loadTaskStatus();
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

  // Group tasks by employee and status
  const getTaskStatusByEmployee = () => {
    const inProgressTasks = tasks.filter(t => t.status === "in_progress");
    const completedTasks = tasks.filter(t => t.status === "completed");

    // Group in-progress tasks by employee
    const inProgressByEmployee: Record<string, { employee: Employee; tasks: Task[] }> = {};
    inProgressTasks.forEach(task => {
      task.assignedTo?.forEach(assignedId => {
        const employee = employees.find(emp => 
          emp.id === assignedId || emp.email === assignedId || emp.firebaseAuthUid === assignedId
        );
        if (employee) {
          if (!inProgressByEmployee[employee.id]) {
            inProgressByEmployee[employee.id] = { employee, tasks: [] };
          }
          if (!inProgressByEmployee[employee.id].tasks.find(t => t.id === task.id)) {
            inProgressByEmployee[employee.id].tasks.push(task);
          }
        }
      });
    });

    // Group completed tasks by employee
    const completedByEmployee: Record<string, { employee: Employee; tasks: Task[] }> = {};
    completedTasks.forEach(task => {
      task.assignedTo?.forEach(assignedId => {
        const employee = employees.find(emp => 
          emp.id === assignedId || emp.email === assignedId || emp.firebaseAuthUid === assignedId
        );
        if (employee) {
          if (!completedByEmployee[employee.id]) {
            completedByEmployee[employee.id] = { employee, tasks: [] };
          }
          if (!completedByEmployee[employee.id].tasks.find(t => t.id === task.id)) {
            completedByEmployee[employee.id].tasks.push(task);
          }
        }
      });
    });

    return {
      inProgress: Object.values(inProgressByEmployee),
      completed: Object.values(completedByEmployee),
    };
  };

  const taskStatus = getTaskStatusByEmployee();

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

      {/* Employee Task Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* In Progress Tasks Card */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Clock className="h-5 w-5" />
                  Tasks In Progress
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Active tasks currently being worked on
                </p>
              </div>
              <Badge className="bg-blue-500 text-white text-lg px-3 py-1">
                {taskStatus.inProgress.reduce((sum, item) => sum + item.tasks.length, 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : taskStatus.inProgress.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks in progress</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {taskStatus.inProgress.map(({ employee, tasks }) => (
                  <div
                    key={employee.id}
                    className="bg-background/50 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {tasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="bg-background/80 rounded-md p-3 border-l-2 border-blue-500"
                        >
                          <p className="font-medium text-sm mb-1">{task.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {task.startedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Started: {format(new Date(task.startedAt), "MMM dd, yyyy HH:mm")}</span>
                              </div>
                            )}
                            {task.deadline && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                <span>Due: {format(new Date(task.deadline), "MMM dd, yyyy")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {tasks.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{tasks.length - 3} more {tasks.length - 3 === 1 ? "task" : "tasks"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Tasks Card */}
        <Card className="relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Completed Tasks
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Successfully finished tasks
                </p>
              </div>
              <Badge className="bg-green-500 text-white text-lg px-3 py-1">
                {taskStatus.completed.reduce((sum, item) => sum + item.tasks.length, 0)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="relative">
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : taskStatus.completed.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed tasks</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {taskStatus.completed.map(({ employee, tasks }) => (
                  <div
                    key={employee.id}
                    className="bg-background/50 backdrop-blur-sm border border-green-200/50 dark:border-green-800/50 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {tasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className="bg-background/80 rounded-md p-3 border-l-2 border-green-500"
                        >
                          <p className="font-medium text-sm mb-1">{task.title}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {task.completedAt && (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Completed: {format(new Date(task.completedAt), "MMM dd, yyyy HH:mm")}</span>
                              </div>
                            )}
                            {task.startedAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Started: {format(new Date(task.startedAt), "MMM dd, yyyy")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {tasks.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{tasks.length - 3} more {tasks.length - 3 === 1 ? "task" : "tasks"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
























