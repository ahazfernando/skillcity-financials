"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAllUsers, approveUser, updateUserRole, getUserByEmail } from "@/lib/firebase/users";
import { getAllEmployees } from "@/lib/firebase/employees";
import { updateEmployee } from "@/lib/firebase/employees";
import { UserData, UserRole, authService } from "@/lib/authService";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, XCircle, Shield, User, Briefcase, Mail, Key, LayoutGrid, Table as TableIcon, Search, UserPlus, Calendar, Phone, Filter, ArrowUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Employee } from "@/types/financial";

const UserManagement = () => {
  const { user, userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isCreateAccountDialogOpen, setIsCreateAccountDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [accountForm, setAccountForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"recent" | "alphabetical" | "oldest">("recent");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const [allUsers, allEmployees] = await Promise.all([
        getAllUsers(),
        getAllEmployees(),
      ]);
      setUsers(allUsers);
      // Filter to only show employees (not clients)
      const actualEmployees = allEmployees.filter(
        (emp) => !emp.type || emp.type === "employee"
      );
      setEmployees(actualEmployees);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!user?.uid) return;
    
    try {
      setUpdating(userId);
      await approveUser(userId, user.uid);
      toast.success("User approved successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user");
    } finally {
      setUpdating(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!user?.uid) return;
    
    try {
      setUpdating(userId);
      await updateUserRole(userId, newRole, user.uid);
      toast.success("User role updated successfully");
      await loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update user role");
    } finally {
      setUpdating(null);
    }
  };

  const handleCreateAccount = async () => {
    if (!selectedEmployee) return;

    if (!accountForm.email || !accountForm.password || !accountForm.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (accountForm.password !== accountForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (accountForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsCreatingAccount(true);
      
      // Check if user already exists
      const existingUser = await getUserByEmail(accountForm.email);
      if (existingUser) {
        toast.error("An account with this email already exists");
        return;
      }

      // Create Firebase Auth account
      await authService.createEmployeeAccount(
        accountForm.email,
        accountForm.password,
        selectedEmployee.name,
        selectedEmployee.id
      );

      // Update employee record with email if not already set
      if (!selectedEmployee.email || selectedEmployee.email !== accountForm.email) {
        await updateEmployee(selectedEmployee.id, {
          email: accountForm.email,
        });
      }

      toast.success("Employee account created successfully! They can now log in.");
      setIsCreateAccountDialogOpen(false);
      setAccountForm({ email: "", password: "", confirmPassword: "" });
      setSelectedEmployee(null);
      await loadUsers();
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create employee account");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const openCreateAccountDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setAccountForm({
      email: employee.email || "",
      password: "",
      confirmPassword: "",
    });
    setIsCreateAccountDialogOpen(true);
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />;
      case "manager":
        return <Briefcase className="h-4 w-4" />;
      case "employee":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role?: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "manager":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "employee":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);

  // Check if current user is admin
  const isAdmin = userData?.role === "admin" || userData?.isAdmin;

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage users and their access levels</p>
        </div>
        <Alert>
          <AlertDescription>
            You do not have permission to access this page. Admin access is required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Manage users and their access levels</p>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Approvals
              <Badge variant="secondary">{pendingUsers.length}</Badge>
            </CardTitle>
            <CardDescription>
              New users waiting for approval to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((userItem) => (
                    <TableRow key={userItem.uid}>
                      <TableCell className="font-medium">
                        {userItem.name || "N/A"}
                      </TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {userItem.createdAt
                          ? new Date(userItem.createdAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={userItem.role || "employee"}
                            onValueChange={(value) =>
                              handleRoleChange(userItem.uid, value as UserRole)
                            }
                            disabled={updating === userItem.uid}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(userItem.uid)}
                            disabled={updating === userItem.uid}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {updating === userItem.uid ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Employees Without Accounts */}
      {(() => {
        const employeesWithoutAccounts = employees.filter(emp => {
          const hasAccount = users.some(u => u.email.toLowerCase() === emp.email?.toLowerCase());
          return !hasAccount && emp.type === "employee";
        });

        // Get unique roles for filter dropdown
        const uniqueRoles = Array.from(
          new Set(employeesWithoutAccounts.map(emp => emp.role || "Employee"))
        ).sort();

        // Apply filters
        let filteredEmployees = employeesWithoutAccounts.filter(emp => {
          // Search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (
              emp.name.toLowerCase().includes(query) ||
              emp.role?.toLowerCase().includes(query) ||
              emp.email?.toLowerCase().includes(query)
            );
            if (!matchesSearch) return false;
          }

          // Role filter
          if (roleFilter !== "all") {
            const empRole = emp.role || "Employee";
            if (empRole !== roleFilter) return false;
          }

          return true;
        });

        // Apply sorting
        filteredEmployees = [...filteredEmployees].sort((a, b) => {
          switch (sortOrder) {
            case "alphabetical":
              return a.name.localeCompare(b.name);
            case "recent":
              // Most recent start date first (or no date last)
              if (!a.startDate && !b.startDate) return 0;
              if (!a.startDate) return 1;
              if (!b.startDate) return -1;
              return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
            case "oldest":
              // Oldest start date first (or no date last)
              if (!a.startDate && !b.startDate) return 0;
              if (!a.startDate) return 1;
              if (!b.startDate) return 1;
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            default:
              return 0;
          }
        });

        if (employeesWithoutAccounts.length === 0) return null;

        return (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    Employees Without Accounts
                    <Badge variant="secondary" className="ml-2">
                      {employeesWithoutAccounts.length}
                    </Badge>
                    {(searchQuery || roleFilter !== "all") && (
                      <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600">
                        {filteredEmployees.length} filtered
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Create user accounts for employees to enable login access and system participation
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 sm:flex-initial sm:w-64 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, role, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {uniqueRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "recent" | "alphabetical" | "oldest")}>
                    <SelectTrigger className="w-[180px]">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recently Added</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                      <SelectItem value="oldest">Old to First</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-shrink-0">
                    <ToggleGroup
                      type="single"
                      value={viewMode}
                      onValueChange={(value) => {
                        if (value) setViewMode(value as "table" | "card");
                      }}
                      className="border rounded-md"
                    >
                      <ToggleGroupItem value="card" aria-label="Card view">
                        <LayoutGrid className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="table" aria-label="Table view">
                        <TableIcon className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
              </div>
              {/* Active Filters Summary */}
              {(searchQuery || roleFilter !== "all") && (
                <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchQuery}"
                      <button
                        onClick={() => setSearchQuery("")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Remove search filter"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {roleFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Role: {roleFilter}
                      <button
                        onClick={() => setRoleFilter("all")}
                        className="ml-1 hover:text-destructive"
                        aria-label="Remove role filter"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                    }}
                    className="h-7 text-xs"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || roleFilter !== "all"
                      ? "No employees found matching your filters"
                      : "No employees without accounts"}
                  </p>
                  {(searchQuery || roleFilter !== "all") && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery("");
                        setRoleFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : viewMode === "card" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredEmployees.map((employee) => (
                    <Card key={employee.id} className="hover:shadow-lg transition-shadow border-2 hover:border-blue-500/50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="h-14 w-14 border-2 border-blue-500/20">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-lg">
                              {employee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{employee.name}</h3>
                            <Badge className="mt-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                              {employee.role || "Employee"}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className={employee.email ? "text-foreground" : "text-muted-foreground italic"}>
                              {employee.email || "No email provided"}
                            </span>
                          </div>
                          {employee.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">{employee.phone}</span>
                            </div>
                          )}
                          {employee.startDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-foreground">
                                Started: {new Date(employee.startDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openCreateAccountDialog(employee)}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Create Account
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Employee</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
                                  {employee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold">{employee.name}</div>
                                {employee.startDate && (
                                  <div className="text-xs text-muted-foreground">
                                    Since {new Date(employee.startDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className={employee.email ? "" : "text-muted-foreground italic"}>
                                  {employee.email || "No email"}
                                </span>
                              </div>
                              {employee.phone && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {employee.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                              {employee.role || "Employee"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                              Account Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => openCreateAccountDialog(employee)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Key className="h-4 w-4 mr-1" />
                              Create Account
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* All Users */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Manage user roles and access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((userItem) => (
                    <TableRow key={userItem.uid}>
                      <TableCell className="font-medium">
                        {userItem.name || "N/A"}
                      </TableCell>
                      <TableCell>{userItem.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(userItem.role)}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(userItem.role)}
                            {userItem.role || "employee"}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {userItem.approved ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {userItem.createdAt
                          ? new Date(userItem.createdAt).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!userItem.approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(userItem.uid)}
                              disabled={updating === userItem.uid}
                            >
                              {updating === userItem.uid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          <Select
                            value={userItem.role || "employee"}
                            onValueChange={(value) =>
                              handleRoleChange(userItem.uid, value as UserRole)
                            }
                            disabled={updating === userItem.uid}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <Dialog open={isCreateAccountDialogOpen} onOpenChange={setIsCreateAccountDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Account for {selectedEmployee?.name}</DialogTitle>
            <DialogDescription>
              Set up login credentials for this employee. They can change their password later using the forgot password option.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-email">Email Address</Label>
              <Input
                id="account-email"
                type="email"
                placeholder="employee@example.com"
                value={accountForm.email}
                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-password">Initial Password</Label>
              <Input
                id="account-password"
                type="password"
                placeholder="Enter initial password (min 6 characters)"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Employee can change this later using "Forgot Password" on the login page
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-confirm-password">Confirm Password</Label>
              <Input
                id="account-confirm-password"
                type="password"
                placeholder="Confirm password"
                value={accountForm.confirmPassword}
                onChange={(e) => setAccountForm({ ...accountForm, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateAccountDialogOpen(false);
                setAccountForm({ email: "", password: "", confirmPassword: "" });
                setSelectedEmployee(null);
              }}
              disabled={isCreatingAccount}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={isCreatingAccount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;



















