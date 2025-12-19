"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Plus, Loader2, Trash2, Edit2, Save, X, Check, ChevronsUpDown, LayoutGrid, Table as TableIcon, Building2, Users, DollarSign, TrendingUp, Sparkles, Calculator, Clock, Download, FileText } from "lucide-react";
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
import { EmployeePayRate, Site, Employee, SiteEmployeeAllocation } from "@/types/financial";
import { getAllEmployeePayRates, addEmployeePayRate, updateEmployeePayRate, deleteEmployeePayRate, getEmployeePayRateBySiteAndEmployee, getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllAllocations } from "@/lib/firebase/siteEmployeeAllocations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const EmployeePayRateCard = () => {
  const [searchValue, setSearchValue] = useState("");
  const [payRates, setPayRates] = useState<EmployeePayRate[]>([]);
  const [allocations, setAllocations] = useState<SiteEmployeeAllocation[]>([]);
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
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
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
        const [fetchedPayRates, fetchedAllocations, fetchedSites, fetchedEmployees] = await Promise.all([
          getAllEmployeePayRates(),
          getAllAllocations(),
          getAllSites(),
          getAllEmployees(),
        ]);
        setPayRates(fetchedPayRates);
        setAllocations(fetchedAllocations);
        setSites(fetchedSites.filter(s => s.status === "active"));
        // Filter out clients and inactive employees
        setEmployees(fetchedEmployees.filter(e => e.status === "active" && (!e.type || e.type === "employee")));
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

  // Get employees for a site, using allocations as source of truth and matching with pay rates
  const getEmployeesForSite = useCallback((siteId: string): EmployeePayRate[] => {
    // Get all allocations for this site, sorted by employeeNumber
    const siteAllocations = allocations
      .filter(alloc => alloc.siteId === siteId)
      .sort((a, b) => a.employeeNumber - b.employeeNumber);

    // For each allocation, find or create a pay rate entry
    const employeesWithPayRates: EmployeePayRate[] = siteAllocations.map(alloc => {
      // Try to find existing pay rate for this employee and site
      const existingPayRate = payRates.find(
        pr => pr.siteId === siteId && pr.employeeId === alloc.employeeId
      );

      if (existingPayRate) {
        return existingPayRate;
      }

      // If no pay rate exists, create a placeholder that will show the employee but no rate
      // This allows the UI to show all assigned employees even without pay rates
      return {
        id: `placeholder-${alloc.id}`,
        siteId: alloc.siteId,
        siteName: alloc.siteName,
        employeeId: alloc.employeeId,
        employeeName: alloc.employeeName,
        hourlyRate: 0,
        travelAllowance: undefined,
        notes: undefined,
        createdAt: alloc.createdAt,
        updatedAt: alloc.updatedAt,
      } as EmployeePayRate;
    });

    return employeesWithPayRates;
  }, [allocations, payRates]);

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
      const [updatedPayRates, updatedAllocations] = await Promise.all([
        getAllEmployeePayRates(),
        getAllAllocations(),
      ]);
      setPayRates(updatedPayRates);
      setAllocations(updatedAllocations);
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
      const [updatedPayRates, updatedAllocations] = await Promise.all([
        getAllEmployeePayRates(),
        getAllAllocations(),
      ]);
      setPayRates(updatedPayRates);
      setAllocations(updatedAllocations);
    } catch (error) {
      console.error("Error deleting pay rate:", error);
      toast.error("Failed to delete pay rate. Please try again.");
    }
  };

  const formatPayRate = (payRate: EmployeePayRate): string => {
    // Check if this is a placeholder (no actual pay rate set)
    if (payRate.id.startsWith('placeholder-') && payRate.hourlyRate === 0) {
      return "-";
    }
    let rate = `$${payRate.hourlyRate}`;
    if (payRate.travelAllowance) {
      rate += ` + $${payRate.travelAllowance} Travel Allowance`;
    }
    if (payRate.notes) {
      rate += ` ${payRate.notes}`;
    }
    return rate;
  };

  // Calculate statistics
  const totalSites = filteredSites.length;
  const totalEmployees = useMemo(() => {
    return filteredSites.reduce((sum, site) => sum + getEmployeesForSite(site.id).length, 0);
  }, [filteredSites, getEmployeesForSite]);
  const avgRate = useMemo(() => {
    const rates = payRates.filter(pr => pr.hourlyRate > 0).map(pr => pr.hourlyRate);
    if (rates.length === 0) return 0;
    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  }, [payRates]);

  return (
    <div className="space-y-6">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border shadow-lg">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 dark:bg-primary/20">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Employee Pay Rate Card
                  </h1>
                  <p className="text-muted-foreground mt-1">Manage and track employee pay rates across all sites</p>
                </div>
              </div>
            </div>
            <Button onClick={handleAddPayRate} size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Plus className="mr-2 h-5 w-5" />
              Add Pay Rate
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
                  <p className="text-2xl font-bold mt-1">{totalSites}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 dark:bg-blue-500/20">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Employees</p>
                  <p className="text-2xl font-bold mt-1">{totalEmployees}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 dark:bg-green-500/20">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-background/80 backdrop-blur-sm border p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Hourly Rate</p>
                  <p className="text-2xl font-bold mt-1">${avgRate.toFixed(0)}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 dark:bg-purple-500/20">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-lg border-2">
        <CardHeader className="bg-muted/30 dark:bg-muted/20 border-b">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Pay Rate Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Browse and manage pay rates by site</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="shadow-sm"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="shadow-sm"
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by site name or client..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-12 h-12 text-base shadow-sm border-2 focus:border-primary/50 transition-colors"
            />
          </div>

          {viewMode === "card" ? (
            // Card View
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading pay rates...</span>
                </div>
              ) : filteredSites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sites found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSites.map((site, siteIndex) => {
                    const siteEmployees = getEmployeesForSite(site.id);
                    const gradientColors = [
                      "from-orange-500/20 via-orange-500/10 to-transparent border-orange-500/30 dark:from-orange-500/30 dark:via-orange-500/20 dark:to-transparent dark:border-orange-500/50",
                      "from-yellow-500/20 via-yellow-500/10 to-transparent border-yellow-500/30 dark:from-yellow-500/30 dark:via-yellow-500/20 dark:to-transparent dark:border-yellow-500/50",
                      "from-green-500/20 via-green-500/10 to-transparent border-green-500/30 dark:from-green-500/30 dark:via-green-500/20 dark:to-transparent dark:border-green-500/50",
                      "from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30 dark:from-blue-500/30 dark:via-blue-500/20 dark:to-transparent dark:border-blue-500/50",
                      "from-purple-500/20 via-purple-500/10 to-transparent border-purple-500/30 dark:from-purple-500/30 dark:via-purple-500/20 dark:to-transparent dark:border-purple-500/50",
                      "from-red-500/20 via-red-500/10 to-transparent border-red-500/30 dark:from-red-500/30 dark:via-red-500/20 dark:to-transparent dark:border-red-500/50",
                      "from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/30 dark:from-cyan-500/30 dark:via-cyan-500/20 dark:to-transparent dark:border-cyan-500/50",
                    ];
                    const gradientColor = gradientColors[siteIndex % gradientColors.length];

                    return (
                      <Card 
                        key={site.id} 
                        className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group`}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                        <CardHeader className="relative pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg font-bold mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                {site.name}
                              </CardTitle>
                              {site.clientName && (
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {site.clientName}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="shrink-0 bg-background/50 backdrop-blur-sm">
                              {siteEmployees.length} {siteEmployees.length === 1 ? 'employee' : 'employees'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="relative space-y-3 pt-2">
                          {siteEmployees.length === 0 ? (
                            <div className="text-center py-8 rounded-lg border-2 border-dashed bg-muted/30">
                              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                              <p className="text-sm text-muted-foreground font-medium">No employees assigned</p>
                            </div>
                          ) : (
                            siteEmployees.map((payRate, index) => (
                              <div
                                key={payRate.id || index}
                                className="group/emp relative p-4 rounded-xl border bg-background/80 backdrop-blur-sm hover:bg-background hover:shadow-md transition-all duration-200 hover:border-primary/50"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Button
                                        variant="link"
                                        className="h-auto p-0 text-left font-bold justify-start hover:text-primary transition-colors text-base"
                                        onClick={() => {
                                          if (!payRate.id.startsWith('placeholder-')) {
                                            handleEditPayRate(payRate);
                                          } else {
                                            setFormData({
                                              siteId: payRate.siteId,
                                              employeeId: payRate.employeeId,
                                              hourlyRate: "",
                                              travelAllowance: "",
                                              notes: "",
                                            });
                                            setIsAddDialogOpen(true);
                                          }
                                        }}
                                      >
                                        {payRate.employeeName}
                                      </Button>
                                      <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                                        #{index + 1}
                                      </Badge>
                                    </div>
                                    {payRate.id.startsWith('placeholder-') && payRate.hourlyRate === 0 ? (
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <DollarSign className="h-4 w-4" />
                                        <span>No rate set</span>
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-baseline gap-2">
                                          <span className="text-2xl font-bold text-foreground">
                                            ${payRate.hourlyRate.toLocaleString()}
                                          </span>
                                          <span className="text-sm font-medium text-muted-foreground">/hr</span>
                                        </div>
                                        {payRate.travelAllowance && (
                                          <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 px-2 py-1 rounded-md w-fit">
                                            <TrendingUp className="h-3 w-3" />
                                            + ${payRate.travelAllowance.toLocaleString()} Travel
                                          </div>
                                        )}
                                        {payRate.notes && (
                                          <div className="text-xs text-muted-foreground italic bg-muted/50 px-2 py-1 rounded border-l-2 border-primary/30">
                                            {payRate.notes}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  {!payRate.id.startsWith('placeholder-') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
                                      onClick={() => handleEditPayRate(payRate)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Modern Table View
            <div className="rounded-xl border-2 overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b-2">
                      <TableHead className="font-bold text-base sticky left-0 z-30 bg-background border-r-2 border-primary/20 min-w-[220px] shadow-[2px_0_4px_rgba(0,0,0,0.1)]">
                        Cleaning Site
                      </TableHead>
                      {Array.from({ length: maxEmployeesPerSite }, (_, i) => (
                        <React.Fragment key={i}>
                          <TableHead className="font-bold text-base min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Employee {i + 1}
                            </div>
                          </TableHead>
                          <TableHead className="font-bold text-base min-w-[150px]">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Hourly Rate
                            </div>
                          </TableHead>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={maxEmployeesPerSite * 2 + 1} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-muted-foreground font-medium">Loading pay rates...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredSites.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={maxEmployeesPerSite * 2 + 1} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Building2 className="h-12 w-12 text-muted-foreground/30" />
                            <span className="text-muted-foreground font-medium">No sites found</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSites.map((site, siteIndex) => {
                        const siteEmployees = getEmployeesForSite(site.id);
                        const rows: (EmployeePayRate | null)[] = [];
                        for (let i = 0; i < maxEmployeesPerSite; i++) {
                          rows.push(siteEmployees[i] || null);
                        }

                        // Modern gradient row colors
                        const rowGradients = [
                          "bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent border-l-4 border-orange-500/50",
                          "bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-l-4 border-yellow-500/50",
                          "bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent border-l-4 border-green-500/50",
                          "bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-l-4 border-blue-500/50",
                          "bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-l-4 border-purple-500/50",
                          "bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent border-l-4 border-red-500/50",
                          "bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border-l-4 border-cyan-500/50",
                        ];
                        const rowGradient = rowGradients[siteIndex % rowGradients.length];

                        // Sticky cell background that matches the row gradient - using solid backgrounds to hide content behind
                        const stickyCellBg = [
                          "bg-gradient-to-r from-orange-500/20 via-orange-500/15 to-orange-500/10 dark:from-orange-500/30 dark:via-orange-500/25 dark:to-orange-500/20 border-r-2 border-orange-500/30 dark:border-orange-500/50",
                          "bg-gradient-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 dark:from-yellow-500/30 dark:via-yellow-500/25 dark:to-yellow-500/20 border-r-2 border-yellow-500/30 dark:border-yellow-500/50",
                          "bg-gradient-to-r from-green-500/20 via-green-500/15 to-green-500/10 dark:from-green-500/30 dark:via-green-500/25 dark:to-green-500/20 border-r-2 border-green-500/30 dark:border-green-500/50",
                          "bg-gradient-to-r from-blue-500/20 via-blue-500/15 to-blue-500/10 dark:from-blue-500/30 dark:via-blue-500/25 dark:to-blue-500/20 border-r-2 border-blue-500/30 dark:border-blue-500/50",
                          "bg-gradient-to-r from-purple-500/20 via-purple-500/15 to-purple-500/10 dark:from-purple-500/30 dark:via-purple-500/25 dark:to-purple-500/20 border-r-2 border-purple-500/30 dark:border-purple-500/50",
                          "bg-gradient-to-r from-red-500/20 via-red-500/15 to-red-500/10 dark:from-red-500/30 dark:via-red-500/25 dark:to-red-500/20 border-r-2 border-red-500/30 dark:border-red-500/50",
                          "bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-cyan-500/10 dark:from-cyan-500/30 dark:via-cyan-500/25 dark:to-cyan-500/20 border-r-2 border-cyan-500/30 dark:border-cyan-500/50",
                        ];
                        const stickyBg = stickyCellBg[siteIndex % stickyCellBg.length];

                        return (
                          <TableRow key={site.id} className={`${rowGradient} hover:shadow-md transition-all duration-200`}>
                            <TableCell className={`font-bold text-base sticky left-0 z-20 ${stickyBg} min-w-[220px] border-l-4 shadow-[2px_0_8px_rgba(0,0,0,0.15)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)]`}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                {site.name}
                              </div>
                              {site.clientName && (
                                <p className="text-xs text-muted-foreground mt-1">{site.clientName}</p>
                              )}
                            </TableCell>
                            {rows.map((payRate, index) => (
                              <React.Fragment key={index}>
                                <TableCell className="py-4 min-w-[180px]">
                                  {payRate ? (
                                    <Button
                                      variant="link"
                                      className="h-auto p-0 text-left font-semibold justify-start hover:text-primary transition-colors"
                                      onClick={() => {
                                        if (!payRate.id.startsWith('placeholder-')) {
                                          handleEditPayRate(payRate);
                                        } else {
                                          setFormData({
                                            siteId: payRate.siteId,
                                            employeeId: payRate.employeeId,
                                            hourlyRate: "",
                                            travelAllowance: "",
                                            notes: "",
                                          });
                                          setIsAddDialogOpen(true);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                                          #{index + 1}
                                        </Badge>
                                        {payRate.employeeName}
                                      </div>
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground/50">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-4 min-w-[150px]">
                                  {payRate ? (
                                    <div className="space-y-1">
                                      <div className="font-bold text-lg text-foreground">
                                        ${payRate.hourlyRate.toLocaleString()}/hr
                                      </div>
                                      {payRate.travelAllowance && (
                                        <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                          + ${payRate.travelAllowance.toLocaleString()} Travel
                                        </div>
                                      )}
                                      {payRate.notes && (
                                        <div className="text-xs text-muted-foreground italic">
                                          {payRate.notes}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/50">-</span>
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
            </div>
          )}
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

      {/* Salary Calculator Section */}
      <Separator className="my-8" />
      <SalaryCalculatorSection employees={employees} />
    </div>
  );
};

// Salary Calculator Component integrated into Pay Rates page
interface SalaryCalculatorSectionProps {
  employees: Employee[];
}

const SalaryCalculatorSection = ({ employees: allEmployees }: SalaryCalculatorSectionProps) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [payRates, setPayRates] = useState<EmployeePayRate[]>([]);
  const [calculations, setCalculations] = useState<Array<{
    siteId: string;
    siteName: string;
    hourlyRate: number;
    travelAllowance: number;
    hoursWorked: number;
    subtotal: number;
  }>>([]);
  const [isLoadingPayRates, setIsLoadingPayRates] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadPayRates(selectedEmployeeId);
      const employee = allEmployees.find((emp) => emp.id === selectedEmployeeId);
      setSelectedEmployee(employee || null);
    } else {
      setPayRates([]);
      setCalculations([]);
      setSelectedEmployee(null);
    }
  }, [selectedEmployeeId, allEmployees]);

  const loadPayRates = async (employeeId: string) => {
    try {
      setIsLoadingPayRates(true);
      const fetchedPayRates = await getEmployeePayRatesByEmployee(employeeId);
      setPayRates(fetchedPayRates);

      const initialCalculations = fetchedPayRates.map((pr) => ({
        siteId: pr.siteId,
        siteName: pr.siteName,
        hourlyRate: pr.hourlyRate,
        travelAllowance: pr.travelAllowance || 0,
        hoursWorked: 0,
        subtotal: 0,
      }));
      setCalculations(initialCalculations);
    } catch (error) {
      console.error("Error loading pay rates:", error);
      toast.error("Failed to load pay rates");
    } finally {
      setIsLoadingPayRates(false);
    }
  };

  const handleHoursChange = (siteId: string, hours: number) => {
    setCalculations((prev) =>
      prev.map((calc) => {
        if (calc.siteId === siteId) {
          const hoursWorked = Math.max(0, hours);
          const subtotal = hoursWorked * calc.hourlyRate + calc.travelAllowance;
          return { ...calc, hoursWorked, subtotal };
        }
        return calc;
      })
    );
  };

  const calculateTotal = () => {
    return calculations.reduce((sum, calc) => sum + calc.subtotal, 0);
  };

  const calculateTotalHours = () => {
    return calculations.reduce((sum, calc) => sum + calc.hoursWorked, 0);
  };

  const getInvoiceFrequencyLabel = (frequency?: string) => {
    switch (frequency) {
      case "Monthly":
        return "Monthly";
      case "Fortnightly":
        return "Fortnightly";
      case "Weekly":
        return "Weekly";
      default:
        return "Not set";
    }
  };

  const handleExport = () => {
    if (!selectedEmployee) return;

    const data = {
      employee: selectedEmployee.name,
      email: selectedEmployee.email,
      invoiceFrequency: selectedEmployee.invoiceCollectionFrequency || "Not set",
      date: new Date().toLocaleDateString(),
      calculations: calculations.map((calc) => ({
        site: calc.siteName,
        hourlyRate: calc.hourlyRate,
        hours: calc.hoursWorked,
        travelAllowance: calc.travelAllowance,
        subtotal: calc.subtotal,
      })),
      totalHours: calculateTotalHours(),
      totalSalary: calculateTotal(),
    };

    const content = `
Employee Salary Calculation Report
==================================
Employee: ${data.employee}
Email: ${data.email}
Invoice Frequency: ${data.invoiceFrequency}
Date: ${data.date}

Site Breakdown:
${data.calculations
  .map(
    (calc) => `
Site: ${calc.site}
  Hourly Rate: $${calc.hourlyRate.toFixed(2)}
  Hours Worked: ${calc.hours}
  Travel Allowance: $${calc.travelAllowance.toFixed(2)}
  Subtotal: $${calc.subtotal.toFixed(2)}
`
  )
  .join("")}
Total Hours: ${data.totalHours}
Total Salary: $${data.totalSalary.toFixed(2)}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-calculation-${selectedEmployee.name}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Calculation exported successfully");
  };

  const totalSalary = calculateTotal();
  const totalHours = calculateTotalHours();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Salary Calculator</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate employee salaries based on pay rates and hours worked
          </p>
        </CardHeader>
        <CardContent>
          <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={employeePopoverOpen}
                className="w-full justify-between"
              >
                {selectedEmployee
                  ? `${selectedEmployee.name}${selectedEmployee.email ? ` (${selectedEmployee.email})` : ""}`
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
                    {allEmployees.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={`${employee.name} ${employee.email || ""}`}
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
                        <div className="flex flex-col">
                          <span>{employee.name}</span>
                          {employee.email && (
                            <span className="text-xs text-muted-foreground">{employee.email}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Employee Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployee.name} - {selectedEmployee.role || "N/A"}
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                Invoice Frequency: {getInvoiceFrequencyLabel(selectedEmployee.invoiceCollectionFrequency)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{selectedEmployee.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <p className="text-sm font-medium">{selectedEmployee.phone || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Base Salary</Label>
                <p className="text-sm font-medium">
                  ${selectedEmployee.salary ? selectedEmployee.salary.toLocaleString() : "0"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Invoice Frequency</Label>
                <p className="text-sm font-medium">
                  {getInvoiceFrequencyLabel(selectedEmployee.invoiceCollectionFrequency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingPayRates && selectedEmployeeId ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-64 w-full bg-muted animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      ) : calculations.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Salary Calculation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter hours worked for each site to calculate the total salary
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Travel Allowance</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calc) => (
                      <TableRow key={calc.siteId}>
                        <TableCell className="font-medium">{calc.siteName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">${calc.hourlyRate.toFixed(2)}/hr</Badge>
                        </TableCell>
                        <TableCell>
                          {calc.travelAllowance > 0 ? (
                            <Badge variant="secondary">
                              ${calc.travelAllowance.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={calc.hoursWorked || ""}
                            onChange={(e) =>
                              handleHoursChange(calc.siteId, parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${calc.subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Hours</Label>
                    <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Calculator className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Salary</Label>
                    <p className="text-2xl font-bold">${totalSalary.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Average Rate</Label>
                    <p className="text-2xl font-bold">
                      ${totalHours > 0 ? (totalSalary / totalHours).toFixed(2) : "0.00"}/hr
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleExport} disabled={totalHours === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Calculation
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : selectedEmployeeId && !isLoadingPayRates ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No pay rates found for this employee. Please add pay rates first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default EmployeePayRateCard;

