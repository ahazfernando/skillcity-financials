"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Plus, Edit2, Trash2, Loader2, Eye, ExternalLink, CheckCircle2, XCircle, Clock } from "lucide-react";
import { EmployeeLocation, Site } from "@/types/financial";
import {
  getEmployeeLocationsByEmployee,
  addEmployeeLocation,
  updateEmployeeLocation,
  deleteEmployeeLocation,
} from "@/lib/firebase/employeeLocations";
import { getAllSites } from "@/lib/firebase/sites";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeeLocation = () => {
  const { user, userData } = useAuth();
  const [locations, setLocations] = useState<EmployeeLocation[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<EmployeeLocation | null>(null);
  const [viewingLocation, setViewingLocation] = useState<EmployeeLocation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    siteId: "",
    address: "",
    latitude: "",
    longitude: "",
    radiusMeters: "50",
    allowWorkFromAnywhere: false,
    notes: "",
  });

  useEffect(() => {
    if (user?.uid) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [employeeLocations, allSites] = await Promise.all([
        getEmployeeLocationsByEmployee(user?.uid || ""),
        getAllSites(),
      ]);
      setLocations(employeeLocations);
      setSites(allSites.filter(s => s.status === "active"));
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load your locations");
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

      const tryGetLocation = (options: PositionOptions): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            options
          );
        });
      };

      let position: GeolocationPosition;
      
      try {
        position = await Promise.race([
          tryGetLocation({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000,
          }),
          new Promise<GeolocationPosition>((_, reject) => 
            setTimeout(() => reject(new Error("Location request timed out")), 20000)
          ),
        ]);
      } catch (firstError: any) {
        console.log("High accuracy failed, trying with lower accuracy...", firstError);
        position = await Promise.race([
          tryGetLocation({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000,
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
      const errorDetails = {
        message: error?.message || "Unknown error",
        code: error?.code,
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

  const resetForm = () => {
    setFormData({
      siteId: "",
      address: "",
      latitude: "",
      longitude: "",
      radiusMeters: "50",
      allowWorkFromAnywhere: false,
      notes: "",
    });
    setEditingLocation(null);
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (location: EmployeeLocation) => {
    // Only allow editing if status is pending or rejected
    if (location.status === "approved") {
      toast.error("Approved locations cannot be edited. Please create a new location request.");
      return;
    }
    setEditingLocation(location);
    setFormData({
      siteId: location.siteId,
      address: location.address || "",
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radiusMeters: location.radiusMeters.toString(),
      allowWorkFromAnywhere: location.allowWorkFromAnywhere,
      notes: location.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (location: EmployeeLocation) => {
    // Only allow deleting if status is pending or rejected
    if (location.status === "approved") {
      toast.error("Approved locations cannot be deleted. Please contact an administrator.");
      return;
    }
    try {
      await deleteEmployeeLocation(location.id);
      toast.success("Location request deleted successfully");
      await loadData();
    } catch (error: any) {
      console.error("Error deleting location:", error);
      toast.error(error.message || "Failed to delete location");
    }
  };

  const handleSave = async () => {
    if (!user?.uid || !userData) {
      toast.error("User information not available");
      return;
    }

    if (!formData.siteId) {
      toast.error("Please select a site");
      return;
    }

    if (!formData.allowWorkFromAnywhere && (!formData.latitude || !formData.longitude)) {
      toast.error("Please provide location coordinates or enable 'Work from Anywhere'");
      return;
    }

    try {
      setIsSaving(true);
      const selectedSite = sites.find((s) => s.id === formData.siteId);
      if (!selectedSite) {
        toast.error("Site not found");
        return;
      }

      const locationData = {
        employeeId: user.uid,
        employeeName: userData.name || user.email || "Employee",
        siteId: formData.siteId,
        siteName: selectedSite.name,
        address: formData.address || undefined,
        latitude: formData.allowWorkFromAnywhere ? 0 : parseFloat(formData.latitude),
        longitude: formData.allowWorkFromAnywhere ? 0 : parseFloat(formData.longitude),
        radiusMeters: parseInt(formData.radiusMeters) || 50,
        allowWorkFromAnywhere: formData.allowWorkFromAnywhere,
        status: "pending" as const, // Always set to pending for employee submissions
        notes: formData.notes || undefined,
      };

      if (editingLocation) {
        await updateEmployeeLocation(editingLocation.id, locationData);
        toast.success("Location request updated successfully. Waiting for admin approval.");
      } else {
        await addEmployeeLocation(locationData);
        toast.success("Location request submitted successfully. Waiting for admin approval.");
      }

      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error("Error saving location:", error);
      toast.error(error.message || "Failed to save location");
    } finally {
      setIsSaving(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-background border border-blue-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              My Work Locations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Set your work locations for clock-in validation. Locations require admin approval.
            </p>
          </div>
          <Button onClick={handleAdd} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Location Request
          </Button>
        </div>
      </div>

      {/* Locations List */}
      <Card className="rounded-3xl border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-muted/30 border-b-2">
          <CardTitle>My Location Requests ({locations.length})</CardTitle>
          <CardDescription>
            View and manage your work location requests. Approved locations can be used for clock-in validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No location requests yet</p>
              <p className="text-sm text-muted-foreground">Add a location request to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <Card key={location.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{location.siteName}</h3>
                            {location.address && (
                              <p className="text-sm text-muted-foreground mt-1">{location.address}</p>
                            )}
                          </div>
                          {getStatusBadge(location.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          {!location.allowWorkFromAnywhere && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Coordinates: </span>
                                <span className="font-mono">
                                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Radius: </span>
                                <span>{location.radiusMeters}m</span>
                              </div>
                            </>
                          )}
                          {location.allowWorkFromAnywhere && (
                            <div>
                              <Badge variant="outline">Work from Anywhere</Badge>
                            </div>
                          )}
                          {location.approvedAt && (
                            <div>
                              <span className="text-muted-foreground">Approved: </span>
                              <span>{new Date(location.approvedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {location.notes && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Notes: </span>
                            <span>{location.notes}</span>
                          </div>
                        )}
                      </div>

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
                        {location.status !== "approved" && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? "Edit Location Request" : "Add Location Request"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation
                ? "Update your location request. It will be resubmitted for admin approval."
                : "Set up a new work location. Your request will be sent to an administrator for approval."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                {formData.latitude && formData.longitude && (
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
                    You must be within this radius to clock in (default: 50m)
                  </p>
                </div>
              </>
            )}

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
                resetForm();
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
                "Submit for Approval"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Location Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>View Location on Map</DialogTitle>
            <DialogDescription>
              {viewingLocation && (
                <>
                  {viewingLocation.siteName}
                  {viewingLocation.address && ` • ${viewingLocation.address}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {viewingLocation && !viewingLocation.allowWorkFromAnywhere && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden border-2 bg-muted" style={{ height: '400px' }}>
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

export default EmployeeLocation;
