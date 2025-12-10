"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Trash2, Plus, Building2, Users, Edit2 } from "lucide-react";
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

const SiteEmployeeAllocations = () => {
  const [allocations, setAllocations] = useState<SiteEmployeeAllocation[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredAllocations = allocations.filter((allocation) => {
    const query = searchQuery.toLowerCase();
    return (
      allocation.siteName.toLowerCase().includes(query) ||
      allocation.employeeName.toLowerCase().includes(query) ||
      allocation.actualWorkingTime.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading allocations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Employee Allocations</h1>
          <p className="text-muted-foreground mt-1">
            Manage employee assignments to sites
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Allocation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Allocations</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search allocations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAllocations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No allocations found</p>
              <p className="text-sm mt-1">
                {searchQuery ? "Try a different search term" : "Add your first allocation to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Site</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee #</TableHead>
                    <TableHead>Working Time</TableHead>
                    <TableHead>Extra Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {allocation.siteName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {allocation.employeeName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">#{allocation.employeeNumber}</Badge>
                      </TableCell>
                      <TableCell>{allocation.actualWorkingTime || "-"}</TableCell>
                      <TableCell>
                        {allocation.hasExtraTime && allocation.extraTime ? (
                          <div className="flex flex-col">
                            <span className="text-sm">{allocation.extraTime}</span>
                            {allocation.extraTimeDay && (
                              <span className="text-xs text-muted-foreground">
                                {allocation.extraTimeDay}
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(allocation)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingAllocationId(allocation.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Site Employee Allocation</DialogTitle>
            <DialogDescription>
              Assign an employee to a site with working time details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site *</Label>
                <Select
                  value={formData.siteId}
                  onValueChange={(value) => setFormData({ ...formData, siteId: value })}
                >
                  <SelectTrigger>
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
                <Label>Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Number</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.employeeNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeNumber: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Working Time</Label>
                <Input
                  placeholder="e.g., 3 Hours, 3.5 Hours"
                  value={formData.actualWorkingTime}
                  onChange={(e) => setFormData({ ...formData, actualWorkingTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasExtraTime"
                checked={formData.hasExtraTime}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasExtraTime: checked === true })
                }
              />
              <Label htmlFor="hasExtraTime" className="cursor-pointer">
                Employee works extra time
              </Label>
            </div>
            {formData.hasExtraTime && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Extra Time</Label>
                  <Input
                    placeholder="e.g., 30 minutes, 1 hour"
                    value={formData.extraTime}
                    onChange={(e) => setFormData({ ...formData, extraTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Extra Time Day</Label>
                  <Select
                    value={formData.extraTimeDay}
                    onValueChange={(value) => setFormData({ ...formData, extraTimeDay: value })}
                  >
                    <SelectTrigger>
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
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes or conditions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddAllocation} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Allocation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Allocation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Site Employee Allocation</DialogTitle>
            <DialogDescription>
              Update allocation details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Site</Label>
                <Input
                  value={sites.find((s) => s.id === formData.siteId)?.name || ""}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Input
                  value={employees.find((e) => e.id === formData.employeeId)?.name || ""}
                  disabled
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee Number</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.employeeNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeNumber: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Working Time</Label>
                <Input
                  placeholder="e.g., 3 Hours, 3.5 Hours"
                  value={formData.actualWorkingTime}
                  onChange={(e) => setFormData({ ...formData, actualWorkingTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="editHasExtraTime"
                checked={formData.hasExtraTime}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasExtraTime: checked === true })
                }
              />
              <Label htmlFor="editHasExtraTime" className="cursor-pointer">
                Employee works extra time
              </Label>
            </div>
            {formData.hasExtraTime && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Extra Time</Label>
                  <Input
                    placeholder="e.g., 30 minutes, 1 hour"
                    value={formData.extraTime}
                    onChange={(e) => setFormData({ ...formData, extraTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Extra Time Day</Label>
                  <Select
                    value={formData.extraTimeDay}
                    onValueChange={(value) => setFormData({ ...formData, extraTimeDay: value })}
                  >
                    <SelectTrigger>
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
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes or conditions..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setEditingAllocationId(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleEditAllocation} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Allocation"
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
              This action cannot be undone. This will permanently delete the allocation.
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
