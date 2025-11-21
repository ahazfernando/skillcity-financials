"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Loader2, Trash2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Employee, Invoice } from "@/types/financial";
import { getAllEmployees, addEmployee, updateEmployee, deleteEmployee } from "@/lib/firebase/employees";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    salary: "",
    startDate: "",
    status: "active" as "active" | "inactive",
    invoiceCollectionFrequency: "" as "" | "Monthly" | "Fortnightly" | "Weekly",
  });

  // Load employees from Firebase
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoading(true);
        const fetchedEmployees = await getAllEmployees();
        setEmployees(fetchedEmployees);
      } catch (error) {
        console.error("Error loading employees:", error);
        toast.error("Failed to load employees. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, []);

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
    });
    setEditingEmployeeId(null);
  };

  const handleEditEmployee = (employee: Employee) => {
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
    });
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
        });

        // Reload employees to get the latest data from Firebase
        const updatedEmployees = await getAllEmployees();
        setEmployees(updatedEmployees);
        
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
        };

        // Add employee to Firebase
        await addEmployee(newEmployee);
        
        // Reload employees to get the latest data from Firebase
        const updatedEmployees = await getAllEmployees();
        setEmployees(updatedEmployees);
        
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
      const updatedEmployees = await getAllEmployees();
      setEmployees(updatedEmployees);
      
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
    return employee.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchValue.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchValue.toLowerCase());
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
      filtered = filtered;
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage your workforce</p>
        </div>
        <Button onClick={handleAddEmployee}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, or email..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Invoice Collection Frequency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading employees...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map((employee) => (
                    <TableRow 
                      key={employee.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditEmployee(employee)}
                    >
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>${employee.salary.toLocaleString()}</TableCell>
                      <TableCell>
                        {employee.invoiceCollectionFrequency || "-"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Badge className={employee.status === "active" ? "bg-success" : "bg-muted"}>
                            {employee.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEmployee(employee)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
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
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                  <DialogDescription>
                    Fill in the employee details. All fields are optional and can be filled partially.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professional Cleaner">Professional Cleaner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData({ ...formData, role: value })}
                      >
                        <SelectTrigger id="edit-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professional Cleaner">Professional Cleaner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-2 gap-4">
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
