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
import { Search, MapPin, Plus, Edit2, Trash2, CheckCircle2, XCircle, Loader2, AlertCircle, ExternalLink, Eye } from "lucide-react";
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
  const [viewingLocation, setViewingLocation] = useState<EmployeeLocation | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

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
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || "Unknown error",
        code: error?.code,
        name: error?.name,
        toString: error?.toString?.(),
      };
      console.error("Error loading data:", errorDetails);
      toast.error(error?.message || "Failed to load employee locations");
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

      // First try with high accuracy, then fallback to lower accuracy if needed
      const tryGetLocation = (options: PositionOptions): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve(position);
            },
            (error) => {
              reject(error);
            },
            options
          );
        });
      };

      let position: GeolocationPosition;
      
      try {
        // First attempt: High accuracy with longer timeout
        position = await Promise.race([
          tryGetLocation({
            enableHighAccuracy: true,
            timeout: 15000, // Increased timeout
            maximumAge: 60000, // Allow 1 minute old cached position
          }),
          // Fallback timeout to prevent hanging
          new Promise<GeolocationPosition>((_, reject) => 
            setTimeout(() => reject(new Error("Location request timed out")), 20000)
          ),
        ]);
      } catch (firstError: any) {
        // If high accuracy fails, try with lower accuracy
        console.log("High accuracy failed, trying with lower accuracy...", firstError);
        position = await Promise.race([
          tryGetLocation({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000, // Allow 5 minute old cached position
          }),
          new Promise<GeolocationPosition>((_, reject) => 
            setTimeout(() => reject(new Error("Location request timed out")), 20000)
          ),
        ]);
      }

      if (position && position.coords) {
        setFormData({
          ...formData,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        });
        toast.success(`Location captured successfully (accuracy: ${Math.round(position.coords.accuracy || 0)}m)`);
      } else {
        throw new Error("Invalid position data received");
      }
    } catch (error: any) {
      // Better error logging
      const errorDetails = {
        message: error?.message || "Unknown error",
        code: error?.code,
        name: error?.name,
        toString: error?.toString?.(),
      };
      console.error("Error getting location:", errorDetails);
      
      let errorMessage = "Failed to get location";
      if (error?.code === 1) {
        errorMessage = "Location permission denied. Please enable location access in your browser settings.";
      } else if (error?.code === 2) {
        errorMessage = "Location unavailable. Please check your device's location services and ensure GPS/Wi-Fi is enabled.";
      } else if (error?.code === 3 || error?.message?.includes("timed out")) {
        errorMessage = "Location request timed out. Please ensure your device's location services are enabled and try again.";
      } else if (error?.message) {
        errorMessage = error.message;
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

  const handleViewLocation = (location: EmployeeLocation) => {
    setViewingLocation(location);
    setIsViewDialogOpen(true);
  };

  const openInGoogleMaps = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const openInOpenStreetMap = (latitude: number, longitude: number) => {
    const url = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`;
    window.open(url, '_blank');
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
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLocation(location)}
                              className="h-6 w-6 p-0"
                              title="View on map"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
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
                          {!location.allowWorkFromAnywhere && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLocation(location)}
                              title="View on map"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
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

                {/* Location Preview */}
                {formData.latitude && formData.longitude && !formData.allowWorkFromAnywhere && (
                  <div className="space-y-2">
                    <Label>Location Preview</Label>
                    <div className="rounded-lg overflow-hidden border-2 bg-muted" style={{ height: '200px' }}>
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(formData.longitude) - 0.01},${parseFloat(formData.latitude) - 0.01},${parseFloat(formData.longitude) + 0.01},${parseFloat(formData.latitude) + 0.01}&layer=mapnik&marker=${formData.latitude},${formData.longitude}`}
                        title="Location Preview"
                      ></iframe>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openInGoogleMaps(parseFloat(formData.latitude), parseFloat(formData.longitude))}
                        className="flex-1"
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Google Maps
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openInOpenStreetMap(parseFloat(formData.latitude), parseFloat(formData.longitude))}
                        className="flex-1"
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        OpenStreetMap
                      </Button>
                    </div>
                  </div>
                )}

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

      {/* View Location on Map Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>View Location on Map</DialogTitle>
            <DialogDescription>
              {viewingLocation && (
                <>
                  {viewingLocation.employeeName} - {viewingLocation.siteName}
                  {viewingLocation.address && ` • ${viewingLocation.address}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewingLocation && !viewingLocation.allowWorkFromAnywhere && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border-2 bg-muted" style={{ height: '400px', position: 'relative' }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${viewingLocation.longitude - 0.01},${viewingLocation.latitude - 0.01},${viewingLocation.longitude + 0.01},${viewingLocation.latitude + 0.01}&layer=mapnik&marker=${viewingLocation.latitude},${viewingLocation.longitude}`}
                  title="Location Map"
                ></iframe>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Coordinates</p>
                  <p className="text-sm font-mono">
                    {viewingLocation.latitude.toFixed(6)}, {viewingLocation.longitude.toFixed(6)}
                  </p>
                </div>
                <div className="flex-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Allowed Radius</p>
                  <p className="text-sm">{viewingLocation.radiusMeters}m</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => openInGoogleMaps(viewingLocation.latitude, viewingLocation.longitude)}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Google Maps
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openInOpenStreetMap(viewingLocation.latitude, viewingLocation.longitude)}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in OpenStreetMap
                </Button>
              </div>
            </div>
          )}
          {viewingLocation && viewingLocation.allowWorkFromAnywhere && (
            <div className="text-center py-8">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">This location allows work from anywhere</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeLocations;
