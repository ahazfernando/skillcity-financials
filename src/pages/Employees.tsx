"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Loader2, Trash2, FileText, Building2, MapPin, Clock, Plus, Check, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Employee, Invoice, EmployeePayRate, SiteEmployeeAllocation } from "@/types/financial";
import { getAllEmployees, addEmployee, updateEmployee, deleteEmployee, getEmployeeByEmail } from "@/lib/firebase/employees";
import { getAllUsers } from "@/lib/firebase/users";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { getEmployeePayRatesByEmployee, addEmployeePayRate } from "@/lib/firebase/employeePayRates";
import { getAllAllocations, getAllocationsByEmployee } from "@/lib/firebase/siteEmployeeAllocations";
import { updateUserRoleByEmail } from "@/lib/firebase/users";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Employees = () => {
  const [searchValue, setSearchValue] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [invoiceFrequencyFilter, setInvoiceFrequencyFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [modalMonthRange, setModalMonthRange] = useState<DateRange | undefined>(undefined);
  const [modalInvoiceFrequencyFilter, setModalInvoiceFrequencyFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const [employeePayRates, setEmployeePayRates] = useState<EmployeePayRate[]>([]);
  const [employeeSiteAllocations, setEmployeeSiteAllocations] = useState<SiteEmployeeAllocation[]>([]);
  const [isLoadingEmployeeDetails, setIsLoadingEmployeeDetails] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [roleSearchValue, setRoleSearchValue] = useState("");
  const [rolePopoverOpen, setRolePopoverOpen] = useState(false);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [payRateFormData, setPayRateFormData] = useState({
    hourlyRate: "",
    currency: "AUD" as "LKR" | "AUD",
    travelAllowance: "",
    notes: "",
  });
  const [isAddingPayRate, setIsAddingPayRate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    salary: "",
    startDate: "",
    status: "active" as "active" | "inactive",
    invoiceCollectionFrequency: "" as "" | "Monthly" | "Fortnightly" | "Weekly",
    type: "employee" as "employee" | "client",
    isSkillCityEmployee: false,
  });

  const { userData } = useAuth();

  // Load employees from Firebase (excluding clients and admins)
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoading(true);
        const [fetchedEmployees, allUsers] = await Promise.all([
          getAllEmployees(),
          getAllUsers(),
        ]);
        
        // Create a set of admin user emails for quick lookup
        const adminEmails = new Set(
          allUsers
            .filter(user => user.role === "admin" || user.isAdmin)
            .map(user => user.email.toLowerCase())
        );
        
        // Auto-create employee record for current user if they don't have one
        if (userData && userData.approved && userData.email) {
          const existingEmployee = await getEmployeeByEmail(userData.email);
          if (!existingEmployee) {
            try {
              // Safely convert createdAt to date string
              let startDate: string;
              if (userData.createdAt) {
                try {
                  const date = userData.createdAt instanceof Date 
                    ? userData.createdAt 
                    : new Date(userData.createdAt);
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
              
              await addEmployee({
                name: userData.name || "Unknown",
                role: userData.role || "Employee",
                email: userData.email,
                phone: "",
                salary: 0,
                startDate,
                status: "active",
                type: "employee",
                isSkillCityEmployee: false,
              });
              // Reload employees after creating the record
              const updatedEmployees = await getAllEmployees();
              const actualEmployees = updatedEmployees.filter(
                (emp) => {
                  // Filter out clients
                  if (emp.type && emp.type !== "employee") return false;
                  // Filter out admins by role (case-insensitive, handle variations)
                  if (emp.role) {
                    const roleLower = emp.role.toLowerCase().trim();
                    if (roleLower === "admin" || roleLower === "administrator") return false;
                  }
                  // Filter out admins by email match
                  if (emp.email && adminEmails.has(emp.email.toLowerCase())) return false;
                  return true;
                }
              );
        const sortedEmployees = actualEmployees.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setEmployees(sortedEmployees);
        
        // Extract unique roles from employees and load from localStorage
        const rolesFromEmployees = new Set<string>();
        sortedEmployees.forEach(emp => {
          if (emp.role && emp.role.trim()) {
            rolesFromEmployees.add(emp.role);
          }
        });
        
        // Load saved roles from localStorage
        const savedRoles = localStorage.getItem('employeeRoles');
        const defaultRoles = ['Professional Cleaner', 'Employee'];
        const allRoles = savedRoles ? JSON.parse(savedRoles) : defaultRoles;
        
        // Combine and deduplicate
        const combinedRoles = new Set([...allRoles, ...Array.from(rolesFromEmployees)]);
        const sortedRoles = Array.from(combinedRoles).sort();
        setAvailableRoles(sortedRoles);
        localStorage.setItem('employeeRoles', JSON.stringify(sortedRoles));
        
        setIsLoading(false);
              return;
            } catch (error) {
              console.error("Error auto-creating employee record:", error);
              // Continue with normal load if auto-create fails
            }
          }
        }
        
        // Filter out clients and admins - only show actual employees
        const actualEmployees = fetchedEmployees.filter(
          (emp) => {
            // Filter out clients
            if (emp.type && emp.type !== "employee") return false;
            // Filter out admins by role (case-insensitive, handle variations)
            if (emp.role) {
              const roleLower = emp.role.toLowerCase().trim();
              if (roleLower === "admin" || roleLower === "administrator") return false;
            }
            // Filter out admins by email match
            if (emp.email && adminEmails.has(emp.email.toLowerCase())) return false;
            return true;
          }
        );
        // Sort employees alphabetically by name
        const sortedEmployees = actualEmployees.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setEmployees(sortedEmployees);
      } catch (error) {
        console.error("Error loading employees:", error);
        toast.error("Failed to load employees. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, [userData]);

  // Load invoices from Firebase
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setIsLoadingInvoices(true);
        const fetchedInvoices = await getAllInvoices();
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error("Error loading invoices:", error);
        toast.error("Failed to load invoices. Please try again.");
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    loadInvoices();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      salary: "",
      startDate: "",
      status: "active",
      invoiceCollectionFrequency: "",
      type: "employee",
      isSkillCityEmployee: false,
    });
    setEditingEmployeeId(null);
    setEmployeePayRates([]);
    setEmployeeSiteAllocations([]);
    setRoleSearchValue("");
    setPayRateFormData({
      hourlyRate: "",
      currency: "AUD",
      travelAllowance: "",
      notes: "",
    });
  };

  const handleAddNewRole = async (newRole: string) => {
    if (!newRole.trim()) return;
    
    try {
      setIsAddingRole(true);
      const trimmedRole = newRole.trim();
      
      // Add to available roles
      const updatedRoles = [...availableRoles, trimmedRole].sort();
      setAvailableRoles(updatedRoles);
      localStorage.setItem('employeeRoles', JSON.stringify(updatedRoles));
      
      // Set the role in form data
      setFormData({ ...formData, role: trimmedRole });
      setRolePopoverOpen(false);
      setRoleSearchValue("");
      
      toast.success(`Role "${trimmedRole}" added successfully`);
    } catch (error) {
      console.error("Error adding role:", error);
      toast.error("Failed to add role");
    } finally {
      setIsAddingRole(false);
    }
  };

  const handleAddPayRate = async () => {
    if (!editingEmployeeId || !payRateFormData.hourlyRate) {
      toast.error("Please enter an hourly rate");
      return;
    }

    try {
      setIsAddingPayRate(true);
      const employee = employees.find(emp => emp.id === editingEmployeeId);
      if (!employee) {
        toast.error("Employee not found");
        return;
      }

      // For now, we'll create a pay rate without a site (general rate)
      // In a real scenario, you might want to select a site
      await addEmployeePayRate({
        siteId: "", // General rate without specific site
        siteName: "General",
        employeeId: editingEmployeeId,
        employeeName: employee.name,
        hourlyRate: parseFloat(payRateFormData.hourlyRate),
        currency: payRateFormData.currency,
        travelAllowance: payRateFormData.travelAllowance ? parseFloat(payRateFormData.travelAllowance) : undefined,
        notes: payRateFormData.notes || undefined,
      });

      toast.success("Pay rate added successfully");
      
      // Reload pay rates
      const updatedPayRates = await getEmployeePayRatesByEmployee(editingEmployeeId);
      setEmployeePayRates(updatedPayRates);
      
      // Reset pay rate form
      setPayRateFormData({
        hourlyRate: "",
        currency: "AUD",
        travelAllowance: "",
        notes: "",
      });
    } catch (error: any) {
      console.error("Error adding pay rate:", error);
      toast.error(error.message || "Failed to add pay rate");
    } finally {
      setIsAddingPayRate(false);
    }
  };

  const handleEditEmployee = async (employee: Employee) => {
    setEditingEmployeeId(employee.id);
    setFormData({
      name: employee.name,
      role: employee.role,
      email: employee.email,
      phone: employee.phone,
      salary: employee.salary.toString(),
      startDate: employee.startDate,
      status: employee.status,
      invoiceCollectionFrequency: employee.invoiceCollectionFrequency || "",
      type: employee.type || "employee",
      isSkillCityEmployee: employee.isSkillCityEmployee || false,
    });
    
    // Fetch employee pay rates and site allocations
    setIsLoadingEmployeeDetails(true);
    try {
      const [payRates, employeeAllocations] = await Promise.all([
        getEmployeePayRatesByEmployee(employee.id),
        getAllocationsByEmployee(employee.id),
      ]);
      setEmployeePayRates(payRates);
      setEmployeeSiteAllocations(employeeAllocations);
    } catch (error) {
      console.error("Error loading employee details:", error);
      toast.error("Failed to load employee pay rates and site information.");
    } finally {
      setIsLoadingEmployeeDetails(false);
    }
    
    setIsEditDialogOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setDeletingEmployeeId(employee.id);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    try {
      setIsSaving(true);

      if (editingEmployeeId) {
        // Get the existing employee to check if email changed
        const existingEmployee = employees.find(emp => emp.id === editingEmployeeId);
        const emailChanged = existingEmployee && existingEmployee.email !== formData.email;
        
        // Update existing employee - allow partial updates
        await updateEmployee(editingEmployeeId, {
          name: formData.name || "",
          role: formData.role || "",
          email: formData.email || "",
          phone: formData.phone || "",
          salary: parseFloat(formData.salary) || 0,
          startDate: formData.startDate || new Date().toISOString().split("T")[0],
          status: formData.status,
          invoiceCollectionFrequency: formData.invoiceCollectionFrequency || undefined,
          type: formData.type,
          isSkillCityEmployee: formData.isSkillCityEmployee,
        });

        // Update user role to "employee" if email exists
        if (formData.email) {
          try {
            await updateUserRoleByEmail(
              formData.email,
              "employee",
              userData?.uid || "system"
            );
          } catch (error) {
            // Silently fail - user might not exist yet
            console.log("User not found for email:", formData.email);
          }
        }

        // Reload employees to get the latest data from Firebase
        const updatedEmployees = await getAllEmployees();
        // Filter out clients - only show actual employees
        const actualEmployees = updatedEmployees.filter(
          (emp) => !emp.type || emp.type === "employee"
        );
        // Sort employees alphabetically by name
        const sortedEmployees = actualEmployees.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setEmployees(sortedEmployees);
        
        toast.success("Employee updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new employee - allow partial fill
        const newEmployee: Omit<Employee, "id"> = {
          name: formData.name || "",
          role: formData.role || "",
          email: formData.email || "",
          phone: formData.phone || "",
          salary: parseFloat(formData.salary) || 0,
          startDate: formData.startDate || new Date().toISOString().split("T")[0],
          status: formData.status,
          invoiceCollectionFrequency: formData.invoiceCollectionFrequency || undefined,
          type: formData.type,
          isSkillCityEmployee: formData.isSkillCityEmployee,
        };

        // Add employee to Firebase
        await addEmployee(newEmployee);
        
        // Update user role to "employee" if user exists with this email
        if (newEmployee.email) {
          try {
            await updateUserRoleByEmail(
              newEmployee.email,
              "employee",
              userData?.uid || "system"
            );
          } catch (error) {
            // Silently fail - user might not exist yet
            console.log("User not found for email:", newEmployee.email);
          }
        }
        
        // Reload employees to get the latest data from Firebase
        const updatedEmployees = await getAllEmployees();
        // Filter out clients - only show actual employees
        const actualEmployees = updatedEmployees.filter(
          (emp) => !emp.type || emp.type === "employee"
        );
        // Sort employees alphabetically by name
        const sortedEmployees = actualEmployees.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setEmployees(sortedEmployees);
        
        toast.success("Employee added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error(`Failed to ${editingEmployeeId ? 'update' : 'add'} employee. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEmployeeId) return;

    try {
      await deleteEmployee(deletingEmployeeId);
      
      // Reload employees to get the latest data from Firebase
      const [updatedEmployees, allUsers] = await Promise.all([
        getAllEmployees(),
        getAllUsers(),
      ]);
      
      // Create a set of admin user emails for quick lookup
      const adminEmails = new Set(
        allUsers
          .filter(user => user.role === "admin" || user.isAdmin)
          .map(user => user.email.toLowerCase())
      );
      
      // Filter out clients and admins - only show actual employees
      const actualEmployees = updatedEmployees.filter(
        (emp) => {
          // Filter out clients
          if (emp.type && emp.type !== "employee") return false;
          // Filter out admins by role (case-insensitive, handle variations)
          if (emp.role) {
            const roleLower = emp.role.toLowerCase().trim();
            if (roleLower === "admin" || roleLower === "administrator") return false;
          }
          // Filter out admins by email match
          if (emp.email && adminEmails.has(emp.email.toLowerCase())) return false;
          return true;
        }
      );
      setEmployees(actualEmployees);
      
      toast.success("Employee deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingEmployeeId(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee. Please try again.");
    }
  };

  const handleAddEmployee = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const filteredEmployees = employees.filter(employee => {
    // Exclude admins (double-check to ensure they're filtered out)
    if (employee.role) {
      const roleLower = employee.role.toLowerCase().trim();
      if (roleLower === "admin" || roleLower === "administrator") return false;
    }
    
    // Apply search filter
    return employee.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (employee.role && employee.role.toLowerCase().includes(searchValue.toLowerCase()));
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue]);

  // Filter invoices based on employee invoice collection frequency and date range
  const getFilteredEmployeeInvoices = () => {
    let filtered = invoices;

    // Filter by invoice collection frequency
    if (invoiceFrequencyFilter !== "all") {
      const employeesWithFrequency = employees.filter(
        emp => emp.invoiceCollectionFrequency === invoiceFrequencyFilter
      );
      const employeeIds = new Set(employeesWithFrequency.map(emp => emp.id));
      
      // For now, we'll show all invoices and let the user filter by frequency
      // In a real scenario, you might want to link invoices to employees via work schedules
      filtered = filtered.filter(inv => {
        // This is a placeholder - in reality, you'd match invoices to employees
        // based on work schedules or other relationships
        return true;
      });
    }

    // Filter by date range
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(inv => {
        const issueDate = new Date(inv.issueDate);
        const dueDate = new Date(inv.dueDate);
        const fromDate = dateRange.from;
        const toDate = dateRange.to;

        if (fromDate && toDate) {
          return (
            (issueDate >= fromDate && issueDate <= toDate) ||
            (dueDate >= fromDate && dueDate <= toDate) ||
            (issueDate <= fromDate && dueDate >= toDate)
          );
        } else if (fromDate) {
          return issueDate >= fromDate || dueDate >= fromDate;
        } else if (toDate) {
          return issueDate <= toDate || dueDate <= toDate;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredEmployeeInvoices = getFilteredEmployeeInvoices();

  // Filter invoices for modal based on month range and frequency
  const getModalFilteredInvoices = (frequencyFilter: string, monthRange: DateRange | undefined) => {
    let filtered = invoices;

    // Filter by invoice collection frequency
    if (frequencyFilter !== "all") {
      // For now, show all invoices - in production, you'd match invoices to employees
      // based on work schedules or other relationships
      // TODO: Implement frequency-based filtering
    }

    // Filter by month range
    if (monthRange?.from || monthRange?.to) {
      filtered = filtered.filter(inv => {
        const issueDate = new Date(inv.issueDate);
        const fromDate = monthRange.from ? new Date(monthRange.from.getFullYear(), monthRange.from.getMonth(), 1) : null;
        const toDate = monthRange.to ? new Date(monthRange.to.getFullYear(), monthRange.to.getMonth() + 1, 0) : null;

        if (fromDate && toDate) {
          return issueDate >= fromDate && issueDate <= toDate;
        } else if (fromDate) {
          return issueDate >= fromDate;
        } else if (toDate) {
          return issueDate <= toDate;
        }
        return true;
      });
    }

    return filtered;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-background border border-violet-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Employees
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your workforce and Skill City employees</p>
        </div>
          <Button 
            onClick={handleAddEmployee} 
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            size="lg"
          >
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
        </div>
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-muted/30 border-b-2">
          <div>
            <CardTitle className="text-xl font-bold">Employee List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">View and manage all employees</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or role..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-violet-500/20 via-purple-500/10 to-violet-500/5 border-b-2">
                  <TableHead className="min-w-[120px] font-bold text-foreground">Name</TableHead>
                  <TableHead className="min-w-[100px] font-bold text-foreground">Type</TableHead>
                  <TableHead className="min-w-[140px] font-bold text-foreground">Organization</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-foreground">Role</TableHead>
                  <TableHead className="min-w-[180px] font-bold text-foreground">Invoice Collection Frequency</TableHead>
                  <TableHead className="min-w-[100px] font-bold text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading employees...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((employee) => (
                    <TableRow 
                      key={employee.id}
                      className="cursor-pointer hover:bg-gradient-to-r hover:from-violet-500/5 hover:to-transparent transition-all duration-200 border-b"
                      onClick={() => handleEditEmployee(employee)}
                    >
                      <TableCell className="font-semibold">{employee.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={employee.type === "client" ? "default" : "secondary"}
                          className={employee.type === "client" 
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" 
                            : "bg-muted text-muted-foreground"}
                        >
                          {employee.type === "client" ? "Client" : "Employee"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={employee.isSkillCityEmployee ? "default" : "outline"}
                          className={employee.isSkillCityEmployee 
                            ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30 font-semibold shadow-sm" 
                            : "bg-muted/50 text-muted-foreground border-muted"}
                        >
                          {employee.isSkillCityEmployee ? (
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3 w-3" />
                              Skill City
                            </span>
                          ) : (
                            "External"
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{employee.role || "-"}</span>
                      </TableCell>
                      <TableCell>
                        {employee.invoiceCollectionFrequency ? (
                          <Badge variant="outline" className="text-xs">
                            {employee.invoiceCollectionFrequency}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={employee.status === "active" 
                              ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                              : "bg-muted text-muted-foreground"}
                          >
                            {employee.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
 
          {filteredEmployees.length > 0 && totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {(() => {
                    const pages: (number | string)[] = [];
                    
                    if (totalPages <= 7) {
                      // Show all pages if 7 or fewer
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);
                      
                      if (currentPage <= 3) {
                        // Near the start
                        for (let i = 2; i <= 4; i++) {
                          pages.push(i);
                        }
                        pages.push("ellipsis");
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        // Near the end
                        pages.push("ellipsis");
                        for (let i = totalPages - 3; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // In the middle
                        pages.push("ellipsis");
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                          pages.push(i);
                        }
                        pages.push("ellipsis");
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    });
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1);
                        }
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

      {/* Employee Invoices Section */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Invoice Collection Frequency Filter */}
              <div className="space-y-2">
                <Label htmlFor="frequency-filter">Invoice Collection Frequency</Label>
                <Select
                  value={invoiceFrequencyFilter}
                  onValueChange={setInvoiceFrequencyFilter}
                >
                  <SelectTrigger id="frequency-filter">
                    <SelectValue placeholder="All frequencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Frequencies</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Picker */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(invoiceFrequencyFilter !== "all" || dateRange?.from || dateRange?.to) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
              setInvoiceFrequencyFilter("all");
              setDateRange(undefined);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingInvoices ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading invoices...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployeeInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No invoices found matching the filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployeeInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>${invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>${invoice.gst.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">${invoice.totalAmount.toLocaleString()}</TableCell>
                      <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg max-h-[95vh] sm:max-h-[90vh] m-2 sm:m-4">
          <div className="grid md:grid-cols-2 h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/emp_modalimg.jpg"
                alt="Add Employee"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-8">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <img
                    src="/logo/SkillCityQ 1.png"
                    alt="Skill City Logo"
                    className="w-32 h-20 object-contain"
                  />
                  <h2 className="text-2xl font-semibold text-white">
                    Add a new employee
                  </h2>
                  <p className="text-sm text-white">
                    Add a new employee to the system by filling in the details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                  <DialogDescription>
                    Fill in the employee details. All fields are optional and can be filled partially.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Default Work Site Section - For new employees */}
                <div className="mb-4 p-4 rounded-lg border-2 border-dashed bg-muted/30">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Default Work Site</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Work sites will be available after the employee is created. You can assign sites in the Site Employee Allocation section.
                  </p>
                </div>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            id="role"
                          >
                            {formData.role || "Select role..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search roles..." 
                              value={roleSearchValue}
                              onValueChange={setRoleSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>No role found.</CommandEmpty>
                              <CommandGroup>
                                {availableRoles.map((role) => (
                                  <CommandItem
                                    key={role}
                                    value={role}
                                    onSelect={() => {
                                      setFormData({ ...formData, role });
                                      setRolePopoverOpen(false);
                                      setRoleSearchValue("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.role === role ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {role}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {roleSearchValue && 
                               !availableRoles.some(role => 
                                 role.toLowerCase() === roleSearchValue.trim().toLowerCase()
                               ) && 
                               roleSearchValue.trim().length > 0 && (
                                <CommandGroup>
                                  <CommandItem
                                    value={`add-${roleSearchValue}`}
                                    onSelect={() => handleAddNewRole(roleSearchValue)}
                                    disabled={isAddingRole}
                                    className="text-primary"
                                  >
                                    {isAddingRole ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{roleSearchValue}"
                                      </>
                                    )}
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john.smith@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary</Label>
                      <Input
                        id="salary"
                        type="number"
                        step="0.01"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        placeholder="3000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as "employee" | "client" })}
                      >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceCollectionFrequency">Invoice Collection Frequency</Label>
                      <Select
                        value={formData.invoiceCollectionFrequency}
                        onValueChange={(value) => setFormData({ ...formData, invoiceCollectionFrequency: value as "Monthly" | "Fortnightly" | "Weekly" })}
                      >
                        <SelectTrigger id="invoiceCollectionFrequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/50">
                      <Checkbox
                        id="isSkillCityEmployee"
                        checked={formData.isSkillCityEmployee}
                        onCheckedChange={(checked) => setFormData({ ...formData, isSkillCityEmployee: checked as boolean })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="isSkillCityEmployee" className="cursor-pointer font-medium">
                          Skill City Employee
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Check if this employee works for Skill City organization
                        </p>
                      </div>
                      {formData.isSkillCityEmployee && (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Employee Invoice Records Section */}
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-4">Previous Employee Invoice Records</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Invoice Collection Frequency Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="modal-frequency-filter">Invoice Collection Frequency</Label>
                        <Select
                          value={modalInvoiceFrequencyFilter}
                          onValueChange={setModalInvoiceFrequencyFilter}
                        >
                          <SelectTrigger id="modal-frequency-filter">
                            <SelectValue placeholder="All frequencies" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Frequencies</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Month Range Picker */}
                      <div className="space-y-2">
                        <Label>Month Range</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {modalMonthRange?.from ? (
                                modalMonthRange.to ? (
                                  <>
                                    {format(modalMonthRange.from, "LLL dd, y")} -{" "}
                                    {format(modalMonthRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(modalMonthRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={modalMonthRange?.from}
                              selected={modalMonthRange}
                              onSelect={setModalMonthRange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(modalInvoiceFrequencyFilter !== "all" || modalMonthRange?.from || modalMonthRange?.to) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModalInvoiceFrequencyFilter("all");
                          setModalMonthRange(undefined);
                        }}
                        className="mb-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {getModalFilteredInvoices(modalInvoiceFrequencyFilter, modalMonthRange).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No invoices found matching the filters</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {getModalFilteredInvoices(modalInvoiceFrequencyFilter, modalMonthRange).map((invoice) => (
                          <Card key={invoice.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-sm">{invoice.invoiceNumber}</h4>
                                      <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Amount: </span>
                                      <span className="font-medium">${invoice.amount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Total: </span>
                                      <span className="font-semibold text-primary">${invoice.totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Issue Date: </span>
                                      <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <StatusBadge status={invoice.status} />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                      setModalMonthRange(undefined);
                      setModalInvoiceFrequencyFilter("all");
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEmployee} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Employee"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/emp_modalimg.jpg"
                alt="Edit Employee"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 px-8">
                <div className="flex flex-col items-center space-y-2 text-center">
                  <img
                    src="/logo/SkillCityQ 1.png"
                    alt="Skill City Logo"
                    className="w-32 h-20 object-contain"
                  />
                  <h2 className="text-2xl font-semibold text-white">
                    Edit employee details
                  </h2>
                  <p className="text-sm text-white">
                    Update the employee details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Edit Employee</DialogTitle>
                  <DialogDescription>
                    Update the employee details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Default Work Site Section - For existing employees */}
                {isLoadingEmployeeDetails ? (
                  <div className="mb-4 p-4 rounded-lg border-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <Label className="text-sm font-semibold">Loading work sites...</Label>
                    </div>
                  </div>
                ) : employeeSiteAllocations.length > 0 ? (
                  <div className="mb-4 p-4 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-primary" />
                      <Label className="text-sm font-bold">Default Work Site(s)</Label>
                    </div>
                    <div className="space-y-2">
                      {employeeSiteAllocations.slice(0, 3).map((allocation) => (
                        <div 
                          key={allocation.id}
                          className="flex items-start justify-between p-3 rounded-lg bg-card border border-primary/10 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{allocation.siteName}</span>
                              <Badge variant="secondary" className="text-xs">
                                Employee #{allocation.employeeNumber}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              {allocation.actualWorkingTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Working Time: <span className="font-medium text-foreground">{allocation.actualWorkingTime}</span></span>
                                </div>
                              )}
                              {allocation.hasExtraTime && allocation.extraTime && (
                                <div className="flex items-center gap-1">
                                  <span className="text-primary font-medium">+{allocation.extraTime}</span>
                                  {allocation.extraTimeDay && (
                                    <span className="text-muted-foreground">({allocation.extraTimeDay})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {employeeSiteAllocations.length > 3 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          +{employeeSiteAllocations.length - 3} more site(s). See details below.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-4 rounded-lg border-2 border-dashed bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-semibold">Default Work Site</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No work sites assigned yet. You can assign sites in the Site Employee Allocation section.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Role</Label>
                      <Popover open={rolePopoverOpen} onOpenChange={setRolePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                            id="edit-role"
                          >
                            {formData.role || "Select role..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search roles..." 
                              value={roleSearchValue}
                              onValueChange={setRoleSearchValue}
                            />
                            <CommandList>
                              <CommandEmpty>No role found.</CommandEmpty>
                              <CommandGroup>
                                {availableRoles.map((role) => (
                                  <CommandItem
                                    key={role}
                                    value={role}
                                    onSelect={() => {
                                      setFormData({ ...formData, role });
                                      setRolePopoverOpen(false);
                                      setRoleSearchValue("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.role === role ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {role}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                              {roleSearchValue && 
                               !availableRoles.some(role => 
                                 role.toLowerCase() === roleSearchValue.trim().toLowerCase()
                               ) && 
                               roleSearchValue.trim().length > 0 && (
                                <CommandGroup>
                                  <CommandItem
                                    value={`add-${roleSearchValue}`}
                                    onSelect={() => handleAddNewRole(roleSearchValue)}
                                    disabled={isAddingRole}
                                    className="text-primary"
                                  >
                                    {isAddingRole ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Adding...
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{roleSearchValue}"
                                      </>
                                    )}
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john.smith@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-salary">Salary</Label>
                      <Input
                        id="edit-salary"
                        type="number"
                        step="0.01"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        placeholder="3000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Start Date</Label>
                      <Input
                        id="edit-startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value as "employee" | "client" })}
                      >
                        <SelectTrigger id="edit-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-invoiceCollectionFrequency">Invoice Collection Frequency</Label>
                      <Select
                        value={formData.invoiceCollectionFrequency}
                        onValueChange={(value) => setFormData({ ...formData, invoiceCollectionFrequency: value as "Monthly" | "Fortnightly" | "Weekly" })}
                      >
                        <SelectTrigger id="edit-invoiceCollectionFrequency">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/50">
                      <Checkbox
                        id="edit-isSkillCityEmployee"
                        checked={formData.isSkillCityEmployee}
                        onCheckedChange={(checked) => setFormData({ ...formData, isSkillCityEmployee: checked as boolean })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="edit-isSkillCityEmployee" className="cursor-pointer font-medium">
                          Skill City Employee
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Check if this employee works for Skill City organization
                        </p>
                      </div>
                      {formData.isSkillCityEmployee && (
                        <Building2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
                      >
                        <SelectTrigger id="edit-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Employee Pay Rates and Sites Section */}
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-4">Employee Work Information</h3>
                    
                    {isLoadingEmployeeDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading employee details...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Invoice Collection Frequency */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="bg-muted/50">
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Invoice Collection Frequency</p>
                                <p className="font-semibold text-lg">
                                  {formData.invoiceCollectionFrequency || "Not set"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card className="bg-muted/50">
                            <CardContent className="pt-6">
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Total Sites</p>
                                <p className="font-semibold text-lg">
                                  {employeeSiteAllocations.length} {employeeSiteAllocations.length === 1 ? "Site" : "Sites"}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Hourly Rates by Site */}
                        {employeePayRates.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Hourly Rates by Site</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {employeePayRates.map((payRate) => (
                                  <div
                                    key={payRate.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium">{payRate.siteName}</p>
                                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                        <span>
                                          Rate: <span className="font-semibold text-foreground">
                                            {payRate.currency || "AUD"}{payRate.hourlyRate.toLocaleString()}/hr
                                          </span>
                                        </span>
                                        {payRate.travelAllowance && (
                                          <span>
                                            Travel: <span className="font-semibold text-foreground">
                                              {payRate.currency || "AUD"}{payRate.travelAllowance.toLocaleString()}
                                            </span>
                                          </span>
                                        )}
                                      </div>
                                      {payRate.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">{payRate.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Add New Pay Rate Section */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Add Employee Pay Rate
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="payRate-hourlyRate">Hourly Rate</Label>
                                  <Input
                                    id="payRate-hourlyRate"
                                    type="number"
                                    step="0.01"
                                    value={payRateFormData.hourlyRate}
                                    onChange={(e) => setPayRateFormData({ ...payRateFormData, hourlyRate: e.target.value })}
                                    placeholder="25.00"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="payRate-currency">Currency</Label>
                                  <Select
                                    value={payRateFormData.currency}
                                    onValueChange={(value: "LKR" | "AUD") => setPayRateFormData({ ...payRateFormData, currency: value })}
                                  >
                                    <SelectTrigger id="payRate-currency">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AUD">AUD (Australian Dollar)</SelectItem>
                                      <SelectItem value="LKR">LKR (Sri Lankan Rupee)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="payRate-travelAllowance">Travel Allowance (Optional)</Label>
                                  <Input
                                    id="payRate-travelAllowance"
                                    type="number"
                                    step="0.01"
                                    value={payRateFormData.travelAllowance}
                                    onChange={(e) => setPayRateFormData({ ...payRateFormData, travelAllowance: e.target.value })}
                                    placeholder="10.00"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="payRate-notes">Notes (Optional)</Label>
                                  <Input
                                    id="payRate-notes"
                                    value={payRateFormData.notes}
                                    onChange={(e) => setPayRateFormData({ ...payRateFormData, notes: e.target.value })}
                                    placeholder="Additional notes"
                                  />
                                </div>
                              </div>
                              <Button
                                onClick={handleAddPayRate}
                                disabled={isAddingPayRate || !payRateFormData.hourlyRate}
                                className="w-full"
                              >
                                {isAddingPayRate ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                  </>
                                ) : (
                                  <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Pay Rate
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Sites Employee Works On */}
                        {employeeSiteAllocations.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Sites</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {employeeSiteAllocations.map((allocation) => (
                                  <div
                                    key={allocation.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium">{allocation.siteName}</p>
                                        <Badge variant="secondary">Employee #{allocation.employeeNumber}</Badge>
                                      </div>
                                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                        <span>
                                          Working Time: <span className="font-semibold text-foreground">{allocation.actualWorkingTime || allocation.allocatedHours || "Not set"}</span>
                                        </span>
                                        {allocation.hasExtraTime && allocation.extraTime && (
                                          <span>
                                            Extra: <span className="font-semibold text-foreground">{allocation.extraTime}</span>
                                            {allocation.extraTimeDay && ` (${allocation.extraTimeDay})`}
                                          </span>
                                        )}
                                      </div>
                                      {allocation.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">{allocation.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {employeePayRates.length === 0 && employeeSiteAllocations.length === 0 && (
                          <Card className="bg-muted/50">
                            <CardContent className="pt-6">
                              <div className="text-center py-8 text-muted-foreground">
                                <p>No pay rates or site allocations found for this employee.</p>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Employee Invoice Records Section */}
                <div className="mt-6 pt-6 border-t">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-4">Previous Employee Invoice Records</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Invoice Collection Frequency Filter */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-modal-frequency-filter">Invoice Collection Frequency</Label>
                        <Select
                          value={modalInvoiceFrequencyFilter}
                          onValueChange={setModalInvoiceFrequencyFilter}
                        >
                          <SelectTrigger id="edit-modal-frequency-filter">
                            <SelectValue placeholder="All frequencies" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Frequencies</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Month Range Picker */}
                      <div className="space-y-2">
                        <Label>Month Range</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {modalMonthRange?.from ? (
                                modalMonthRange.to ? (
                                  <>
                                    {format(modalMonthRange.from, "LLL dd, y")} -{" "}
                                    {format(modalMonthRange.to, "LLL dd, y")}
                                  </>
                                ) : (
                                  format(modalMonthRange.from, "LLL dd, y")
                                )
                              ) : (
                                <span>Pick a date range</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              initialFocus
                              mode="range"
                              defaultMonth={modalMonthRange?.from}
                              selected={modalMonthRange}
                              onSelect={setModalMonthRange}
                              numberOfMonths={2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(modalInvoiceFrequencyFilter !== "all" || modalMonthRange?.from || modalMonthRange?.to) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModalInvoiceFrequencyFilter("all");
                          setModalMonthRange(undefined);
                        }}
                        className="mb-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {getModalFilteredInvoices(modalInvoiceFrequencyFilter, modalMonthRange).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No invoices found matching the filters</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {getModalFilteredInvoices(modalInvoiceFrequencyFilter, modalMonthRange).map((invoice) => (
                          <Card key={invoice.id} className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <FileText className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-sm">{invoice.invoiceNumber}</h4>
                                      <p className="text-xs text-muted-foreground">{invoice.clientName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Amount: </span>
                                      <span className="font-medium">${invoice.amount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Total: </span>
                                      <span className="font-semibold text-primary">${invoice.totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Issue Date: </span>
                                      <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <StatusBadge status={invoice.status} />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      resetForm();
                      setModalMonthRange(undefined);
                      setModalInvoiceFrequencyFilter("all");
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEmployee} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Employee"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the employee from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingEmployeeId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Employees;
