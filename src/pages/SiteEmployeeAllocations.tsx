"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, Trash2, Plus, ArrowUp, ArrowDown, GripVertical, Edit2, LayoutGrid, Table as TableIcon } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteEmployeeAllocation, Site, Employee } from "@/types/financial";
import { getAllAllocations, addAllocation, updateAllocation, deleteAllocation, reorderEmployeesForSite } from "@/lib/firebase/siteEmployeeAllocations";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SiteEmployeeAllocations = () => {
  const [searchValue, setSearchValue] = useState("");
  const [allocations, setAllocations] = useState<SiteEmployeeAllocation[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [deletingAllocationId, setDeletingAllocationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [formData, setFormData] = useState({
    siteId: "",
    employeeId: "",
    actualWorkingTime: "",
    hasExtraTime: false,
    extraTime: "",
    extraTimeDay: "",
    notes: "",
  });
  const [siteOpen, setSiteOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [selectedSiteDetails, setSelectedSiteDetails] = useState<Site | null>(null);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Load data from Firebase
  useEffect(() => {
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
        // Filter out clients - only show actual employees
        const actualEmployees = fetchedEmployees.filter(
          (emp) => !emp.type || emp.type === "employee"
        );
        // Sort employees alphabetically by name
        const sortedEmployees = actualEmployees.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setEmployees(sortedEmployees);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      siteId: "",
      employeeId: "",
      actualWorkingTime: "",
      hasExtraTime: false,
      extraTime: "",
      extraTimeDay: "",
      notes: "",
    });
    setEditingAllocationId(null);
    setSiteOpen(false);
    setEmployeeOpen(false);
    setEditEmployeeOpen(false);
    setSelectedSiteDetails(null);
  };

  const toggleSiteExpansion = (siteId: string) => {
    setExpandedSites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(siteId)) {
        newSet.delete(siteId);
      } else {
        newSet.add(siteId);
      }
      return newSet;
    });
  };

  const handleAddAllocation = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditAllocation = (allocation: SiteEmployeeAllocation) => {
    setEditingAllocationId(allocation.id);
    setFormData({
      siteId: allocation.siteId,
      employeeId: allocation.employeeId,
      actualWorkingTime: allocation.actualWorkingTime || "",
      hasExtraTime: allocation.hasExtraTime || false,
      extraTime: allocation.extraTime || "",
      extraTimeDay: allocation.extraTimeDay || "",
      notes: allocation.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteAllocation = (allocation: SiteEmployeeAllocation) => {
    setDeletingAllocationId(allocation.id);
    setIsDeleteDialogOpen(true);
  };

  const getNextEmployeeNumber = (siteId: string): number => {
    const siteAllocations = allocations.filter((a) => a.siteId === siteId);
    if (siteAllocations.length === 0) return 1;
    const maxNumber = Math.max(...siteAllocations.map((a) => a.employeeNumber));
    return maxNumber + 1;
  };

  const handleSaveAllocation = async () => {
    try {
      setIsSaving(true);

      const selectedSite = sites.find((s) => s.id === formData.siteId);
      const selectedEmployee = employees.find((e) => e.id === formData.employeeId);

      if (!selectedSite || !selectedEmployee) {
        toast.error("Please select a valid site and employee.");
        return;
      }

      if (editingAllocationId) {
        // Update existing allocation
        const existingAllocation = allocations.find((a) => a.id === editingAllocationId);
        if (!existingAllocation) return;

        await updateAllocation(editingAllocationId, {
          employeeId: formData.employeeId,
          employeeName: selectedEmployee.name,
          actualWorkingTime: formData.actualWorkingTime,
          hasExtraTime: formData.hasExtraTime,
          extraTime: formData.hasExtraTime ? (formData.extraTime || null) : null,
          extraTimeDay: formData.hasExtraTime ? (formData.extraTimeDay || null) : null,
          notes: formData.notes || null,
        });

        // Reload allocations
        const updatedAllocations = await getAllAllocations();
        setAllocations(updatedAllocations);

        toast.success("Allocation updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new allocation
        const employeeNumber = getNextEmployeeNumber(formData.siteId);

        await addAllocation({
          siteId: formData.siteId,
          siteName: selectedSite.name,
          employeeId: formData.employeeId,
          employeeName: selectedEmployee.name,
          employeeNumber,
          actualWorkingTime: formData.actualWorkingTime,
          hasExtraTime: formData.hasExtraTime,
          extraTime: formData.hasExtraTime ? formData.extraTime : undefined,
          extraTimeDay: formData.hasExtraTime ? formData.extraTimeDay : undefined,
          notes: formData.notes || undefined,
        });

        // Reload allocations
        const updatedAllocations = await getAllAllocations();
        setAllocations(updatedAllocations);

        toast.success("Allocation added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving allocation:", error);
      toast.error(`Failed to ${editingAllocationId ? "update" : "add"} allocation. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAllocationId) return;

    try {
      await deleteAllocation(deletingAllocationId);

      // Reload allocations
      const updatedAllocations = await getAllAllocations();
      setAllocations(updatedAllocations);

      toast.success("Allocation deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingAllocationId(null);
    } catch (error) {
      console.error("Error deleting allocation:", error);
      toast.error("Failed to delete allocation. Please try again.");
    }
  };

  const handleMoveEmployee = async (allocation: SiteEmployeeAllocation, direction: "up" | "down") => {
    try {
      const siteAllocations = allocations
        .filter((a) => a.siteId === allocation.siteId)
        .sort((a, b) => a.employeeNumber - b.employeeNumber);

      const currentIndex = siteAllocations.findIndex((a) => a.id === allocation.id);
      if (currentIndex === -1) return;

      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= siteAllocations.length) return;

      // Swap employee numbers
      const temp = siteAllocations[currentIndex].employeeNumber;
      siteAllocations[currentIndex].employeeNumber = siteAllocations[newIndex].employeeNumber;
      siteAllocations[newIndex].employeeNumber = temp;

      // Update both allocations
      await Promise.all([
        updateAllocation(siteAllocations[currentIndex].id, {
          employeeNumber: siteAllocations[currentIndex].employeeNumber,
        }),
        updateAllocation(siteAllocations[newIndex].id, {
          employeeNumber: siteAllocations[newIndex].employeeNumber,
        }),
      ]);

      // Reload allocations
      const updatedAllocations = await getAllAllocations();
      setAllocations(updatedAllocations);

      toast.success("Employee order updated!");
    } catch (error) {
      console.error("Error moving employee:", error);
      toast.error("Failed to reorder employee. Please try again.");
    }
  };

  // Group allocations by site
  const allocationsBySite = sites.reduce((acc, site) => {
    const siteAllocations = allocations
      .filter((a) => a.siteId === site.id)
      .sort((a, b) => a.employeeNumber - b.employeeNumber);
    if (siteAllocations.length > 0) {
      acc[site.id] = siteAllocations;
    }
    return acc;
  }, {} as Record<string, SiteEmployeeAllocation[]>);

  const filteredSites = sites.filter((site) => {
    if (!searchValue) return true;
    const siteNameMatch = site.name.toLowerCase().includes(searchValue.toLowerCase());
    const hasAllocations = allocationsBySite[site.id]?.length > 0;
    return siteNameMatch && hasAllocations;
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Employees Standard Time Allocation for Sites
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage employee allocations and hours for each site with precision</p>
          </div>
          <Button 
            onClick={handleAddAllocation} 
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Allocation
          </Button>
        </div>
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Site Allocations</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">View and manage employee time allocations</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="transition-all duration-200"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="transition-all duration-200"
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative mb-6 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by site name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 border-2 focus:border-primary transition-all duration-200"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading allocations...</span>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No sites with allocations found</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-xl border-2 overflow-hidden shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-primary/10 via-primary/5 to-muted/30 border-b-2">
                    <TableHead className="font-bold text-foreground">Site</TableHead>
                    <TableHead className="w-[150px] font-bold text-foreground">Employee #</TableHead>
                    <TableHead className="w-[200px] font-bold text-foreground">Employee Name</TableHead>
                    <TableHead className="font-bold text-foreground">Working Time</TableHead>
                    <TableHead className="w-[150px] font-bold text-foreground">Extra Time</TableHead>
                    <TableHead className="font-bold text-foreground">Extra Time Day</TableHead>
                    <TableHead className="font-bold text-foreground">Notes</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => {
                    const siteAllocations = allocationsBySite[site.id] || [];
                    return siteAllocations.map((allocation, index) => (
                      <TableRow 
                        key={allocation.id}
                        className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 border-b"
                      >
                        <TableCell className="font-semibold">
                          {index === 0 && (
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded bg-primary/10">
                                <GripVertical className="h-4 w-4 text-primary" />
                              </div>
                              <span>{site.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <Badge variant="secondary" className="font-semibold">
                            #{allocation.employeeNumber}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[200px] font-medium">{allocation.employeeName}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium text-sm">
                            {allocation.actualWorkingTime || allocation.allocatedHours || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="w-[150px]">
                          {allocation.hasExtraTime && allocation.extraTime ? (
                            <span className="px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-medium text-sm">
                              {allocation.extraTime}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">No Extra time</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {allocation.hasExtraTime && allocation.extraTimeDay ? (
                            <Badge variant="outline" className="text-xs">
                              {allocation.extraTimeDay}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {allocation.notes || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAllocation(allocation)}
                              className="h-8 w-8 p-0 bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/50 transition-all duration-200"
                            >
                              <Edit2 className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAllocation(allocation)}
                              className="h-8 w-8 p-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30 hover:border-destructive/50 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSites.map((site) => {
                const siteAllocations = allocationsBySite[site.id] || [];
                if (siteAllocations.length === 0) return null;

                const isExpanded = expandedSites.has(site.id);

                return (
                  <Collapsible
                    key={site.id}
                    open={isExpanded}
                    onOpenChange={() => toggleSiteExpansion(site.id)}
                  >
                    <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-lg">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10 transition-all duration-300 bg-gradient-to-r from-muted/30 to-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <GripVertical className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg font-bold">{site.name}</CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {siteAllocations.length} Employee{siteAllocations.length !== 1 ? "s" : ""} allocated
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
                              {siteAllocations.length} {siteAllocations.length !== 1 ? "Employees" : "Employee"}
                            </Badge>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-6 bg-gradient-to-b from-background to-muted/20">
                          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {siteAllocations.map((allocation) => (
                              <Card 
                                key={allocation.id} 
                                className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl group bg-gradient-to-br from-card to-card/95"
                              >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                                <CardContent className="pt-6 relative z-10">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <div className="p-1.5 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <GripVertical className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                      <Badge variant="secondary" className="font-semibold">
                                        #{allocation.employeeNumber}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-primary/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveEmployee(allocation, "up");
                                        }}
                                        disabled={allocation.employeeNumber === 1}
                                      >
                                        <ArrowUp className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-primary/10"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMoveEmployee(allocation, "down");
                                        }}
                                        disabled={allocation.employeeNumber === siteAllocations.length}
                                      >
                                        <ArrowDown className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Employee</p>
                                      <p className="font-semibold text-base">{allocation.employeeName}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Working Time</p>
                                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        {allocation.actualWorkingTime || allocation.allocatedHours || "-"}
                                      </p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                                      <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Extra Time</p>
                                      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                        {allocation.hasExtraTime && allocation.extraTime ? (
                                          <>
                                            {allocation.extraTime}
                                            {allocation.extraTimeDay && (
                                              <span className="block text-xs mt-1 text-amber-600 dark:text-amber-400">
                                                on {allocation.extraTimeDay}
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-muted-foreground">No Extra time</span>
                                        )}
                                      </p>
                                    </div>
                                    {allocation.notes && (
                                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Notes</p>
                                        <p className="text-sm">{allocation.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/50">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAllocation(allocation);
                                      }}
                                      className="flex-1 bg-primary/10 hover:bg-primary/20 border-primary/30 hover:border-primary/50 text-primary font-medium transition-all duration-200"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAllocation(allocation);
                                      }}
                                      className="flex-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30 hover:border-destructive/50 font-medium transition-all duration-200"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                      Delete
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Allocation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/f07a54958dadfd64da3702635ce12deb.jpg"
                alt="Add Employee Allocation"
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
                    Add employee allocation
                  </h2>
                  <p className="text-sm text-white">
                    Assign an employee to a site with their allocated hours. Employee number will be assigned automatically.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Add Employee Allocation</DialogTitle>
                  <DialogDescription>
                    Assign an employee to a site with their allocated hours. Employee number will be assigned automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Popover open={siteOpen} onOpenChange={setSiteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={siteOpen}
                    className="w-full justify-between"
                  >
                    {formData.siteId
                      ? sites.find((site) => site.id === formData.siteId)?.name
                      : "Select a site..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search sites..." />
                    <CommandList>
                      <CommandEmpty>No site found.</CommandEmpty>
                      <CommandGroup>
                        {sites.map((site) => (
                          <CommandItem
                            key={site.id}
                            value={site.name}
                            onSelect={() => {
                              setFormData({ ...formData, siteId: site.id });
                              setSiteOpen(false);
                              // Use site from already loaded sites array
                              const siteFromArray = sites.find(s => s.id === site.id);
                              if (siteFromArray) {
                                setSelectedSiteDetails(siteFromArray);
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.siteId === site.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {site.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Display Work Rates when site is selected */}
            {selectedSiteDetails && formData.siteId && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Site Work Rates</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Hourly Rate</p>
                        <p className="font-medium">
                          {selectedSiteDetails.hourlyRate 
                            ? `$${selectedSiteDetails.hourlyRate.toLocaleString()}` 
                            : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Day Rate</p>
                        <p className="font-medium">
                          {selectedSiteDetails.dayRate 
                            ? `$${selectedSiteDetails.dayRate.toLocaleString()}` 
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                    {selectedSiteDetails.invoicingWorkingHours && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Invoicing Working Hours</p>
                        <p className="font-medium">{selectedSiteDetails.invoicingWorkingHours} hours</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeeOpen}
                    className="w-full justify-between"
                  >
                    {formData.employeeId
                      ? employees.find((emp) => emp.id === formData.employeeId)?.name
                      : "Select an employee..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees
                          .filter((emp) => {
                            // Don't show employees already allocated to this site
                            if (!formData.siteId) return true;
                            return !allocations.some(
                              (a) => a.siteId === formData.siteId && a.employeeId === emp.id
                            );
                          })
                          .map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.name}
                              onSelect={() => {
                                setFormData({ ...formData, employeeId: employee.id });
                                setEmployeeOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.employeeId === employee.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {employee.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="actualWorkingTime">Actual Working Time</Label>
              <Input
                id="actualWorkingTime"
                value={formData.actualWorkingTime}
                onChange={(e) => setFormData({ ...formData, actualWorkingTime: e.target.value })}
                placeholder="e.g., 3 Hours, 3.5 Hours"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hasExtraTime">Working Extra Time?</Label>
              <Select
                value={formData.hasExtraTime ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, hasExtraTime: value === "yes" })}
              >
                <SelectTrigger id="hasExtraTime">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.hasExtraTime && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="extraTime">Extra Time</Label>
                  <Input
                    id="extraTime"
                    value={formData.extraTime}
                    onChange={(e) => setFormData({ ...formData, extraTime: e.target.value })}
                    placeholder="e.g., 30 minutes, 1 hour"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraTimeDay">Day of Week</Label>
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
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., If he works less than 3 Hours a deduction will be made"
                rows={3}
              />
            </div>
            {formData.siteId && (
              <div className="text-sm text-muted-foreground">
                This employee will be assigned as Employee {getNextEmployeeNumber(formData.siteId)}
              </div>
            )}
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
                  <Button onClick={handleSaveAllocation} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Allocation"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Allocation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/f07a54958dadfd64da3702635ce12deb.jpg"
                alt="Edit Employee Allocation"
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
                    Edit employee allocation
                  </h2>
                  <p className="text-sm text-white">
                    Update the employee allocation details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Edit Employee Allocation</DialogTitle>
                  <DialogDescription>
                    Update the employee allocation details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee">Employee</Label>
              <Popover open={editEmployeeOpen} onOpenChange={setEditEmployeeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editEmployeeOpen}
                    className="w-full justify-between"
                  >
                    {formData.employeeId
                      ? employees.find((emp) => emp.id === formData.employeeId)?.name
                      : "Select an employee..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees..." />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((employee) => (
                          <CommandItem
                            key={employee.id}
                            value={employee.name}
                            onSelect={() => {
                              setFormData({ ...formData, employeeId: employee.id });
                              setEditEmployeeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.employeeId === employee.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {employee.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-actualWorkingTime">Actual Working Time</Label>
              <Input
                id="edit-actualWorkingTime"
                value={formData.actualWorkingTime}
                onChange={(e) => setFormData({ ...formData, actualWorkingTime: e.target.value })}
                placeholder="e.g., 3 Hours, 3.5 Hours"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hasExtraTime">Working Extra Time?</Label>
              <Select
                value={formData.hasExtraTime ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, hasExtraTime: value === "yes" })}
              >
                <SelectTrigger id="edit-hasExtraTime">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.hasExtraTime && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-extraTime">Extra Time</Label>
                  <Input
                    id="edit-extraTime"
                    value={formData.extraTime}
                    onChange={(e) => setFormData({ ...formData, extraTime: e.target.value })}
                    placeholder="e.g., 30 minutes, 1 hour"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-extraTimeDay">Day of Week</Label>
                  <Select
                    value={formData.extraTimeDay}
                    onValueChange={(value) => setFormData({ ...formData, extraTimeDay: value })}
                  >
                    <SelectTrigger id="edit-extraTimeDay">
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
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g., If he works less than 3 Hours a deduction will be made"
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
                  <Button onClick={handleSaveAllocation} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Allocation"
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
              This action cannot be undone. This will permanently delete the employee allocation from the site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAllocationId(null)}>
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

export default SiteEmployeeAllocations;

