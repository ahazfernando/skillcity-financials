"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { Download, Plus, FileText, Calendar as CalendarIcon, Upload, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
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
import { Invoice, PaymentStatus } from "@/types/financial";
import { getAllInvoices, addInvoice, updateInvoice } from "@/lib/firebase/invoices";
import { uploadReceipt } from "@/lib/firebase/storage";
import { toast } from "sonner";

const Invoices = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    clientName: "",
    amount: "",
    gst: "",
    totalAmount: "",
    issueDate: "",
    dueDate: "",
    status: "pending" as PaymentStatus,
    notes: "",
    receiptUrl: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate GST (15% of amount) and Total if amount changes
      if (field === "amount" && value) {
        const amount = parseFloat(value) || 0;
        const gst = amount * 0.15;
        const total = amount + gst;
        updated.gst = gst.toFixed(2);
        updated.totalAmount = total.toFixed(2);
      }
      
      return updated;
    });
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload PDF, DOCX, JPEG, XLSX, or TXT files.");
      return;
    }
    
    if (file.size > maxSize) {
      alert("File size exceeds 50MB limit.");
      return;
    }
    
    setReceiptFile(file);
    // Optionally create a URL for preview or upload
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
      // Revoke the object URL if it was created
      if (formData.receiptUrl && formData.receiptUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.receiptUrl);
      }
    }
    setReceiptFile(null);
    handleInputChange("receiptUrl", "");
  };

  // Load invoices from Firebase
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setIsLoading(true);
        const fetchedInvoices = await getAllInvoices();
        setInvoices(fetchedInvoices);
      } catch (error) {
        console.error("Error loading invoices:", error);
        toast.error("Failed to load invoices. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const resetForm = () => {
    setFormData({
      invoiceNumber: "",
      clientName: "",
      amount: "",
      gst: "",
      totalAmount: "",
      issueDate: "",
      dueDate: "",
      status: "pending",
      notes: "",
      receiptUrl: "",
    });
    setReceiptFile(null);
    setEditingInvoiceId(null);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoiceId(invoice.id);
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amount: invoice.amount.toString(),
      gst: invoice.gst.toString(),
      totalAmount: invoice.totalAmount.toString(),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      notes: invoice.notes || "",
      receiptUrl: invoice.receiptUrl || "",
    });
    setReceiptFile(null); // Reset file, existing receipt URL is in formData
    setIsEditDialogOpen(true);
  };

  const handleSaveInvoice = async () => {
    if (!formData.invoiceNumber || !formData.clientName || !formData.amount) {
      toast.error("Please fill in all required fields (Invoice #, Client, Amount)");
      return;
    }

    try {
      setIsSaving(true);
      let receiptUrl = formData.receiptUrl;

      // Upload receipt file to Firebase Storage if a new file is selected
      if (receiptFile) {
        const invoiceId = editingInvoiceId || `inv-${Date.now()}`;
        receiptUrl = await uploadReceipt(receiptFile, invoiceId);
      }

      if (editingInvoiceId) {
        // Update existing invoice
        await updateInvoice(editingInvoiceId, {
          invoiceNumber: formData.invoiceNumber,
          clientName: formData.clientName,
          siteId: "", // You might want to add site selection
          amount: parseFloat(formData.amount),
          gst: parseFloat(formData.gst) || 0,
          totalAmount: parseFloat(formData.totalAmount) || parseFloat(formData.amount),
          issueDate: formData.issueDate || new Date().toISOString().split("T")[0],
          dueDate: formData.dueDate || new Date().toISOString().split("T")[0],
          status: formData.status,
          receiptUrl: receiptUrl || undefined,
          notes: formData.notes || undefined,
        });

        // Reload invoices to get the latest data from Firebase
        const updatedInvoices = await getAllInvoices();
        setInvoices(updatedInvoices);
        
        toast.success("Invoice updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new invoice
        const newInvoice: Omit<Invoice, "id"> = {
          invoiceNumber: formData.invoiceNumber,
          clientName: formData.clientName,
          siteId: "", // You might want to add site selection
          amount: parseFloat(formData.amount),
          gst: parseFloat(formData.gst) || 0,
          totalAmount: parseFloat(formData.totalAmount) || parseFloat(formData.amount),
          issueDate: formData.issueDate || new Date().toISOString().split("T")[0],
          dueDate: formData.dueDate || new Date().toISOString().split("T")[0],
          status: formData.status,
          receiptUrl: receiptUrl || undefined,
          notes: formData.notes || undefined,
        };

        // Add invoice to Firebase
        const invoiceId = await addInvoice(newInvoice);
        
        // Add the invoice to local state with the returned ID
        const invoiceWithId: Invoice = { ...newInvoice, id: invoiceId };
        setInvoices([invoiceWithId, ...invoices]);
        
        toast.success("Invoice added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error(`Failed to ${editingInvoiceId ? 'update' : 'add'} invoice. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInvoice = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleCreateInvoice = () => {
    // This could generate a PDF, export invoice, or perform other actions
    alert("Create Invoice functionality - This could generate PDF, export, or perform other invoice creation actions");
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchValue.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    // Date range filtering - check if invoice issue date or due date falls within range
    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      const invoiceIssueDate = new Date(invoice.issueDate);
      const invoiceDueDate = new Date(invoice.dueDate);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      // Check if invoice issue date or due date is within the range
      matchesDate = (invoiceIssueDate >= fromDate && invoiceIssueDate <= toDate) ||
                   (invoiceDueDate >= fromDate && invoiceDueDate <= toDate) ||
                   (invoiceIssueDate <= fromDate && invoiceDueDate >= toDate);
    } else if (dateRange?.from) {
      // Only from date selected
      const invoiceIssueDate = new Date(invoice.issueDate);
      const invoiceDueDate = new Date(invoice.dueDate);
      const fromDate = new Date(dateRange.from);
      matchesDate = invoiceIssueDate >= fromDate || invoiceDueDate >= fromDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage client invoices and payments</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateInvoice}>
            <FileText className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
          <Button onClick={handleAddInvoice}>
            <Plus className="mr-2 h-4 w-4" />
            Add Invoice
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-end mb-6">
            <div className="flex-1 min-w-[200px]">
              <SearchFilter
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                placeholder="Search by invoice number or client..."
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal"
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
                  <TableHead>Receipt</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading invoices...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditInvoice(invoice)}
                    >
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {invoice.receiptUrl ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (invoice.receiptUrl) {
                                window.open(invoice.receiptUrl, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Badge variant="outline">No receipt</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {invoice.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Invoice Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/InvoiceField.jpg"
                alt="Add Invoice"
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
                    Add a new financial invoice
                  </h2>
                  <p className="text-sm text-white">
                    Add a new financial invoice to the system by filling in the details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Add Invoice</DialogTitle>
                  <DialogDescription>
                    Fill in the invoice details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice # *</Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                  placeholder="INV-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange("clientName", e.target.value)}
                  placeholder="Client Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST</Label>
                <Input
                  id="gst"
                  type="number"
                  step="0.01"
                  value={formData.gst}
                  onChange={(e) => handleInputChange("gst", e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => handleInputChange("totalAmount", e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleInputChange("issueDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
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
                placeholder="Additional notes about the invoice..."
                rows={3}
              />
            </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveInvoice} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Invoice"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/InvoiceField.jpg"
                alt="Edit Invoice"
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
                    Edit financial invoice
                  </h2>
                  <p className="text-sm text-white">
                    Update the invoice details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Edit Invoice</DialogTitle>
                  <DialogDescription>
                    Update the invoice details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-invoiceNumber">Invoice # *</Label>
                <Input
                  id="edit-invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                  placeholder="INV-2025-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-clientName">Client *</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange("clientName", e.target.value)}
                  placeholder="Client Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-gst">GST</Label>
                <Input
                  id="edit-gst"
                  type="number"
                  step="0.01"
                  value={formData.gst}
                  onChange={(e) => handleInputChange("gst", e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-totalAmount">Total</Label>
                <Input
                  id="edit-totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => handleInputChange("totalAmount", e.target.value)}
                  placeholder="Auto-calculated"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-issueDate">Issue Date</Label>
                <Input
                  id="edit-issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleInputChange("issueDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger id="edit-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload Receipt</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !receiptFile && document.getElementById('edit-receipt-upload')?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                  ${receiptFile ? 'border-primary/50' : ''}
                  ${!receiptFile ? 'cursor-pointer hover:border-primary/50' : ''}
                `}
              >
                <input
                  type="file"
                  id="edit-receipt-upload"
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
                        document.getElementById('edit-receipt-upload')?.click();
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                ) : formData.receiptUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <p className="text-sm font-medium">Existing receipt</p>
                        <p className="text-xs text-muted-foreground">
                          Click to upload a new file
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById('edit-receipt-upload')?.click();
                      }}
                    >
                      Replace Receipt
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
                      onClick={() => document.getElementById('edit-receipt-upload')?.click()}
                    >
                      Browse files
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Additional notes about the invoice..."
                rows={3}
              />
            </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      resetForm();
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveInvoice} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Invoice"
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

export default Invoices;
