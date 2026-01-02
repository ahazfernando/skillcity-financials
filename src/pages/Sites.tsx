"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Building2, Loader2, Trash2, Users, Check, ChevronsUpDown, UserPlus, Table2, Grid3x3, X, MapPin } from "lucide-react";
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
import { Site, SiteEmployeeAllocation, Employee } from "@/types/financial";
import { getAllSites, addSite, updateSite, deleteSite } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllocationsBySite, addAllocation, deleteAllocation } from "@/lib/firebase/siteEmployeeAllocations";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const Sites = () => {
  const [searchValue, setSearchValue] = useState("");
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEmployeesDialogOpen, setIsEmployeesDialogOpen] = useState(false);
  const [siteAllocations, setSiteAllocations] = useState<SiteEmployeeAllocation[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedSiteForEmployees, setSelectedSiteForEmployees] = useState<Site | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    clientName: "",
    contactPerson: "",
    contactPhone: "",
    contractValue: "",
    status: "active" as "active" | "inactive",
    workingDays: [] as string[],
    invoicingWorkingHours: "",
    hourlyRate: "",
    dayRate: "",
    invoicingFrequency: "" as "" | "Monthly" | "Fortnightly" | "Weekly",
    specialNote: "",
    selectedEmployees: [] as string[], // Employee IDs
    latitude: "",
    longitude: "",
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [employeePopoverOpenForm, setEmployeePopoverOpenForm] = useState(false);

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Load sites and employees from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedSites, fetchedEmployees] = await Promise.all([
          getAllSites(),
          getAllEmployees(),
        ]);
        setSites(fetchedSites);
        // Filter out clients - only show actual employees
        const actualEmployees = fetchedEmployees.filter(
          (emp) => (!emp.type || emp.type === "employee") && emp.status === "active"
        );
        // Sort employees alphabetically
        const sortedEmployees = actualEmployees.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setAllEmployees(sortedEmployees);
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
      name: "",
      address: "",
      clientName: "",
      contactPerson: "",
      contactPhone: "",
      contractValue: "",
      status: "active",
      workingDays: [],
      invoicingWorkingHours: "",
      hourlyRate: "",
      dayRate: "",
      invoicingFrequency: "",
      specialNote: "",
      selectedEmployees: [],
      latitude: "",
      longitude: "",
    });
    setEditingSiteId(null);
    setEmployeeSearchValue("");
    setEmployeePopoverOpenForm(false);
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

  const handleEditSite = async (site: Site) => {
    setEditingSiteId(site.id);
    // Load existing allocations for this site
    let employeeIds: string[] = [];
    try {
      const allocations = await getAllocationsBySite(site.id!);
      employeeIds = allocations.map(alloc => alloc.employeeId);
    } catch (error) {
      console.error("Error loading allocations:", error);
    }
    
    setFormData({
      name: site.name,
      address: site.address,
      clientName: site.clientName,
      contactPerson: site.contactPerson,
      contactPhone: site.contactPhone,
      contractValue: site.contractValue.toString(),
      status: site.status,
      workingDays: site.workingDays || [],
      invoicingWorkingHours: site.invoicingWorkingHours?.toString() || "",
      hourlyRate: site.hourlyRate?.toString() || "",
      dayRate: site.dayRate?.toString() || "",
      invoicingFrequency: site.invoicingFrequency || "",
      specialNote: site.specialNote || "",
      selectedEmployees: employeeIds,
      latitude: site.latitude?.toString() || "",
      longitude: site.longitude?.toString() || "",
    });
    setIsEditDialogOpen(true);
  };

  const toggleWorkingDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  // Auto-calculate day rate from invoicing working hours and hourly rate
  const calculateDayRate = (hours: string, rate: string): string => {
    const hoursNum = parseFloat(hours);
    const rateNum = parseFloat(rate);
    if (!isNaN(hoursNum) && !isNaN(rateNum) && hoursNum > 0 && rateNum > 0) {
      return (hoursNum * rateNum).toFixed(2);
    }
    return "";
  };

  const handleInvoicingHoursChange = (value: string) => {
    setFormData(prev => {
      const updated = { ...prev, invoicingWorkingHours: value };
      // Auto-calculate day rate if hourly rate is also present
      if (prev.hourlyRate) {
        const calculatedDayRate = calculateDayRate(value, prev.hourlyRate);
        updated.dayRate = calculatedDayRate;
      }
      return updated;
    });
  };

  const handleHourlyRateChange = (value: string) => {
    setFormData(prev => {
      const updated = { ...prev, hourlyRate: value };
      // Auto-calculate day rate if invoicing working hours is also present
      if (prev.invoicingWorkingHours) {
        const calculatedDayRate = calculateDayRate(prev.invoicingWorkingHours, value);
        updated.dayRate = calculatedDayRate;
      }
      return updated;
    });
  };

  const handleDeleteSite = (site: Site) => {
    setDeletingSiteId(site.id);
    setIsDeleteDialogOpen(true);
  };

  const handleViewEmployees = async (site: Site) => {
    try {
      setIsLoadingEmployees(true);
      setSelectedSiteForEmployees(site);
      setSelectedEmployeeId("");
      const allocations = await getAllocationsBySite(site.id);
      setSiteAllocations(allocations);
      setIsEmployeesDialogOpen(true);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees for this site.");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleAddEmployeeToSite = async () => {
    if (!selectedSiteForEmployees || !selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    // Check if employee is already assigned
    const existingAllocation = siteAllocations.find(
      (alloc) => alloc.employeeId === selectedEmployeeId
    );
    if (existingAllocation) {
      toast.error("This employee is already assigned to this site");
      return;
    }

    try {
      setIsAddingEmployee(true);
      const selectedEmployee = allEmployees.find((emp) => emp.id === selectedEmployeeId);
      if (!selectedEmployee) {
        toast.error("Employee not found");
        return;
      }

      // Get the next employee number for this site
      const maxEmployeeNumber = siteAllocations.length > 0
        ? Math.max(...siteAllocations.map((a) => a.employeeNumber))
        : 0;

      const newAllocation: Omit<SiteEmployeeAllocation, "id"> = {
        siteId: selectedSiteForEmployees.id,
        siteName: selectedSiteForEmployees.name,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        employeeNumber: maxEmployeeNumber + 1,
        actualWorkingTime: "",
        hasExtraTime: false,
      };

      await addAllocation(newAllocation);

      // Reload allocations
      const updatedAllocations = await getAllocationsBySite(selectedSiteForEmployees.id);
      setSiteAllocations(updatedAllocations);
      setSelectedEmployeeId("");
      setEmployeePopoverOpen(false);
      toast.success("Employee added successfully!");
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("Failed to add employee. Please try again.");
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleRemoveEmployeeFromSite = async (allocationId: string, employeeName: string) => {
    try {
      await deleteAllocation(allocationId);
      
      // Reload allocations
      if (selectedSiteForEmployees) {
        const updatedAllocations = await getAllocationsBySite(selectedSiteForEmployees.id);
        setSiteAllocations(updatedAllocations);
      }
      
      toast.success(`${employeeName} removed from site successfully!`);
    } catch (error) {
      console.error("Error removing employee:", error);
      toast.error("Failed to remove employee. Please try again.");
    }
  };

  const handleSaveSite = async () => {
    try {
      setIsSaving(true);

      if (editingSiteId) {
        // Update existing site - allow partial updates
        await updateSite(editingSiteId, {
          name: formData.name || "",
          address: formData.address || "",
          clientName: formData.clientName || "",
          contactPerson: formData.contactPerson || undefined,
          contactPhone: formData.contactPhone || undefined,
          contractValue: parseFloat(formData.contractValue) || 0,
          status: formData.status,
          workingDays: formData.workingDays,
          invoicingWorkingHours: formData.invoicingWorkingHours ? parseFloat(formData.invoicingWorkingHours) : undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          dayRate: formData.dayRate ? parseFloat(formData.dayRate) : undefined,
          invoicingFrequency: formData.invoicingFrequency || undefined,
          specialNote: formData.specialNote || undefined,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        });

        // Update employee allocations
        const existingSite = sites.find(s => s.id === editingSiteId);
        if (existingSite) {
          try {
            // Get current allocations
            const currentAllocations = await getAllocationsBySite(editingSiteId);
            const currentEmployeeIds = currentAllocations.map(a => a.employeeId);
            
            // Remove employees that are no longer selected
            for (const allocation of currentAllocations) {
              if (!formData.selectedEmployees.includes(allocation.employeeId)) {
                await deleteAllocation(allocation.id!);
              }
            }
            
            // Add new employees
            for (let i = 0; i < formData.selectedEmployees.length; i++) {
              const employeeId = formData.selectedEmployees[i];
              if (!currentEmployeeIds.includes(employeeId)) {
                const employee = allEmployees.find(emp => emp.id === employeeId);
                if (employee) {
                  const newAllocation: Omit<SiteEmployeeAllocation, "id"> = {
                    siteId: existingSite.id!,
                    siteName: existingSite.name,
                    employeeId: employee.id!,
                    employeeName: employee.name,
                    employeeNumber: currentAllocations.length + i + 1,
                    actualWorkingTime: "",
                    hasExtraTime: false,
                  };
                  await addAllocation(newAllocation);
                }
              }
            }
          } catch (error) {
            console.error("Error updating employee allocations:", error);
            toast.error("Site updated but failed to update some employee assignments");
          }
        }

        // Reload sites to get the latest data from Firebase
        const updatedSites = await getAllSites();
        setSites(updatedSites);
        
        toast.success("Site updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new site - allow partial fill
        const newSite: Omit<Site, "id"> = {
          name: formData.name || "",
          address: formData.address || "",
          clientName: formData.clientName || "",
          contactPerson: formData.contactPerson || undefined,
          contactPhone: formData.contactPhone || undefined,
          contractValue: parseFloat(formData.contractValue) || 0,
          status: formData.status,
          workingDays: formData.workingDays,
          invoicingWorkingHours: formData.invoicingWorkingHours ? parseFloat(formData.invoicingWorkingHours) : undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          dayRate: formData.dayRate ? parseFloat(formData.dayRate) : undefined,
          invoicingFrequency: formData.invoicingFrequency || undefined,
          specialNote: formData.specialNote || undefined,
          latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
          longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        };

        // Add site to Firebase
        const newSiteId = await addSite(newSite);
        
        // Reload sites to get the latest data from Firebase
        const updatedSites = await getAllSites();
        const createdSite = updatedSites.find(s => s.id === newSiteId);
        setSites(updatedSites);
        
        // Add employee allocations if employees were selected
        if (formData.selectedEmployees.length > 0 && createdSite) {
          try {
            for (let i = 0; i < formData.selectedEmployees.length; i++) {
              const employeeId = formData.selectedEmployees[i];
              const employee = allEmployees.find(emp => emp.id === employeeId);
              if (employee) {
                const newAllocation: Omit<SiteEmployeeAllocation, "id"> = {
                  siteId: createdSite.id!,
                  siteName: createdSite.name,
                  employeeId: employee.id!,
                  employeeName: employee.name,
                  employeeNumber: i + 1,
                  actualWorkingTime: "",
                  hasExtraTime: false,
                };
                await addAllocation(newAllocation);
              }
            }
          } catch (error) {
            console.error("Error adding employee allocations:", error);
            toast.error("Site created but failed to assign some employees");
          }
        }
        
        toast.success("Site added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving site:", error);
      toast.error(`Failed to ${editingSiteId ? 'update' : 'add'} site. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSiteId) return;

    try {
      await deleteSite(deletingSiteId);
      
      // Reload sites to get the latest data from Firebase
      const updatedSites = await getAllSites();
      setSites(updatedSites);
      
      toast.success("Site deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingSiteId(null);
    } catch (error) {
      console.error("Error deleting site:", error);
      toast.error("Failed to delete site. Please try again.");
    }
  };

  const handleAddSite = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const filteredSites = sites.filter(site => {
    return site.name.toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-background border border-teal-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Sites
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage cleaning sites and locations efficiently</p>
        </div>
          <Button 
            onClick={handleAddSite} 
            className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-300 border-2"
            variant="outline"
            size="lg"
          >
          <Building2 className="mr-2 h-4 w-4" />
          Add Site
        </Button>
        </div>
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500/10 via-cyan-500/5 to-muted/30 border-b-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Site List</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">View and manage all cleaning sites</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="shadow-sm"
              >
                <Table2 className="h-4 w-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="shadow-sm"
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Cards
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by site name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 border-2"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading sites...</span>
              </div>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No sites found</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-teal-500/20 via-cyan-500/10 to-teal-500/5 border-b-2">
                    <TableHead className="font-bold text-foreground">Site Name</TableHead>
                    <TableHead className="font-bold text-foreground">Working Days</TableHead>
                    <TableHead className="font-bold text-foreground">Invoicing Hours</TableHead>
                    <TableHead className="font-bold text-foreground">Hourly Rate</TableHead>
                    <TableHead className="font-bold text-foreground">Day Rate</TableHead>
                    <TableHead className="font-bold text-foreground">Frequency</TableHead>
                    <TableHead className="font-bold text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSites.map((site) => (
                    <TableRow 
                      key={site.id}
                      className="cursor-pointer hover:bg-gradient-to-r hover:from-teal-500/5 hover:to-transparent transition-all duration-200 border-b group"
                      onClick={() => handleEditSite(site)}
                    >
                      <TableCell className="font-semibold">
                        {site.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {site.workingDays && site.workingDays.length > 0 ? (
                            site.workingDays.map((day) => (
                              <Badge key={day} variant="outline" className="text-xs bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50">
                                {day.slice(0, 3)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {site.invoicingWorkingHours ? (
                          <Badge variant="outline" className="text-xs">
                            {site.invoicingWorkingHours}Hrs/day
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {site.hourlyRate ? (
                          <span className="font-medium text-foreground">
                            ${site.hourlyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {site.dayRate ? (
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            ${site.dayRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {site.invoicingFrequency ? (
                          <Badge variant="outline" className="text-xs">
                            {site.invoicingFrequency}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={site.status === "active" 
                              ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                              : "bg-muted text-muted-foreground"}
                          >
                            {site.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEmployees(site)}
                            className="h-8 w-8 p-0 hover:bg-teal-500/10 transition-all duration-200"
                            title="View employees"
                          >
                            <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSite(site)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSites.map((site, index) => {
                const gradientColors = [
                  "from-teal-500/20 via-cyan-500/15 to-blue-500/20",
                  "from-emerald-500/20 via-teal-500/15 to-cyan-500/20",
                  "from-blue-500/20 via-indigo-500/15 to-purple-500/20",
                  "from-cyan-500/20 via-sky-500/15 to-blue-500/20",
                  "from-teal-500/20 via-emerald-500/15 to-green-500/20",
                  "from-cyan-500/20 via-teal-500/15 to-emerald-500/20",
                ];
                const gradientColor = gradientColors[index % gradientColors.length];
                
                return (
                  <Card
                    key={site.id}
                    className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer`}
                    onClick={() => handleEditSite(site)}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                    <CardHeader className="relative pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-bold mb-1 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {site.name}
                          </CardTitle>
                          {site.clientName && (
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {site.clientName}
                            </p>
                          )}
                        </div>
                        <Badge 
                          className={site.status === "active" 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 shrink-0" 
                            : "bg-muted text-muted-foreground shrink-0"}
                        >
                          {site.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="relative space-y-3">
                      {site.address && (
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[60px]">Address:</span>
                          <span className="text-foreground line-clamp-2">{site.address}</span>
                        </div>
                      )}
                      
                      {site.workingDays && site.workingDays.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[60px]">Days:</span>
                          <div className="flex flex-wrap gap-1">
                            {site.workingDays.map((day) => (
                              <Badge key={day} variant="outline" className="text-xs bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50">
                                {day.slice(0, 3)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        {site.invoicingWorkingHours && (
                          <div>
                            <p className="text-xs text-muted-foreground">Hours/Day</p>
                            <p className="text-sm font-semibold">{site.invoicingWorkingHours}Hrs</p>
                          </div>
                        )}
                        {site.invoicingFrequency && (
                          <div>
                            <p className="text-xs text-muted-foreground">Frequency</p>
                            <p className="text-sm font-semibold">{site.invoicingFrequency}</p>
                          </div>
                        )}
                        {site.hourlyRate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Hourly Rate</p>
                            <p className="text-sm font-semibold">${site.hourlyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        )}
                        {site.dayRate && (
                          <div>
                            <p className="text-xs text-muted-foreground">Day Rate</p>
                            <p className="text-sm font-bold text-teal-600 dark:text-teal-400">${site.dayRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewEmployees(site)}
                          className="h-8 hover:bg-teal-500/10 transition-all duration-200"
                          title="View employees"
                        >
                          <Users className="h-4 w-4 mr-1 text-teal-600 dark:text-teal-400" />
                          <span className="text-xs">Employees</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSite(site)}
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Site Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/liquidglass.jpg"
                alt="Add Site"
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
                    Add a new site
                  </h2>
                  <p className="text-sm text-white">
                    Add a new site to the system by filling in the details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Add Site</DialogTitle>
                  <DialogDescription>
                    Fill in the site details. All fields are optional and can be filled partially.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ABC Corporation HQ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="ABC Corporation"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business St, City"
              />
            </div>

            <div className="space-y-2">
              <Label>Location Coordinates</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., -37.8136"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
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
              <p className="text-xs text-muted-foreground">
                Set location coordinates for this site. Used for employee location validation during clock-in.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+1234567893"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`day-${day}`}
                      checked={formData.workingDays.includes(day)}
                      onCheckedChange={() => toggleWorkingDay(day)}
                    />
                    <Label
                      htmlFor={`day-${day}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.slice(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoicingWorkingHours">Invoicing Working Hours (per day)</Label>
                <Input
                  id="invoicingWorkingHours"
                  type="number"
                  step="0.5"
                  value={formData.invoicingWorkingHours}
                  onChange={(e) => handleInvoicingHoursChange(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoicingFrequency">Invoicing Frequency</Label>
                <Select
                  value={formData.invoicingFrequency}
                  onValueChange={(value) => setFormData({ ...formData, invoicingFrequency: value as "Monthly" | "Fortnightly" | "Weekly" })}
                >
                  <SelectTrigger id="invoicingFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => handleHourlyRateChange(e.target.value)}
                  placeholder="36"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayRate">Day Rate {formData.invoicingWorkingHours && formData.hourlyRate && "(Auto-calculated)"}</Label>
                <Input
                  id="dayRate"
                  type="number"
                  step="0.01"
                  value={formData.dayRate}
                  onChange={(e) => setFormData({ ...formData, dayRate: e.target.value })}
                  placeholder="360"
                  className={formData.invoicingWorkingHours && formData.hourlyRate ? "bg-muted/50" : ""}
                />
                {formData.invoicingWorkingHours && formData.hourlyRate && (
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: {formData.invoicingWorkingHours} hrs × ${formData.hourlyRate}/hr = ${calculateDayRate(formData.invoicingWorkingHours, formData.hourlyRate)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractValue">Contract Value</Label>
                <Input
                  id="contractValue"
                  type="number"
                  step="0.01"
                  value={formData.contractValue}
                  onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                  placeholder="60000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialNote">Special Note</Label>
              <Textarea
                id="specialNote"
                value={formData.specialNote}
                onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })}
                placeholder="Additional notes about the site..."
                rows={3}
              />
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label>Assign Employees</Label>
              <Popover open={employeePopoverOpenForm} onOpenChange={setEmployeePopoverOpenForm}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      formData.selectedEmployees.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {formData.selectedEmployees.length > 0
                      ? `${formData.selectedEmployees.length} employee(s) selected`
                      : "Select employees..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search employees..."
                      value={employeeSearchValue}
                      onValueChange={setEmployeeSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {allEmployees
                          .filter((employee) =>
                            !employeeSearchValue ||
                            employee.name.toLowerCase().includes(employeeSearchValue.toLowerCase()) ||
                            employee.email?.toLowerCase().includes(employeeSearchValue.toLowerCase())
                          )
                          .map((employee) => {
                            const isSelected = formData.selectedEmployees.includes(employee.id!);
                            return (
                              <CommandItem
                                key={employee.id}
                                value={employee.id}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    selectedEmployees: isSelected
                                      ? formData.selectedEmployees.filter((id) => id !== employee.id)
                                      : [...formData.selectedEmployees, employee.id!],
                                  });
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="mr-2"
                                  onCheckedChange={() => {}}
                                />
                                <div className="flex flex-col">
                                  <span>{employee.name}</span>
                                  {employee.email && (
                                    <span className="text-xs text-muted-foreground">{employee.email}</span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.selectedEmployees.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Selected employees ({formData.selectedEmployees.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {formData.selectedEmployees.map((employeeId) => {
                      const employee = allEmployees.find((e) => e.id === employeeId);
                      return employee ? (
                        <Badge
                          key={employeeId}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              selectedEmployees: formData.selectedEmployees.filter((id) => id !== employeeId),
                            });
                          }}
                        >
                          {employee.name}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
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
                  <Button onClick={handleSaveSite} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Site"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Site Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/liquidglass.jpg"
                alt="Edit Site"
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
                    Edit site details
                  </h2>
                  <p className="text-sm text-white">
                    Update the site details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Edit Site</DialogTitle>
                  <DialogDescription>
                    Update the site details. All fields are optional and can be filled partially.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Site Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ABC Corporation HQ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-clientName">Client</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="ABC Corporation"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business St, City"
              />
            </div>

            <div className="space-y-2">
              <Label>Location Coordinates</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-latitude" className="text-xs">Latitude</Label>
                  <Input
                    id="edit-latitude"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., -37.8136"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-longitude" className="text-xs">Longitude</Label>
                  <Input
                    id="edit-longitude"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
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
              <p className="text-xs text-muted-foreground">
                Set location coordinates for this site. Used for employee location validation during clock-in.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contactPerson">Contact Person</Label>
                <Input
                  id="edit-contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contactPhone">Contact Phone</Label>
                <Input
                  id="edit-contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="+1234567893"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Working Days</Label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-day-${day}`}
                      checked={formData.workingDays.includes(day)}
                      onCheckedChange={() => toggleWorkingDay(day)}
                    />
                    <Label
                      htmlFor={`edit-day-${day}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.slice(0, 3)}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-invoicingWorkingHours">Invoicing Working Hours (per day)</Label>
                <Input
                  id="edit-invoicingWorkingHours"
                  type="number"
                  step="0.5"
                  value={formData.invoicingWorkingHours}
                  onChange={(e) => handleInvoicingHoursChange(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-invoicingFrequency">Invoicing Frequency</Label>
                <Select
                  value={formData.invoicingFrequency}
                  onValueChange={(value) => setFormData({ ...formData, invoicingFrequency: value as "Monthly" | "Fortnightly" | "Weekly" })}
                >
                  <SelectTrigger id="edit-invoicingFrequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Fortnightly">Fortnightly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hourlyRate">Hourly Rate</Label>
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => handleHourlyRateChange(e.target.value)}
                  placeholder="36"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dayRate">Day Rate {formData.invoicingWorkingHours && formData.hourlyRate && "(Auto-calculated)"}</Label>
                <Input
                  id="edit-dayRate"
                  type="number"
                  step="0.01"
                  value={formData.dayRate}
                  onChange={(e) => setFormData({ ...formData, dayRate: e.target.value })}
                  placeholder="360"
                  className={formData.invoicingWorkingHours && formData.hourlyRate ? "bg-muted/50" : ""}
                />
                {formData.invoicingWorkingHours && formData.hourlyRate && (
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated: {formData.invoicingWorkingHours} hrs × ${formData.hourlyRate}/hr = ${calculateDayRate(formData.invoicingWorkingHours, formData.hourlyRate)}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contractValue">Contract Value</Label>
                <Input
                  id="edit-contractValue"
                  type="number"
                  step="0.01"
                  value={formData.contractValue}
                  onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                  placeholder="60000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-specialNote">Special Note</Label>
              <Textarea
                id="edit-specialNote"
                value={formData.specialNote}
                onChange={(e) => setFormData({ ...formData, specialNote: e.target.value })}
                placeholder="Additional notes about the site..."
                rows={3}
              />
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label>Assign Employees</Label>
              <Popover open={employeePopoverOpenForm} onOpenChange={setEmployeePopoverOpenForm}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full justify-between",
                      formData.selectedEmployees.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {formData.selectedEmployees.length > 0
                      ? `${formData.selectedEmployees.length} employee(s) selected`
                      : "Select employees..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search employees..."
                      value={employeeSearchValue}
                      onValueChange={setEmployeeSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {allEmployees
                          .filter((employee) =>
                            !employeeSearchValue ||
                            employee.name.toLowerCase().includes(employeeSearchValue.toLowerCase()) ||
                            employee.email?.toLowerCase().includes(employeeSearchValue.toLowerCase())
                          )
                          .map((employee) => {
                            const isSelected = formData.selectedEmployees.includes(employee.id!);
                            return (
                              <CommandItem
                                key={employee.id}
                                value={employee.id}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    selectedEmployees: isSelected
                                      ? formData.selectedEmployees.filter((id) => id !== employee.id)
                                      : [...formData.selectedEmployees, employee.id!],
                                  });
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="mr-2"
                                  onCheckedChange={() => {}}
                                />
                                <div className="flex flex-col">
                                  <span>{employee.name}</span>
                                  {employee.email && (
                                    <span className="text-xs text-muted-foreground">{employee.email}</span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.selectedEmployees.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Selected employees ({formData.selectedEmployees.length}):
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {formData.selectedEmployees.map((employeeId) => {
                      const employee = allEmployees.find((e) => e.id === employeeId);
                      return employee ? (
                        <Badge
                          key={employeeId}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              selectedEmployees: formData.selectedEmployees.filter((id) => id !== employeeId),
                            });
                          }}
                        >
                          {employee.name}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
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
                  <Button onClick={handleSaveSite} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Site"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Employees Dialog */}
      <Dialog open={isEmployeesDialogOpen} onOpenChange={(open) => {
        setIsEmployeesDialogOpen(open);
        if (!open) {
          setSelectedSiteForEmployees(null);
          setSiteAllocations([]);
          setSelectedEmployeeId("");
          setEmployeePopoverOpen(false);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employees at {selectedSiteForEmployees?.name}</DialogTitle>
            <DialogDescription>
              Manage employees assigned to this site
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Add Employee Section */}
            <div className="flex items-end gap-2 pb-4 border-b">
              <div className="flex-1 space-y-2">
                <Label>Add Employee</Label>
                <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={employeePopoverOpen}
                      className="w-full justify-between"
                    >
                      {selectedEmployeeId
                        ? allEmployees.find((emp) => emp.id === selectedEmployeeId)?.name
                        : "Select an employee..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search employees..." />
                      <CommandList>
                        <CommandEmpty>No employee found.</CommandEmpty>
                        <CommandGroup>
                          {allEmployees
                            .filter((emp) => !siteAllocations.some((alloc) => alloc.employeeId === emp.id))
                            .map((employee) => (
                              <CommandItem
                                key={employee.id}
                                value={employee.name}
                                onSelect={() => {
                                  setSelectedEmployeeId(employee.id);
                                  setEmployeePopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
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
              <Button
                onClick={handleAddEmployeeToSite}
                disabled={!selectedEmployeeId || isAddingEmployee}
                className="mb-0"
              >
                {isAddingEmployee ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>

            {/* Employees List */}
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading employees...</span>
              </div>
            ) : siteAllocations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No employees assigned to this site yet.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Working Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteAllocations.map((allocation) => (
                      <TableRow key={allocation.id}>
                        <TableCell className="font-medium">{allocation.employeeName}</TableCell>
                        <TableCell>{allocation.actualWorkingTime || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEmployeeFromSite(allocation.id, allocation.employeeName)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeesDialogOpen(false)}>
              Close
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
              This action cannot be undone. This will permanently delete the site from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSiteId(null)}>
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

export default Sites;
