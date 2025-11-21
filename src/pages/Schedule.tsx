"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Calendar, Clock, Loader2, Trash2, Edit2, Plus } from "lucide-react";
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
import { WorkHours, Employee, Site } from "@/types/financial";
import { 
  getAllWorkHours, 
  addWorkHours, 
  updateWorkHours, 
  deleteWorkHours,
  calculateHoursWorked,
  getWorkHoursByEmployeeAndDate,
} from "@/lib/firebase/workHours";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllSites } from "@/lib/firebase/sites";
import { toast } from "sonner";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

const Schedule = () => {
  const [searchValue, setSearchValue] = useState("");
  const [workHours, setWorkHours] = useState<WorkHours[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingWorkHoursId, setEditingWorkHoursId] = useState<string | null>(null);
  const [deletingWorkHoursId, setDeletingWorkHoursId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [formData, setFormData] = useState({
    employeeId: "",
    siteId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    notes: "",
  });

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedWorkHours, fetchedEmployees, fetchedSites] = await Promise.all([
          getAllWorkHours(),
          getAllEmployees(),
          getAllSites(),
        ]);
        setWorkHours(fetchedWorkHours);
        setEmployees(fetchedEmployees);
        setSites(fetchedSites);
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
      employeeId: "",
      siteId: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      notes: "",
    });
    setEditingWorkHoursId(null);
    setSelectedDate(new Date());
  };

  const handleEditWorkHours = (wh: WorkHours) => {
    setEditingWorkHoursId(wh.id);
    setFormData({
      employeeId: wh.employeeId,
      siteId: wh.siteId,
      date: wh.date,
      startTime: wh.startTime,
      endTime: wh.endTime,
      notes: wh.notes || "",
    });
    setSelectedDate(new Date(wh.date));
    setIsEditDialogOpen(true);
  };

  const handleDeleteWorkHours = (wh: WorkHours) => {
    setDeletingWorkHoursId(wh.id);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveWorkHours = async () => {
    if (!formData.employeeId || !formData.siteId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields (Employee, Site, Date, Start Time, End Time)");
      return;
    }

    // Validate time
    if (formData.startTime >= formData.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      setIsSaving(true);

      const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
      const selectedSite = sites.find(site => site.id === formData.siteId);

      if (!selectedEmployee || !selectedSite) {
        toast.error("Invalid employee or site selected");
        return;
      }

      const hoursWorked = calculateHoursWorked(formData.startTime, formData.endTime);

      if (editingWorkHoursId) {
        // Update existing work hours
        await updateWorkHours(editingWorkHoursId, {
          employeeId: formData.employeeId,
          employeeName: selectedEmployee.name,
          siteId: formData.siteId,
          siteName: selectedSite.name,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          hoursWorked,
          notes: formData.notes || undefined,
        });

        // Reload work hours
        const updatedWorkHours = await getAllWorkHours();
        setWorkHours(updatedWorkHours);
        
        toast.success("Work hours updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Check if work hours already exist for this employee on this date
        const existing = await getWorkHoursByEmployeeAndDate(formData.employeeId, formData.date);
        if (existing.length > 0) {
          toast.warning("Work hours already exist for this employee on this date. Please update the existing record.");
          return;
        }

        // Add new work hours
        await addWorkHours({
          employeeId: formData.employeeId,
          employeeName: selectedEmployee.name,
          siteId: formData.siteId,
          siteName: selectedSite.name,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          hoursWorked,
          notes: formData.notes || undefined,
        });

        // Reload work hours
        const updatedWorkHours = await getAllWorkHours();
        setWorkHours(updatedWorkHours);
        
        toast.success("Work hours added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving work hours:", error);
      toast.error(`Failed to ${editingWorkHoursId ? 'update' : 'add'} work hours. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWorkHoursId) return;

    try {
      await deleteWorkHours(deletingWorkHoursId);
      
      // Reload work hours
      const updatedWorkHours = await getAllWorkHours();
      setWorkHours(updatedWorkHours);
      
      toast.success("Work hours deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingWorkHoursId(null);
    } catch (error) {
      console.error("Error deleting work hours:", error);
      toast.error("Failed to delete work hours. Please try again.");
    }
  };

  const handleAddWorkHours = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const filteredWorkHours = workHours.filter(wh => {
    const searchLower = searchValue.toLowerCase();
    return (
      wh.employeeName.toLowerCase().includes(searchLower) ||
      wh.siteName.toLowerCase().includes(searchLower) ||
      wh.date.includes(searchLower)
    );
  });

  const activeEmployees = employees.filter(emp => emp.status === "active");
  const activeSites = sites.filter(site => site.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work Hours</h2>
          <p className="text-muted-foreground">Track daily work hours for cleaners at sites</p>
        </div>
        <Button onClick={handleAddWorkHours}>
          <Plus className="mr-2 h-4 w-4" />
          Add Work Hours
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Hours List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee, site, or date..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading work hours...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredWorkHours.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No work hours found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkHours.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell className="font-medium">
                        {new Date(wh.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{wh.employeeName}</TableCell>
                      <TableCell>{wh.siteName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {wh.startTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {wh.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{wh.hoursWorked} hrs</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {wh.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditWorkHours(wh)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkHours(wh)}
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
        </CardContent>
      </Card>

      {/* Add Work Hours Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Work Hours</DialogTitle>
            <DialogDescription>
              Record daily work hours for a cleaner at a site
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site">Site *</Label>
                <Select
                  value={formData.siteId}
                  onValueChange={(value) => setFormData({ ...formData, siteId: value })}
                >
                  <SelectTrigger id="site">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        setFormData({ ...formData, date: date.toISOString().split("T")[0] });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            {formData.startTime && formData.endTime && formData.startTime < formData.endTime && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm text-muted-foreground">Calculated Hours:</div>
                <div className="text-lg font-semibold">
                  {calculateHoursWorked(formData.startTime, formData.endTime)} hours
                </div>
              </div>
            )}

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
                resetForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveWorkHours} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Work Hours"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Work Hours Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Work Hours</DialogTitle>
            <DialogDescription>
              Update work hours for a cleaner at a site
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-employee">Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger id="edit-employee">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-site">Site *</Label>
                <Select
                  value={formData.siteId}
                  onValueChange={(value) => setFormData({ ...formData, siteId: value })}
                >
                  <SelectTrigger id="edit-site">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      if (date) {
                        setFormData({ ...formData, date: date.toISOString().split("T")[0] });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Start Time *</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">End Time *</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            {formData.startTime && formData.endTime && formData.startTime < formData.endTime && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm text-muted-foreground">Calculated Hours:</div>
                <div className="text-lg font-semibold">
                  {calculateHoursWorked(formData.startTime, formData.endTime)} hours
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
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
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveWorkHours} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Work Hours"
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
              This action cannot be undone. This will permanently delete the work hours record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingWorkHoursId(null)}>
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

export default Schedule;
