"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Building2, Loader2, Trash2, Users } from "lucide-react";
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
import { Site } from "@/types/financial";
import { getAllSites, addSite, updateSite, deleteSite } from "@/lib/firebase/sites";
import { getEmployeesBySite } from "@/lib/firebase/workHours";
import { toast } from "sonner";

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
  const [siteEmployees, setSiteEmployees] = useState<{ employeeId: string; employeeName: string; lastWorkDate: string }[]>([]);
  const [selectedSiteForEmployees, setSelectedSiteForEmployees] = useState<Site | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
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
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  // Load sites from Firebase
  useEffect(() => {
    const loadSites = async () => {
      try {
        setIsLoading(true);
        const fetchedSites = await getAllSites();
        setSites(fetchedSites);
      } catch (error) {
        console.error("Error loading sites:", error);
        toast.error("Failed to load sites. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSites();
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
    });
    setEditingSiteId(null);
  };

  const handleEditSite = (site: Site) => {
    setEditingSiteId(site.id);
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

  const handleDeleteSite = (site: Site) => {
    setDeletingSiteId(site.id);
    setIsDeleteDialogOpen(true);
  };

  const handleViewEmployees = async (site: Site) => {
    try {
      setIsLoadingEmployees(true);
      setSelectedSiteForEmployees(site);
      const employees = await getEmployeesBySite(site.id);
      setSiteEmployees(employees);
      setIsEmployeesDialogOpen(true);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees for this site.");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleSaveSite = async () => {
    if (!formData.name || !formData.clientName || !formData.address) {
      toast.error("Please fill in all required fields (Site Name, Client, Address)");
      return;
    }

    try {
      setIsSaving(true);

      if (editingSiteId) {
        // Update existing site
        await updateSite(editingSiteId, {
          name: formData.name,
          address: formData.address,
          clientName: formData.clientName,
          contactPerson: formData.contactPerson,
          contactPhone: formData.contactPhone,
          contractValue: parseFloat(formData.contractValue) || 0,
          status: formData.status,
          workingDays: formData.workingDays,
          invoicingWorkingHours: formData.invoicingWorkingHours ? parseFloat(formData.invoicingWorkingHours) : undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          dayRate: formData.dayRate ? parseFloat(formData.dayRate) : undefined,
          invoicingFrequency: formData.invoicingFrequency || undefined,
          specialNote: formData.specialNote || undefined,
        });

        // Reload sites to get the latest data from Firebase
        const updatedSites = await getAllSites();
        setSites(updatedSites);
        
        toast.success("Site updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new site
        const newSite: Omit<Site, "id"> = {
          name: formData.name,
          address: formData.address,
          clientName: formData.clientName,
          contactPerson: formData.contactPerson,
          contactPhone: formData.contactPhone,
          contractValue: parseFloat(formData.contractValue) || 0,
          status: formData.status,
          workingDays: formData.workingDays,
          invoicingWorkingHours: formData.invoicingWorkingHours ? parseFloat(formData.invoicingWorkingHours) : undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          dayRate: formData.dayRate ? parseFloat(formData.dayRate) : undefined,
          invoicingFrequency: formData.invoicingFrequency || undefined,
          specialNote: formData.specialNote || undefined,
        };

        // Add site to Firebase
        await addSite(newSite);
        
        // Reload sites to get the latest data from Firebase
        const updatedSites = await getAllSites();
        setSites(updatedSites);
        
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
    return site.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      site.clientName.toLowerCase().includes(searchValue.toLowerCase()) ||
      site.address.toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sites</h2>
          <p className="text-muted-foreground">Manage cleaning sites and locations</p>
        </div>
        <Button onClick={handleAddSite}>
          <Building2 className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by site name, client, or address..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Invoicing Hours</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Day Rate</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Contract Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading sites...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No sites found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSites.map((site) => (
                    <TableRow 
                      key={site.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditSite(site)}
                    >
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.clientName}</TableCell>
                      <TableCell>{site.address}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {site.workingDays && site.workingDays.length > 0 ? (
                            site.workingDays.map((day) => (
                              <Badge key={day} variant="outline" className="text-xs">
                                {day.slice(0, 3)}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {site.invoicingWorkingHours ? `${site.invoicingWorkingHours}Hrs/day` : "-"}
                      </TableCell>
                      <TableCell>
                        {site.hourlyRate ? `$${site.hourlyRate}` : "-"}
                      </TableCell>
                      <TableCell>
                        {site.dayRate ? `$${site.dayRate.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell>
                        {site.invoicingFrequency || "-"}
                      </TableCell>
                      <TableCell className="font-semibold">${site.contractValue.toLocaleString()}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Badge className={site.status === "active" ? "bg-success" : "bg-muted"}>
                            {site.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewEmployees(site)}
                            className="h-8 w-8 p-0"
                            title="View employees"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSite(site)}
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
                    Fill in the site details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Site Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ABC Corporation HQ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="ABC Corporation"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business St, City"
              />
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
                  onChange={(e) => setFormData({ ...formData, invoicingWorkingHours: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="36"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayRate">Day Rate</Label>
                <Input
                  id="dayRate"
                  type="number"
                  step="0.01"
                  value={formData.dayRate}
                  onChange={(e) => setFormData({ ...formData, dayRate: e.target.value })}
                  placeholder="360"
                />
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
                    Update the site details. All fields matching the table columns are available.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Site Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ABC Corporation HQ"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-clientName">Client *</Label>
                <Input
                  id="edit-clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="ABC Corporation"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Business St, City"
              />
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
                  onChange={(e) => setFormData({ ...formData, invoicingWorkingHours: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="36"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dayRate">Day Rate</Label>
                <Input
                  id="edit-dayRate"
                  type="number"
                  step="0.01"
                  value={formData.dayRate}
                  onChange={(e) => setFormData({ ...formData, dayRate: e.target.value })}
                  placeholder="360"
                />
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
      <Dialog open={isEmployeesDialogOpen} onOpenChange={setIsEmployeesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employees at {selectedSiteForEmployees?.name}</DialogTitle>
            <DialogDescription>
              Employees who have worked at this site
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading employees...</span>
              </div>
            ) : siteEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No employees have worked at this site yet.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Last Work Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteEmployees.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                        <TableCell>
                          {new Date(emp.lastWorkDate).toLocaleDateString()}
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
