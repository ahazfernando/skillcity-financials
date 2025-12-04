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
        setEmployees(actualEmployees);
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Employees Standard Time Allocation for Sites</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employee allocations and hours for each site</p>
        </div>
        <Button onClick={handleAddAllocation} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Allocation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Site Allocations</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("card")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by site name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead className="w-[150px]">Employee #</TableHead>
                    <TableHead className="w-[200px]">Employee Name</TableHead>
                    <TableHead>Working Time</TableHead>
                    <TableHead className="w-[150px]">Extra Time</TableHead>
                    <TableHead>Extra Time Day</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => {
                    const siteAllocations = allocationsBySite[site.id] || [];
                    return siteAllocations.map((allocation, index) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">
                          {index === 0 && site.name}
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <Badge variant="secondary">Employee {allocation.employeeNumber}</Badge>
                        </TableCell>
                        <TableCell className="w-[200px]">{allocation.employeeName}</TableCell>
                        <TableCell>{allocation.actualWorkingTime || allocation.allocatedHours || "-"}</TableCell>
                        <TableCell className="w-[150px]">
                          {allocation.hasExtraTime && allocation.extraTime ? allocation.extraTime : "No Extra time"}
                        </TableCell>
                        <TableCell>
                          {allocation.hasExtraTime && allocation.extraTimeDay ? allocation.extraTimeDay : "-"}
                        </TableCell>
                        <TableCell>{allocation.notes || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAllocation(allocation)}
                              className="h-8 w-8 p-0 bg-primary/10 hover:bg-primary/20 border-primary/20"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAllocation(allocation)}
                              className="h-8 w-8 p-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 hover:text-destructive"
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
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{site.name}</CardTitle>
                            <Badge variant="outline">{siteAllocations.length} Employee{siteAllocations.length !== 1 ? "s" : ""}</Badge>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {siteAllocations.map((allocation) => (
                              <Card key={allocation.id} className="relative">
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      <Badge variant="secondary">Employee {allocation.employeeNumber}</Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleMoveEmployee(allocation, "up")}
                                        disabled={allocation.employeeNumber === 1}
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleMoveEmployee(allocation, "down")}
                                        disabled={allocation.employeeNumber === siteAllocations.length}
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div>
                                      <p className="font-semibold text-sm text-muted-foreground">Employee</p>
                                      <p className="font-medium">{allocation.employeeName}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-sm text-muted-foreground">Working Time</p>
                                      <p className="text-sm">{allocation.actualWorkingTime || allocation.allocatedHours || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-sm text-muted-foreground">Extra Time</p>
                                      <p className="text-sm">
                                        {allocation.hasExtraTime && allocation.extraTime ? (
                                          <>
                                            {allocation.extraTime}
                                            {allocation.extraTimeDay && ` on ${allocation.extraTimeDay}`}
                                          </>
                                        ) : (
                                          "No Extra time"
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-semibold text-sm text-muted-foreground">Notes</p>
                                      <p className="text-sm">{allocation.notes || "-"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditAllocation(allocation)}
                                      className="flex-1 bg-primary/10 hover:bg-primary/20 border-primary/20"
                                    >
                                      <Edit2 className="h-3 w-3 mr-1" />
                                      Update
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDeleteAllocation(allocation)}
                                      className="flex-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 hover:text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Remove
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
              <Label htmlFor="employee">Employee</Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((emp) => {
                      // Don't show employees already allocated to this site
                      if (!formData.siteId) return true;
                      return !allocations.some(
                        (a) => a.siteId === formData.siteId && a.employeeId === emp.id
                      );
                    })
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
              >
                <SelectTrigger id="edit-employee">
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

