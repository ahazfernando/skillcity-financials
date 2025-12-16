"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Loader2, 
  Trash2, 
  Plus, 
  Building2, 
  Users, 
  Edit2, 
  Clock,
  TrendingUp,
  FileText,
  Filter,
  Download,
  MoreVertical,
  LayoutGrid,
  Table as TableIcon,
  MapPin,
  Calendar
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteEmployeeAllocation, Site, Employee } from "@/types/financial";
import { 
  getAllAllocations, 
  addAllocation, 
  updateAllocation, 
  deleteAllocation 
} from "@/lib/firebase/siteEmployeeAllocations";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const SiteEmployeeAllocations = () => {
  const [allocations, setAllocations] = useState<SiteEmployeeAllocation[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [deletingAllocationId, setDeletingAllocationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    siteId: "",
    employeeId: "",
    employeeNumber: 1,
    actualWorkingTime: "",
    hasExtraTime: false,
    extraTime: "",
    extraTimeDay: "",
    notes: "",
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [fetchedAllocations, fetchedSites, fetchedEmployees] = await Promise.all([
        getAllAllocations(),
        getAllSites(),
        getAllEmployees(),
      ]);
      setAllocations(fetchedAllocations);
      setSites(fetchedSites);
      setEmployees(fetchedEmployees);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load allocations");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAllocations = allocations.length;
    const uniqueSites = new Set(allocations.map(a => a.siteId)).size;
    const uniqueEmployees = new Set(allocations.map(a => a.employeeId)).size;
    const withExtraTime = allocations.filter(a => a.hasExtraTime).length;
    
    return {
      totalAllocations,
      uniqueSites,
      uniqueEmployees,
      withExtraTime,
      extraTimePercentage: totalAllocations > 0 ? Math.round((withExtraTime / totalAllocations) * 100) : 0,
    };
  }, [allocations]);

  const handleAddAllocation = async () => {
    if (!formData.siteId || !formData.employeeId) {
      toast.error("Please select both a site and an employee");
      return;
    }

    try {
      setIsSaving(true);
      const selectedSite = sites.find((s) => s.id === formData.siteId);
      const selectedEmployee = employees.find((e) => e.id === formData.employeeId);

      if (!selectedSite || !selectedEmployee) {
        toast.error("Invalid site or employee selected");
        return;
      }

      await addAllocation({
        siteId: formData.siteId,
        siteName: selectedSite.name,
        employeeId: formData.employeeId,
        employeeName: selectedEmployee.name,
        employeeNumber: formData.employeeNumber,
        actualWorkingTime: formData.actualWorkingTime,
        hasExtraTime: formData.hasExtraTime,
        extraTime: formData.extraTime || undefined,
        extraTimeDay: formData.extraTimeDay || undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Allocation added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error adding allocation:", error);
      toast.error("Failed to add allocation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAllocation = async () => {
    if (!editingAllocationId) return;

    try {
      setIsSaving(true);
      const allocation = allocations.find((a) => a.id === editingAllocationId);
      if (!allocation) {
        toast.error("Allocation not found");
        return;
      }

      await updateAllocation(editingAllocationId, {
        employeeNumber: formData.employeeNumber,
        actualWorkingTime: formData.actualWorkingTime,
        hasExtraTime: formData.hasExtraTime,
        extraTime: formData.extraTime || undefined,
        extraTimeDay: formData.extraTimeDay || undefined,
        notes: formData.notes || undefined,
      });

      toast.success("Allocation updated successfully");
      setIsEditDialogOpen(false);
      setEditingAllocationId(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error("Error updating allocation:", error);
      toast.error("Failed to update allocation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocationId) return;

    try {
      await deleteAllocation(deletingAllocationId);
      toast.success("Allocation deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingAllocationId(null);
      loadData();
    } catch (error) {
      console.error("Error deleting allocation:", error);
      toast.error("Failed to delete allocation");
    }
  };

  const resetForm = () => {
    setFormData({
      siteId: "",
      employeeId: "",
      employeeNumber: 1,
      actualWorkingTime: "",
      hasExtraTime: false,
      extraTime: "",
      extraTimeDay: "",
      notes: "",
    });
  };

  const openEditDialog = (allocation: SiteEmployeeAllocation) => {
    setEditingAllocationId(allocation.id);
    setFormData({
      siteId: allocation.siteId,
      employeeId: allocation.employeeId,
      employeeNumber: allocation.employeeNumber,
      actualWorkingTime: allocation.actualWorkingTime,
      hasExtraTime: allocation.hasExtraTime,
      extraTime: allocation.extraTime || "",
      extraTimeDay: allocation.extraTimeDay || "",
      notes: allocation.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const filteredAllocations = useMemo(() => {
    return allocations.filter((allocation) => {
      const matchesSearch = 
        allocation.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allocation.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        allocation.actualWorkingTime.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSite = siteFilter === "all" || allocation.siteId === siteFilter;
      
      return matchesSearch && matchesSite;
    });
  }, [allocations, searchQuery, siteFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading allocations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Site Employee Allocations</h1>
          <p className="text-muted-foreground">
            Manage and track employee assignments across sites with detailed time allocation
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Allocation
        </Button>
      </div>

      {/* Statistics Cards with Gradients */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-blue-600/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocations</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-500/30">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{stats.totalAllocations}</div>
            <p className="text-xs text-muted-foreground">
              Active assignments
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sites Covered</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30">
              <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{stats.uniqueSites}</div>
            <p className="text-xs text-muted-foreground">
              Unique locations
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-fuchsia-500/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees Assigned</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 backdrop-blur-sm border border-purple-500/30">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{stats.uniqueEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-yellow-500/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-500/20 to-transparent rounded-bl-full"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extra Time</CardTitle>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 backdrop-blur-sm border border-orange-500/30">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold mb-1">{stats.withExtraTime}</div>
            <p className="text-xs text-muted-foreground">
              {stats.extraTimePercentage}% of allocations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Data Table Card */}
      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-muted/30 border-b-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Allocation Overview</CardTitle>
              <CardDescription className="mt-1">
                View and manage all site-employee assignments
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border">
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("card")}
                  className="gap-2"
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Card</span>
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="gap-2"
                >
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
              </div>

              {/* Site Filter */}
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative w-full sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search allocations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredAllocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No allocations found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                {searchQuery || siteFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by adding your first site-employee allocation"}
              </p>
              {!searchQuery && siteFilter === "all" && (
                <Button onClick={() => setIsAddDialogOpen(true)} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Allocation
                </Button>
              )}
            </div>
          ) : viewMode === "card" ? (
            // Card View
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAllocations.map((allocation, index) => {
                const gradientColors = [
                  "from-blue-500/20 via-indigo-500/15 to-purple-500/20",
                  "from-emerald-500/20 via-teal-500/15 to-cyan-500/20",
                  "from-rose-500/20 via-pink-500/15 to-fuchsia-500/20",
                  "from-amber-500/20 via-orange-500/15 to-yellow-500/20",
                  "from-violet-500/20 via-purple-500/15 to-indigo-500/20",
                  "from-green-500/20 via-emerald-500/15 to-teal-500/20",
                ];
                const gradientColor = gradientColors[index % gradientColors.length];
                
                return (
                  <Card
                    key={allocation.id}
                    className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group`}
                  >
                    {/* Decorative gradient overlay */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-white/5 to-transparent rounded-tr-full"></div>
                    
                    <CardHeader className="relative pb-3">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-500/30">
                              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <CardTitle className="text-lg font-bold line-clamp-1 group-hover:text-primary transition-colors">
                              {allocation.siteName}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/20 backdrop-blur-sm border border-purple-500/30">
                              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground line-clamp-1">
                              {allocation.employeeName}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0 bg-background/50 backdrop-blur-sm font-mono">
                          #{allocation.employeeNumber}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="relative space-y-3 pt-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">Working Time</p>
                            <p className="text-sm font-semibold">{allocation.actualWorkingTime || "-"}</p>
                          </div>
                        </div>
                        
                        {allocation.hasExtraTime && allocation.extraTime && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 backdrop-blur-sm border border-orange-500/20">
                            <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground">Extra Time</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-xs">
                                  {allocation.extraTime}
                                </Badge>
                                {allocation.extraTimeDay && (
                                  <span className="text-xs text-muted-foreground">
                                    {allocation.extraTimeDay}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {allocation.notes && (
                          <div className="p-2 rounded-lg bg-background/40 backdrop-blur-sm border border-border/50">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {allocation.notes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="flex items-center justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                              <MoreVertical className="h-4 w-4" />
                              <span className="hidden sm:inline">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(allocation)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingAllocationId(allocation.id);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Table View
            <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Site</TableHead>
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Employee #</TableHead>
                    <TableHead className="font-semibold">Working Time</TableHead>
                    <TableHead className="font-semibold">Extra Time</TableHead>
                    <TableHead className="font-semibold w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllocations.map((allocation, index) => (
                    <TableRow 
                      key={allocation.id} 
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/30">
                            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-medium">{allocation.siteName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/30">
                            <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <div className="font-medium">{allocation.employeeName}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">
                          #{allocation.employeeNumber}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{allocation.actualWorkingTime || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {allocation.hasExtraTime && allocation.extraTime ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                              {allocation.extraTime}
                            </Badge>
                            {allocation.extraTimeDay && (
                              <div className="text-xs text-muted-foreground">
                                {allocation.extraTimeDay}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(allocation)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setDeletingAllocationId(allocation.id);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Allocation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Site Employee Allocation</DialogTitle>
            <DialogDescription>
              Create a new assignment between an employee and a site with detailed time tracking
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site" className="text-sm font-medium">
                  Site <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.siteId}
                  onValueChange={(value) => setFormData({ ...formData, siteId: value })}
                >
                  <SelectTrigger id="site">
                    <SelectValue placeholder="Select a site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee" className="text-sm font-medium">
                  Employee <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber" className="text-sm font-medium">
                  Employee Number
                </Label>
                <Input
                  id="employeeNumber"
                  type="number"
                  min="1"
                  value={formData.employeeNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeNumber: parseInt(e.target.value) || 1 })
                  }
                  placeholder="e.g., 1, 2, 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workingTime" className="text-sm font-medium">
                  Working Time
                </Label>
                <Input
                  id="workingTime"
                  placeholder="e.g., 3 Hours, 3.5 Hours"
                  value={formData.actualWorkingTime}
                  onChange={(e) => setFormData({ ...formData, actualWorkingTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="hasExtraTime"
                checked={formData.hasExtraTime}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasExtraTime: checked === true })
                }
              />
              <Label htmlFor="hasExtraTime" className="cursor-pointer text-sm font-medium">
                Employee works extra time
              </Label>
            </div>

            {formData.hasExtraTime && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="extraTime" className="text-sm font-medium">
                    Extra Time Duration
                  </Label>
                  <Input
                    id="extraTime"
                    placeholder="e.g., 30 minutes, 1 hour"
                    value={formData.extraTime}
                    onChange={(e) => setFormData({ ...formData, extraTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraTimeDay" className="text-sm font-medium">
                    Extra Time Day
                  </Label>
                  <Select
                    value={formData.extraTimeDay}
                    onValueChange={(value) => setFormData({ ...formData, extraTimeDay: value })}
                  >
                    <SelectTrigger id="extraTimeDay">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Enter any additional notes, conditions, or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Add any relevant information about this allocation
              </p>
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddAllocation} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Allocation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Allocation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Site Employee Allocation</DialogTitle>
            <DialogDescription>
              Update allocation details and time tracking information
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Site</Label>
                <Input
                  value={sites.find((s) => s.id === formData.siteId)?.name || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Employee</Label>
                <Input
                  value={employees.find((e) => e.id === formData.employeeId)?.name || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editEmployeeNumber" className="text-sm font-medium">
                  Employee Number
                </Label>
                <Input
                  id="editEmployeeNumber"
                  type="number"
                  min="1"
                  value={formData.employeeNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeNumber: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editWorkingTime" className="text-sm font-medium">
                  Working Time
                </Label>
                <Input
                  id="editWorkingTime"
                  placeholder="e.g., 3 Hours, 3.5 Hours"
                  value={formData.actualWorkingTime}
                  onChange={(e) => setFormData({ ...formData, actualWorkingTime: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/30">
              <Checkbox
                id="editHasExtraTime"
                checked={formData.hasExtraTime}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasExtraTime: checked === true })
                }
              />
              <Label htmlFor="editHasExtraTime" className="cursor-pointer text-sm font-medium">
                Employee works extra time
              </Label>
            </div>

            {formData.hasExtraTime && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="editExtraTime" className="text-sm font-medium">
                    Extra Time Duration
                  </Label>
                  <Input
                    id="editExtraTime"
                    placeholder="e.g., 30 minutes, 1 hour"
                    value={formData.extraTime}
                    onChange={(e) => setFormData({ ...formData, extraTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editExtraTimeDay" className="text-sm font-medium">
                    Extra Time Day
                  </Label>
                  <Select
                    value={formData.extraTimeDay}
                    onValueChange={(value) => setFormData({ ...formData, extraTimeDay: value })}
                  >
                    <SelectTrigger id="editExtraTimeDay">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="editNotes" className="text-sm font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="editNotes"
                placeholder="Enter any additional notes, conditions, or special instructions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <Separator />
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingAllocationId(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditAllocation} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4" />
                  Update Allocation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Allocation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the site-employee allocation
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeletingAllocationId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllocation}
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

export default SiteEmployeeAllocations;
