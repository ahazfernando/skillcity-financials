"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, MapPin, Plus, Edit2, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { EmployeeLocation, Employee, Site } from "@/types/financial";
import {
  getAllEmployeeLocations,
  addEmployeeLocation,
  updateEmployeeLocation,
  deleteEmployeeLocation,
  approveEmployeeLocation,
  rejectEmployeeLocation,
} from "@/lib/firebase/employeeLocations";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllSites } from "@/lib/firebase/sites";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isWithinRadius } from "@/lib/location";

const EmployeeLocations = () => {
  const { user, userData } = useAuth();
  const [locations, setLocations] = useState<EmployeeLocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<EmployeeLocation | null>(null);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    siteId: "",
    address: "",
    latitude: "",
    longitude: "",
    radiusMeters: "50",
    allowWorkFromAnywhere: false,
    status: "pending" as "pending" | "approved" | "rejected",
    notes: "",
  });

  // Check if user is admin
  const isAdmin = userData?.role === "admin" || userData?.isAdmin;

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allLocations, allEmployees, allSites] = await Promise.all([
        getAllEmployeeLocations(),
        getAllEmployees(),
        getAllSites(),
      ]);
      setLocations(allLocations);
      // Filter to only show employees (not clients)
      const actualEmployees = allEmployees.filter(
        (emp) => !emp.type || emp.type === "employee"
      );
      setEmployees(actualEmployees);
      setSites(allSites);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load employee locations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setFormData({
        ...formData,
        latitude: position.coords.latitude.toString(),
        longitude: position.coords.longitude.toString(),
      });
      toast.success("Location captured successfully");
    } catch (error: any) {
      console.error("Error getting location:", error);
      let errorMessage = "Failed to get location";
      if (error.code === 1) {
        errorMessage = "Location permission denied";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out";
      }
      toast.error(errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSiteChange = (siteId: string) => {
    const selectedSite = sites.find((s) => s.id === siteId);
    if (selectedSite) {
      setFormData({
        ...formData,
        siteId: siteId,
        address: selectedSite.address || "",
        latitude: selectedSite.latitude?.toString() || "",
        longitude: selectedSite.longitude?.toString() || "",
      });
    } else {
      setFormData({
        ...formData,
        siteId: "",
        address: "",
        latitude: "",
        longitude: "",
      });
    }
  };

  const handleAdd = () => {
    setEditingLocation(null);
    setFormData({
      employeeId: "",
      siteId: "",
      address: "",
      latitude: "",
      longitude: "",
      radiusMeters: "50",
      allowWorkFromAnywhere: false,
      status: "pending",
      notes: "",
    });
    setIsAddDialogOpen(true);
  };

  const handleEdit = (location: EmployeeLocation) => {
    setEditingLocation(location);
    setFormData({
      employeeId: location.employeeId,
      siteId: location.siteId,
      address: location.address || "",
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radiusMeters: location.radiusMeters.toString(),
      allowWorkFromAnywhere: location.allowWorkFromAnywhere,
      status: location.status,
      notes: location.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (location: EmployeeLocation) => {
    setDeletingLocationId(location.id);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.employeeId || !formData.siteId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.allowWorkFromAnywhere && (!formData.latitude || !formData.longitude)) {
      toast.error("Please provide location coordinates or enable 'Work from Anywhere'");
      return;
    }

    try {
      setIsSaving(true);
      const selectedEmployee = employees.find((e) => e.id === formData.employeeId);
      if (!selectedEmployee) {
        toast.error("Employee not found");
        return;
      }

      const selectedSite = sites.find((s) => s.id === formData.siteId);
      if (!selectedSite) {
        toast.error("Site not found");
        return;
      }

      const locationData = {
        employeeId: formData.employeeId,
        employeeName: selectedEmployee.name,
        siteId: formData.siteId,
        siteName: selectedSite.name,
        address: formData.address || undefined,
        latitude: formData.allowWorkFromAnywhere ? 0 : parseFloat(formData.latitude),
        longitude: formData.allowWorkFromAnywhere ? 0 : parseFloat(formData.longitude),
        radiusMeters: parseInt(formData.radiusMeters) || 50,
        allowWorkFromAnywhere: formData.allowWorkFromAnywhere,
        status: formData.status,
        notes: formData.notes || undefined,
      };

      if (editingLocation) {
        await updateEmployeeLocation(editingLocation.id, locationData);
        toast.success("Location updated successfully");
      } else {
        await addEmployeeLocation(locationData);
        toast.success("Location added successfully");
      }

      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingLocation(null);
      await loadData();
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error(error.message || "Failed to save location");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLocationId) return;

    try {
      await deleteEmployeeLocation(deletingLocationId);
      toast.success("Location deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingLocationId(null);
      await loadData();
    } catch (error: any) {
      console.error("Error deleting location:", error);
      toast.error(error.message || "Failed to delete location");
    }
  };

  const handleApprove = async (location: EmployeeLocation) => {
    if (!user?.uid) return;

    try {
      await approveEmployeeLocation(location.id, user.uid);
      toast.success("Location approved successfully");
      await loadData();
    } catch (error: any) {
      console.error("Error approving location:", error);
      toast.error(error.message || "Failed to approve location");
    }
  };

  const handleReject = async (location: EmployeeLocation) => {
    if (!user?.uid) return;

    try {
      await rejectEmployeeLocation(location.id, user.uid);
      toast.success("Location rejected successfully");
      await loadData();
    } catch (error: any) {
      console.error("Error rejecting location:", error);
      toast.error(error.message || "Failed to reject location");
    }
  };

  // Filter locations
  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.employeeName.toLowerCase().includes(searchValue.toLowerCase()) ||
      location.siteName.toLowerCase().includes(searchValue.toLowerCase()) ||
      (location.address && location.address.toLowerCase().includes(searchValue.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || location.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name || "Unknown";
  };

  if (!isAdmin) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Employee Locations</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage employee work locations</p>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Admin access is required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Employee Locations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage approved work locations for employees
            </p>
          </div>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name, site name, or address..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Locations Table */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Employee Locations ({filteredLocations.length})</CardTitle>
          <CardDescription>
            Manage work locations for employees. Approved locations can be used for clock-in validation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No locations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell className="font-medium">{location.employeeName}</TableCell>
                      <TableCell>{location.siteName}</TableCell>
                      <TableCell>{location.address || "-"}</TableCell>
                      <TableCell>
                        {location.allowWorkFromAnywhere ? (
                          <Badge variant="outline">Anywhere</Badge>
                        ) : (
                          `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                        )}
                      </TableCell>
                      <TableCell>
                        {location.allowWorkFromAnywhere ? (
                          "-"
                        ) : (
                          `${location.radiusMeters}m`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            location.status === "approved"
                              ? "default"
                              : location.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {location.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {location.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApprove(location)}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(location)}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(location)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(location)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setEditingLocation(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location" : "Add Employee Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Update the employee location details"
                : "Set up a new approved work location for an employee"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">
                Employee <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                disabled={!!editingLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteId">
                Site <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.siteId}
                onValueChange={handleSiteChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
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
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Address will be auto-filled from site"
              />
              {formData.siteId && (
                <p className="text-xs text-muted-foreground">
                  Address is automatically fetched from the selected site. You can edit it if needed.
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowWorkFromAnywhere"
                checked={formData.allowWorkFromAnywhere}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowWorkFromAnywhere: checked as boolean })
                }
              />
              <Label htmlFor="allowWorkFromAnywhere" className="cursor-pointer">
                Allow work from anywhere (no location validation)
              </Label>
            </div>

            {!formData.allowWorkFromAnywhere && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">
                      Latitude {formData.siteId && <span className="text-xs text-muted-foreground">(from site)</span>}
                    </Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) =>
                        setFormData({ ...formData, latitude: e.target.value })
                      }
                      placeholder="e.g., -37.8136"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">
                      Longitude {formData.siteId && <span className="text-xs text-muted-foreground">(from site)</span>}
                    </Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) =>
                        setFormData({ ...formData, longitude: e.target.value })
                      }
                      placeholder="e.g., 144.9631"
                    />
                  </div>
                </div>
                {formData.siteId && (
                  <p className="text-xs text-muted-foreground">
                    Coordinates are automatically fetched from the selected site. You can edit them if needed.
                  </p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  className="w-full"
                >
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <MapPin className="mr-2 h-4 w-4" />
                      Use Current Location
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="radiusMeters">Allowed Radius (meters)</Label>
                  <Input
                    id="radiusMeters"
                    type="number"
                    value={formData.radiusMeters}
                    onChange={(e) =>
                      setFormData({ ...formData, radiusMeters: e.target.value })
                    }
                    placeholder="50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Employee must be within this radius to clock in (default: 50m)
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "pending" | "approved" | "rejected") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this location"
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
                setEditingLocation(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
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
              This action cannot be undone. This will permanently delete the employee location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingLocationId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeLocations;
