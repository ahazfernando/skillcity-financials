"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Plus, Loader2, Trash2, Edit2, Save, X, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { EmployeePayRate, Site, Employee } from "@/types/financial";
import { getAllEmployeePayRates, addEmployeePayRate, updateEmployeePayRate, deleteEmployeePayRate, getEmployeePayRateBySiteAndEmployee } from "@/lib/firebase/employeePayRates";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const EmployeePayRateCard = () => {
  const [searchValue, setSearchValue] = useState("");
  const [payRates, setPayRates] = useState<EmployeePayRate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayRateId, setEditingPayRateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ siteId: string; employeeIndex: number } | null>(null);
  const [sitePopoverOpen, setSitePopoverOpen] = useState(false);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  const [siteSearchValue, setSiteSearchValue] = useState("");
  const [employeeSearchValue, setEmployeeSearchValue] = useState("");
  const [formData, setFormData] = useState({
    siteId: "",
    employeeId: "",
    hourlyRate: "",
    travelAllowance: "",
    notes: "",
  });

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedPayRates, fetchedSites, fetchedEmployees] = await Promise.all([
          getAllEmployeePayRates(),
          getAllSites(),
          getAllEmployees(),
        ]);
        setPayRates(fetchedPayRates);
        setSites(fetchedSites.filter(s => s.status === "active"));
        setEmployees(fetchedEmployees.filter(e => e.status === "active"));
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Group pay rates by site
  const payRatesBySite = useMemo(() => {
    const grouped = new Map<string, EmployeePayRate[]>();
    payRates.forEach(pr => {
      if (!grouped.has(pr.siteId)) {
        grouped.set(pr.siteId, []);
      }
      grouped.get(pr.siteId)!.push(pr);
    });
    return grouped;
  }, [payRates]);

  // Get employees for a site, sorted by creation date to maintain assignment order
  const getEmployeesForSite = useCallback((siteId: string): EmployeePayRate[] => {
    const sitePayRates = payRatesBySite.get(siteId) || [];
    // Sort by createdAt timestamp to maintain assignment order (first assigned = Employee 1)
    return [...sitePayRates].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB; // Ascending order (oldest first)
    });
  }, [payRatesBySite]);

  // Filter sites by search and sort alphabetically
  const filteredSites = useMemo(() => {
    let filtered = sites;
    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      filtered = sites.filter(site =>
        site.name.toLowerCase().includes(lowerSearch) ||
        site.clientName.toLowerCase().includes(lowerSearch)
      );
    }
    // Sort alphabetically by site name
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [sites, searchValue]);

  // Get max number of employees across all sites
  const maxEmployeesPerSite = useMemo(() => {
    let max = 0;
    filteredSites.forEach(site => {
      const siteEmployees = getEmployeesForSite(site.id);
      max = Math.max(max, siteEmployees.length);
    });
    return Math.max(max, 3); // At least 3 columns
  }, [filteredSites, getEmployeesForSite]);

  const resetForm = () => {
    setFormData({
      siteId: "",
      employeeId: "",
      hourlyRate: "",
      travelAllowance: "",
      notes: "",
    });
    setEditingPayRateId(null);
    setSiteSearchValue("");
    setEmployeeSearchValue("");
    setSitePopoverOpen(false);
    setEmployeePopoverOpen(false);
  };

  // Get selected site name
  const selectedSiteName = useMemo(() => {
    const site = sites.find(s => s.id === formData.siteId);
    return site?.name || "";
  }, [sites, formData.siteId]);

  // Get selected employee name
  const selectedEmployeeName = useMemo(() => {
    const employee = employees.find(e => e.id === formData.employeeId);
    return employee?.name || "";
  }, [employees, formData.employeeId]);

  const handleAddPayRate = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEditPayRate = (payRate: EmployeePayRate) => {
    setEditingPayRateId(payRate.id);
    setFormData({
      siteId: payRate.siteId,
      employeeId: payRate.employeeId,
      hourlyRate: payRate.hourlyRate.toString(),
      travelAllowance: payRate.travelAllowance?.toString() || "",
      notes: payRate.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSavePayRate = async () => {
    try {
      setIsSaving(true);

      if (editingPayRateId) {
        const updateData: any = {
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
        };
        if (formData.travelAllowance) {
          updateData.travelAllowance = parseFloat(formData.travelAllowance);
        }
        if (formData.notes) {
          updateData.notes = formData.notes;
        }
        await updateEmployeePayRate(editingPayRateId, updateData);
        toast.success("Pay rate updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Check if pay rate already exists
        const existing = await getEmployeePayRateBySiteAndEmployee(formData.siteId, formData.employeeId);
        if (existing) {
          toast.error("Pay rate already exists for this employee at this site.");
          return;
        }

        const site = sites.find(s => s.id === formData.siteId);
        const employee = employees.find(e => e.id === formData.employeeId);
        
        if (!site || !employee) {
          toast.error("Invalid site or employee selected.");
          return;
        }

        const newPayRate: any = {
          siteId: formData.siteId,
          siteName: site.name,
          employeeId: formData.employeeId,
          employeeName: employee.name,
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
        };
        if (formData.travelAllowance) {
          newPayRate.travelAllowance = parseFloat(formData.travelAllowance);
        }
        if (formData.notes) {
          newPayRate.notes = formData.notes;
        }
        await addEmployeePayRate(newPayRate);
        toast.success("Pay rate added successfully!");
        setIsAddDialogOpen(false);
      }

      // Reload data
      const updatedPayRates = await getAllEmployeePayRates();
      setPayRates(updatedPayRates);
      resetForm();
    } catch (error) {
      console.error("Error saving pay rate:", error);
      toast.error(`Failed to ${editingPayRateId ? 'update' : 'add'} pay rate. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayRate = async (payRateId: string) => {
    if (!confirm("Are you sure you want to delete this pay rate?")) return;

    try {
      await deleteEmployeePayRate(payRateId);
      toast.success("Pay rate deleted successfully!");
      
      // Reload data
      const updatedPayRates = await getAllEmployeePayRates();
      setPayRates(updatedPayRates);
    } catch (error) {
      console.error("Error deleting pay rate:", error);
      toast.error("Failed to delete pay rate. Please try again.");
    }
  };

  const formatPayRate = (payRate: EmployeePayRate): string => {
    let rate = `$${payRate.hourlyRate}`;
    if (payRate.travelAllowance) {
      rate += ` + $${payRate.travelAllowance} Travel Allowance`;
    }
    if (payRate.notes) {
      rate += ` ${payRate.notes}`;
    }
    return rate;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Employee Pay Rate Card</h2>
          <p className="text-muted-foreground">Manage employee pay rates by site</p>
        </div>
        <Button onClick={handleAddPayRate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pay Rate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay Rate Card</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by site name or client..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50 dark:bg-green-950">
                  <TableHead className="font-semibold">Cleaning Site</TableHead>
                  {Array.from({ length: maxEmployeesPerSite }, (_, i) => (
                    <React.Fragment key={i}>
                      <TableHead className="font-semibold">Employee {i + 1}</TableHead>
                      <TableHead className="font-semibold">Hourly Rate</TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={maxEmployeesPerSite * 2 + 1} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading pay rates...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={maxEmployeesPerSite * 2 + 1} className="text-center py-8 text-muted-foreground">
                      No sites found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSites.map((site, siteIndex) => {
                    const siteEmployees = getEmployeesForSite(site.id);
                    const rows: (EmployeePayRate | null)[] = [];
                    for (let i = 0; i < maxEmployeesPerSite; i++) {
                      rows.push(siteEmployees[i] || null);
                    }

                    // Alternate row colors like in the spreadsheet
                    const rowColors = [
                      "bg-orange-50 dark:bg-orange-950/30",
                      "bg-yellow-50 dark:bg-yellow-950/30",
                      "bg-green-50 dark:bg-green-950/30",
                      "bg-blue-50 dark:bg-blue-950/30",
                      "bg-purple-50 dark:bg-purple-950/30",
                      "bg-red-50 dark:bg-red-950/30",
                      "bg-cyan-50 dark:bg-cyan-950/30",
                    ];
                    const siteColor = rowColors[siteIndex % rowColors.length];

                    return (
                      <TableRow key={site.id} className="hover:bg-muted/50">
                        <TableCell className={`font-medium ${siteColor}`}>
                          {site.name}
                        </TableCell>
                        {rows.map((payRate, index) => (
                          <React.Fragment key={index}>
                            <TableCell>
                              {payRate ? (
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-left font-normal justify-start hover:underline"
                                  onClick={() => handleEditPayRate(payRate)}
                                >
                                  {payRate.employeeName}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {payRate ? (
                                <span>{formatPayRate(payRate)}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Pay Rate Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/editemployeemodal.jpg"
                alt="Add Employee Pay Rate"
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
                    Add Employee Pay Rate
                  </h2>
                  <p className="text-sm text-white">
                    Assign a pay rate to an employee for a specific site.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg bg-background">
              <div className="p-6">
                <DialogHeader className="md:hidden mb-4">
                  <DialogTitle>Add Employee Pay Rate</DialogTitle>
                  <DialogDescription>
                    Assign a pay rate to an employee for a specific site.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Popover open={sitePopoverOpen} onOpenChange={setSitePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={sitePopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedSiteName || "Select a site"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search sites..."
                      value={siteSearchValue}
                      onValueChange={setSiteSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No site found.</CommandEmpty>
                      <CommandGroup>
                        {sites
                          .filter((site) =>
                            !siteSearchValue ||
                            site.name.toLowerCase().includes(siteSearchValue.toLowerCase()) ||
                            site.clientName.toLowerCase().includes(siteSearchValue.toLowerCase())
                          )
                          .map((site) => (
                            <CommandItem
                              key={site.id}
                              value={site.name}
                              onSelect={() => {
                                setFormData({ ...formData, siteId: site.id });
                                setSitePopoverOpen(false);
                                setSiteSearchValue("");
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
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeePopoverOpen}
                    className="w-full justify-between"
                  >
                    {selectedEmployeeName || "Select an employee"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search employees..."
                      value={employeeSearchValue}
                      onValueChange={setEmployeeSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No employee found.</CommandEmpty>
                      <CommandGroup>
                        {employees
                          .filter((employee) =>
                            !employeeSearchValue ||
                            employee.name.toLowerCase().includes(employeeSearchValue.toLowerCase())
                          )
                          .map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.name}
                              onSelect={() => {
                                setFormData({ ...formData, employeeId: employee.id });
                                setEmployeePopoverOpen(false);
                                setEmployeeSearchValue("");
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travelAllowance">Travel Allowance ($)</Label>
                <Input
                  id="travelAllowance"
                  type="number"
                  step="0.01"
                  value={formData.travelAllowance}
                  onChange={(e) => setFormData({ ...formData, travelAllowance: e.target.value })}
                  placeholder="10 (optional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSavePayRate} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Pay Rate"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pay Rate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/editemployeemodal.jpg"
                alt="Edit Employee Pay Rate"
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
                    Edit Employee Pay Rate
                  </h2>
                  <p className="text-sm text-white">
                    Update the pay rate for this employee at this site.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg bg-background">
              <div className="p-6">
                <DialogHeader className="md:hidden mb-4">
                  <DialogTitle>Edit Employee Pay Rate</DialogTitle>
                  <DialogDescription>
                    Update the pay rate for this employee at this site.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="edit-hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                  placeholder="25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-travelAllowance">Travel Allowance ($)</Label>
                <Input
                  id="edit-travelAllowance"
                  type="number"
                  step="0.01"
                  value={formData.travelAllowance}
                  onChange={(e) => setFormData({ ...formData, travelAllowance: e.target.value })}
                  placeholder="10 (optional)"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes (optional)"
                rows={3}
              />
            </div>
                </div>
                <DialogFooter className="flex justify-between mt-4">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (editingPayRateId) {
                        handleDeletePayRate(editingPayRateId);
                        setIsEditDialogOpen(false);
                      }
                    }}
                    disabled={isSaving || !editingPayRateId}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSavePayRate} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Update Pay Rate"
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePayRateCard;

