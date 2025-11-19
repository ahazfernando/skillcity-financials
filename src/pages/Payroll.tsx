"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { mockPayrolls, mockEmployees } from "@/data/mockData";
import { Download, Upload, Plus, FileText, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentStatus } from "@/types/financial";
import { toast } from "sonner";

const Payroll = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    period: "",
    basicSalary: "",
    allowances: "",
    deductions: "",
    totalAmount: "",
    status: "pending" as PaymentStatus,
    paymentDate: "",
    notes: "",
    receiptUrl: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate Total = Basic Salary + Allowances - Deductions
      if (field === "basicSalary" || field === "allowances" || field === "deductions") {
        const basicSalary = parseFloat(updated.basicSalary) || 0;
        const allowances = parseFloat(updated.allowances) || 0;
        const deductions = parseFloat(updated.deductions) || 0;
        const total = basicSalary + allowances - deductions;
        updated.totalAmount = total.toFixed(2);
      }
      
      return updated;
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = mockEmployees.find(emp => emp.id === employeeId);
    if (employee) {
      setFormData((prev) => ({
        ...prev,
        employeeId: employee.id,
        employeeName: employee.name,
      }));
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PDF, DOCX, JPEG, XLSX, or TXT files.");
      return;
    }
    
    if (file.size > maxSize) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }
    
    setReceiptFile(file);
    const fileUrl = URL.createObjectURL(file);
    handleInputChange("receiptUrl", fileUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    if (receiptFile) {
      if (formData.receiptUrl && formData.receiptUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.receiptUrl);
      }
    }
    setReceiptFile(null);
    handleInputChange("receiptUrl", "");
  };

  const handleAddPayroll = async () => {
    if (!formData.employeeId || !formData.period || !formData.basicSalary) {
      toast.error("Please fill in all required fields (Employee, Period, Basic Salary)");
      return;
    }

    try {
      setIsSaving(true);
      
      // In a real app, you would upload the receipt file and save to Firebase here
      // For now, we'll just show a success message
      
      toast.success("Payroll added successfully!");
      setIsAddDialogOpen(false);
      setReceiptFile(null);
      setFormData({
        employeeId: "",
        employeeName: "",
        period: "",
        basicSalary: "",
        allowances: "",
        deductions: "",
        totalAmount: "",
        status: "pending",
        paymentDate: "",
        notes: "",
        receiptUrl: "",
      });
    } catch (error) {
      console.error("Error adding payroll:", error);
      toast.error("Failed to add payroll. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPayrolls = mockPayrolls.filter(payroll => {
    const matchesSearch = payroll.employeeName.toLowerCase().includes(searchValue.toLowerCase()) ||
      payroll.period.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payroll</h2>
          <p className="text-muted-foreground">Manage employee payroll (GST exempt)</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Payroll
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <SearchFilter
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              placeholder="Search by employee or period..."
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{payroll.employeeName}</TableCell>
                    <TableCell>{payroll.period}</TableCell>
                    <TableCell>${payroll.basicSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-success">${payroll.allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">-${payroll.deductions.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">${payroll.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={payroll.status} />
                    </TableCell>
                    <TableCell>
                      {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {payroll.receiptUrl ? (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant="outline">No receipt</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {payroll.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/inve.jpg"
                alt="Add Payroll"
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
                    Add a new payroll entry
                  </h2>
                  <p className="text-sm text-white">
                    Add a new payroll entry to the system by filling in the details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Add Payroll</DialogTitle>
                  <DialogDescription>
                    Fill in the payroll details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee">Employee *</Label>
                      <Select
                        value={formData.employeeId}
                        onValueChange={handleEmployeeSelect}
                      >
                        <SelectTrigger id="employee">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="period">Period *</Label>
                      <Input
                        id="period"
                        value={formData.period}
                        onChange={(e) => handleInputChange("period", e.target.value)}
                        placeholder="January 2025"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">Basic Salary *</Label>
                      <Input
                        id="basicSalary"
                        type="number"
                        step="0.01"
                        value={formData.basicSalary}
                        onChange={(e) => handleInputChange("basicSalary", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowances">Allowances</Label>
                      <Input
                        id="allowances"
                        type="number"
                        step="0.01"
                        value={formData.allowances}
                        onChange={(e) => handleInputChange("allowances", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deductions">Deductions</Label>
                      <Input
                        id="deductions"
                        type="number"
                        step="0.01"
                        value={formData.deductions}
                        onChange={(e) => handleInputChange("deductions", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalAmount">Total</Label>
                      <Input
                        id="totalAmount"
                        type="number"
                        step="0.01"
                        value={formData.totalAmount}
                        readOnly
                        className="bg-muted"
                        placeholder="Auto-calculated"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => handleInputChange("status", value as PaymentStatus)}
                      >
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Upload Receipt</Label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !receiptFile && document.getElementById('receipt-upload')?.click()}
                      className={`
                        relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                        ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                        ${receiptFile ? 'border-primary/50' : ''}
                        ${!receiptFile ? 'cursor-pointer hover:border-primary/50' : ''}
                      `}
                    >
                      <input
                        type="file"
                        id="receipt-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpeg,.jpg,.png,.xlsx,.xls,.txt"
                        onChange={handleFileInputChange}
                      />
                      {receiptFile ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-3">
                            <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <p className="text-sm font-medium truncate w-full">{receiptFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile();
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById('receipt-upload')?.click();
                            }}
                          >
                            Change File
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-center">
                            <Upload className="h-12 w-12 text-muted-foreground" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">
                              Choose a file or drag & drop it here
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PDF, DOCX, JPEG, XLSX, TXT - Up to 50MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('receipt-upload')?.click()}
                          >
                            Browse files
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      placeholder="Additional notes about the payroll..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddPayroll} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Payroll"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
