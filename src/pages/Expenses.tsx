"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Loader2, Trash2, Edit2, Check, X, Receipt, Clock, FileText } from "lucide-react";
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
import { Expense, ExpenseCategory, PaymentMethod } from "@/types/financial";
import { getAllExpenses, addExpense, updateExpense, deleteExpense, queryExpenses } from "@/lib/firebase/expenses";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const categoryLabels: Record<ExpenseCategory, string> = {
  office_supplies: "Office Supplies",
  equipment: "Equipment",
  travel: "Travel",
  utilities: "Utilities",
  rent: "Rent",
  marketing: "Marketing",
  professional_services: "Professional Services",
  insurance: "Insurance",
  maintenance: "Maintenance",
  other: "Other",
};

const Expenses = () => {
  const [searchValue, setSearchValue] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const rowsPerPage = 10;
  const { userData } = useAuth();
  const isAdmin = userData?.role === "admin" || userData?.isAdmin;

  const [formData, setFormData] = useState({
    category: "other" as ExpenseCategory,
    description: "",
    amount: "",
    date: "",
    paymentMethod: "bank_transfer" as PaymentMethod,
    vendor: "",
    receiptUrl: "",
    notes: "",
  });

  // Load expenses from Firebase
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        setIsLoading(true);
        const fetchedExpenses = await getAllExpenses();
        setExpenses(fetchedExpenses);
      } catch (error) {
        console.error("Error loading expenses:", error);
        toast.error("Failed to load expenses. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, []);

  const resetForm = () => {
    setFormData({
      category: "other",
      description: "",
      amount: "",
      date: "",
      paymentMethod: "bank_transfer",
      vendor: "",
      receiptUrl: "",
      notes: "",
    });
    setEditingExpenseId(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      vendor: expense.vendor || "",
      receiptUrl: expense.receiptUrl || "",
      notes: expense.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteExpense = (expense: Expense) => {
    setDeletingExpenseId(expense.id);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveExpense = async () => {
    if (!formData.description || !formData.amount || !formData.date) {
      toast.error("Please fill in required fields (Description, Amount, Date)");
      return;
    }

    try {
      setIsSaving(true);

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, {
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          vendor: formData.vendor || undefined,
          receiptUrl: formData.receiptUrl || undefined,
          notes: formData.notes || undefined,
        });
        toast.success("Expense updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        await addExpense({
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          vendor: formData.vendor || undefined,
          receiptUrl: formData.receiptUrl || undefined,
          notes: formData.notes || undefined,
          status: "pending",
        });
        toast.success("Expense added successfully!");
        setIsAddDialogOpen(false);
      }

      // Reload expenses
      const fetchedExpenses = await getAllExpenses();
      setExpenses(fetchedExpenses);
      resetForm();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(`Failed to ${editingExpenseId ? 'update' : 'add'} expense. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can approve expenses");
      return;
    }

    try {
      await updateExpense(expenseId, {
        status: "approved",
        approvedBy: userData?.uid || "",
        approvedAt: new Date().toISOString(),
      });
      toast.success("Expense approved successfully!");
      const fetchedExpenses = await getAllExpenses();
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Error approving expense:", error);
      toast.error("Failed to approve expense. Please try again.");
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    if (!isAdmin) {
      toast.error("Only admins can reject expenses");
      return;
    }

    try {
      await updateExpense(expenseId, {
        status: "rejected",
      });
      toast.success("Expense rejected");
      const fetchedExpenses = await getAllExpenses();
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Error rejecting expense:", error);
      toast.error("Failed to reject expense. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpenseId) return;

    try {
      await deleteExpense(deletingExpenseId);
      const fetchedExpenses = await getAllExpenses();
      setExpenses(fetchedExpenses);
      toast.success("Expense deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingExpenseId(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense. Please try again.");
    }
  };

  const handleAddExpense = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      (expense.vendor && expense.vendor.toLowerCase().includes(searchValue.toLowerCase())) ||
      expense.category.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, statusFilter, categoryFilter]);

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingAmount = filteredExpenses
    .filter((exp) => exp.status === "pending")
    .reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-background border border-orange-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Expenses
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Track and manage business expenses efficiently</p>
          </div>
          <Button 
            onClick={handleAddExpense} 
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-blue-400/30 transition-colors"></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Expenses</CardTitle>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-2">
              ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardHeader>
          <CardContent className="bg-blue-50/50 dark:bg-blue-950/20 rounded-b-2xl px-6 py-4 border-t border-blue-200 dark:border-blue-900/50">
            <p className="text-xs text-muted-foreground font-medium">All expense records</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-2 border-amber-200 dark:border-amber-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-amber-400/30 transition-colors"></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Pending Approval</CardTitle>
            <div className="text-3xl font-bold text-amber-700 dark:text-amber-400 mt-2">
              ${pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardHeader>
          <CardContent className="bg-amber-50/50 dark:bg-amber-950/20 rounded-b-2xl px-6 py-4 border-t border-amber-200 dark:border-amber-900/50">
            <p className="text-xs text-muted-foreground font-medium">Awaiting admin approval</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-2 border-purple-200 dark:border-purple-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-purple-400/30 transition-colors"></div>
          <CardHeader className="relative px-6 pt-6">
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Records</CardTitle>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400 mt-2">
              {filteredExpenses.length}
            </div>
          </CardHeader>
          <CardContent className="bg-purple-50/50 dark:bg-purple-950/20 rounded-b-2xl px-6 py-4 border-t border-purple-200 dark:border-purple-900/50">
            <p className="text-xs text-muted-foreground font-medium">Expense entries</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-muted/30 border-b-2">
          <div>
            <CardTitle className="text-xl font-bold">Expense List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">View and manage all expense records</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, vendor, or category..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/5 border-b-2">
                  <TableHead className="min-w-[120px] font-bold text-foreground">Date</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-foreground">Description</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-foreground">Category</TableHead>
                  <TableHead className="min-w-[100px] font-bold text-foreground">Amount</TableHead>
                  <TableHead className="min-w-[120px] font-bold text-foreground">Vendor</TableHead>
                  <TableHead className="min-w-[100px] font-bold text-foreground">Status</TableHead>
                  <TableHead className="min-w-[150px] font-bold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading expenses...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExpenses.map((expense) => (
                    <TableRow 
                      key={expense.id}
                      className="hover:bg-gradient-to-r hover:from-orange-500/5 hover:to-transparent transition-all duration-200 border-b"
                    >
                      <TableCell>
                        <span className="text-sm">{expense.date}</span>
                      </TableCell>
                      <TableCell className="font-semibold">{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[expense.category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-blue-600 dark:text-blue-400">
                        ${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {expense.vendor ? (
                          <span className="text-sm">{expense.vendor}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            expense.status === "approved"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                              : expense.status === "rejected"
                              ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          }
                        >
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpense(expense)}
                            className="h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
                          >
                            <Edit2 className="h-4 w-4 text-primary" />
                          </Button>
                          {isAdmin && expense.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApproveExpense(expense.id)}
                                className="h-8 w-8 p-0 text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-all duration-200"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectExpense(expense.id)}
                                className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense)}
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

          {filteredExpenses.length > 0 && totalPages > 1 && (
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

      {/* Add/Edit Expense Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingExpenseId ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>
              {editingExpenseId ? "Update the expense details." : "Add a new expense to track."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter expense description"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Vendor or supplier name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptUrl">Receipt URL</Label>
              <Input
                id="receiptUrl"
                value={formData.receiptUrl}
                onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveExpense} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingExpenseId ? (
                "Update Expense"
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingExpenseId(null)}>Cancel</AlertDialogCancel>
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

export default Expenses;




