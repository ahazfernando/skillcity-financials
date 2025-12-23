"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Loader2, 
  Trash2, 
  Edit, 
  Plus, 
  Calendar as CalendarIcon,
  Filter,
  LayoutGrid,
  Table2,
  X,
  Image as ImageIcon,
  Clock,
  DollarSign,
  Building2,
  User,
  FileText,
  Users,
  Sparkles,
  Award,
  Briefcase,
  Star,
  Zap,
  Shield,
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2 } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CleaningTrackerEntry, CleaningTrackerCleaner, Site, SiteEmployeeAllocation } from "@/types/financial";
import {
  getAllCleaningTrackerEntries,
  addCleaningTrackerEntry,
  updateCleaningTrackerEntry,
  deleteCleaningTrackerEntry,
} from "@/lib/firebase/cleaningTracker";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllocationsBySite } from "@/lib/firebase/siteEmployeeAllocations";
import { getEmployeePayRateBySiteAndEmployee } from "@/lib/firebase/employeePayRates";
import { toast } from "sonner";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "card";

const CleaningTracker = () => {
  const [entries, setEntries] = useState<CleaningTrackerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filters
  const [searchValue, setSearchValue] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [workedHoursRange, setWorkedHoursRange] = useState<[number, number]>([0, 10]);
  const [photosFilter, setPhotosFilter] = useState<string>("all"); // "all" | "yes" | "no"
  
  // Data for dropdowns
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Site employees for modal display
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [siteEmployees, setSiteEmployees] = useState<SiteEmployeeAllocation[]>([]);
  const [isLoadingSiteEmployees, setIsLoadingSiteEmployees] = useState(false);
  // Store pay rates for each employee (key: employeeId, value: hourlyRate)
  const [employeePayRates, setEmployeePayRates] = useState<Record<string, number>>({});
  
  // Form data
  const [formData, setFormData] = useState({
    month: "",
    workDate: "",
    siteName: "",
    cleaners: [] as CleaningTrackerCleaner[],
  });

  // Track selected employee IDs for each cleaner (to show which cards are selected)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  
  // Selected date for Calendar component
  const [selectedWorkDate, setSelectedWorkDate] = useState<Date | undefined>(undefined);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedEntries, fetchedSites, fetchedEmployees] = await Promise.all([
          getAllCleaningTrackerEntries(),
          getAllSites(),
          getAllEmployees(),
        ]);
        setEntries(fetchedEntries);
        setSites(fetchedSites);
        setEmployees(fetchedEmployees);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter (by cleaner name or site name)
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const matchesSearch = 
          entry.siteName.toLowerCase().includes(searchLower) ||
          entry.cleaners.some(c => c.cleanerName.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Date range filter
      if (dateRange?.from || dateRange?.to) {
        const entryDate = new Date(entry.workDate);
        if (dateRange.from && entryDate < dateRange.from) return false;
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (entryDate > toDate) return false;
        }
      }

      // Site filter
      if (selectedSite !== "all" && entry.siteName !== selectedSite) {
        return false;
      }

      // Worked hours range filter
      const hasMatchingHours = entry.cleaners.some(
        (cleaner) =>
          cleaner.workedHours >= workedHoursRange[0] &&
          cleaner.workedHours <= workedHoursRange[1]
      );
      if (!hasMatchingHours) return false;

      // Photos filter
      if (photosFilter === "yes") {
        const hasPhotos = entry.cleaners.some((c) => c.photosUploaded);
        if (!hasPhotos) return false;
      } else if (photosFilter === "no") {
        const allNoPhotos = entry.cleaners.every((c) => !c.photosUploaded);
        if (!allNoPhotos) return false;
      }

      return true;
    });
  }, [entries, searchValue, dateRange, selectedSite, workedHoursRange, photosFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      month: "",
      workDate: "",
      siteName: "",
      cleaners: [],
    });
    setSelectedWorkDate(undefined);
    setSelectedSiteId("");
    setSiteEmployees([]);
    setEditingEntryId(null);
    setSelectedEmployeeIds([]);
    setEmployeePayRates({});
  };

  // Add cleaner to form (when employee card is clicked)
  const addCleanerFromEmployee = (employeeId: string, employeeName: string) => {
    // Check if this employee is already added as a cleaner
    if (selectedEmployeeIds.includes(employeeId)) {
      // If already selected, remove it (deselect)
      const cleanerIndex = formData.cleaners.findIndex(
        (c) => c.cleanerName === employeeName
      );
      if (cleanerIndex !== -1) {
        removeCleaner(cleanerIndex);
      }
      return;
    }

    // Get initial service charge based on hourly rate (if available)
    const hourlyRate = employeePayRates[employeeId] || 0;
    const initialServiceCharge = 0; // Will be calculated when hours are entered

    setFormData({
      ...formData,
      cleaners: [
        ...formData.cleaners,
        {
          cleanerName: employeeName,
          workedHours: 0,
          serviceCharge: initialServiceCharge,
          photosUploaded: false,
        },
      ],
    });
    setSelectedEmployeeIds([...selectedEmployeeIds, employeeId]);
  };

  // Add cleaner to form (manual add button - for backward compatibility)
  const addCleaner = () => {
    // Only allow manual add if site is not selected or no employees available
    if (!selectedSiteId || siteEmployees.length === 0) {
      setFormData({
        ...formData,
        cleaners: [
          ...formData.cleaners,
          {
            cleanerName: "",
            workedHours: 0,
            serviceCharge: 0,
            photosUploaded: false,
          },
        ],
      });
    } else {
      toast.info("Please select an employee from the cards above");
    }
  };

  // Remove cleaner from form
  const removeCleaner = (index: number) => {
    const cleanerToRemove = formData.cleaners[index];
    // Find the employee ID for this cleaner
    const employeeId = siteEmployees.find(
      (alloc) => alloc.employeeName === cleanerToRemove.cleanerName
    )?.employeeId;
    
    setFormData({
      ...formData,
      cleaners: formData.cleaners.filter((_, i) => i !== index),
    });
    
    // Remove from selected employee IDs if found
    if (employeeId) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((id) => id !== employeeId));
    }
  };

  // Update cleaner in form
  const updateCleaner = (index: number, updates: Partial<CleaningTrackerCleaner>) => {
    const updatedCleaners = [...formData.cleaners];
    const cleaner = updatedCleaners[index];
    const newUpdates = { ...updates };
    
    // Auto-calculate service charge when hours worked changes
    if (updates.workedHours !== undefined) {
      const cleanerName = cleaner.cleanerName;
      // Find the employee allocation to get employee ID
      const allocation = siteEmployees.find(alloc => alloc.employeeName === cleanerName);
      if (allocation && employeePayRates[allocation.employeeId]) {
        const hourlyRate = employeePayRates[allocation.employeeId];
        const hours = updates.workedHours || 0;
        newUpdates.serviceCharge = Math.round(hours * hourlyRate * 100) / 100; // Round to 2 decimal places
      }
    }
    
    updatedCleaners[index] = { ...cleaner, ...newUpdates };
    setFormData({ ...formData, cleaners: updatedCleaners });
  };

  // Handle edit
  const handleEdit = (entry: CleaningTrackerEntry) => {
    setEditingEntryId(entry.id);
    const workDateObj = entry.workDate ? new Date(entry.workDate) : undefined;
    setSelectedWorkDate(workDateObj);
    
    // Find site ID for the selected site name
    const site = sites.find((s) => s.name === entry.siteName);
    setSelectedSiteId(site?.id || "");
    
    setFormData({
      month: entry.month,
      workDate: entry.workDate,
      siteName: entry.siteName,
      cleaners: entry.cleaners.map((c) => ({ ...c })),
    });
    
    // Set selected employee IDs based on cleaner names
    // This will be updated when site employees load
    setIsEditDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (entry: CleaningTrackerEntry) => {
    setDeletingEntryId(entry.id);
    setIsDeleteDialogOpen(true);
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!formData.workDate || !formData.siteName || formData.cleaners.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate cleaners
    for (const cleaner of formData.cleaners) {
      if (!cleaner.cleanerName || cleaner.workedHours <= 0) {
        toast.error("Please fill in all cleaner details");
        return;
      }
    }

    try {
      setIsSaving(true);

      if (editingEntryId) {
        // Update
        await updateCleaningTrackerEntry(editingEntryId, {
          month: formData.month,
          workDate: formData.workDate,
          siteName: formData.siteName,
          cleaners: formData.cleaners,
        });
        toast.success("Entry updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add
        await addCleaningTrackerEntry({
          month: formData.month,
          workDate: formData.workDate,
          siteName: formData.siteName,
          cleaners: formData.cleaners,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast.success("Entry added successfully!");
        setIsAddDialogOpen(false);
      }

      // Reload entries
      const updatedEntries = await getAllCleaningTrackerEntries();
      setEntries(updatedEntries);
      resetForm();
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error(`Failed to ${editingEntryId ? "update" : "add"} entry. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingEntryId) return;

    try {
      await deleteCleaningTrackerEntry(deletingEntryId);
      const updatedEntries = await getAllCleaningTrackerEntries();
      setEntries(updatedEntries);
      toast.success("Entry deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingEntryId(null);
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry. Please try again.");
    }
  };

  // Get month name from date
  const getMonthFromDate = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, "MMMM");
  };

  // Load site employees when site is selected
  useEffect(() => {
    if (selectedSiteId && sites.length > 0) {
      loadSiteEmployees(selectedSiteId);
    } else {
      setSiteEmployees([]);
      setSelectedEmployeeIds([]);
    }
  }, [selectedSiteId, sites]);

  // Update selected employee IDs when site employees load and we're editing
  const cleanerNamesString = useMemo(
    () => formData.cleaners.map((c) => c.cleanerName).join(","),
    [formData.cleaners]
  );

  useEffect(() => {
    if (siteEmployees.length > 0 && formData.cleaners.length > 0) {
      const employeeIds = formData.cleaners
        .map((cleaner) => {
          const allocation = siteEmployees.find(
            (alloc) => alloc.employeeName === cleaner.cleanerName
          );
          return allocation?.employeeId;
        })
        .filter((id): id is string => !!id);
      setSelectedEmployeeIds(employeeIds);
    } else if (formData.cleaners.length === 0) {
      // Clear selected IDs if no cleaners
      setSelectedEmployeeIds([]);
    }
  }, [siteEmployees, cleanerNamesString, formData.cleaners.length]);

  const loadSiteEmployees = async (siteId: string) => {
    try {
      setIsLoadingSiteEmployees(true);
      const allocations = await getAllocationsBySite(siteId);
      setSiteEmployees(allocations);
      
      // Load pay rates for each employee at this site
      const payRatesMap: Record<string, number> = {};
      for (const allocation of allocations) {
        try {
          const payRate = await getEmployeePayRateBySiteAndEmployee(siteId, allocation.employeeId);
          if (payRate) {
            payRatesMap[allocation.employeeId] = payRate.hourlyRate;
          }
        } catch (error) {
          console.error(`Error loading pay rate for employee ${allocation.employeeId}:`, error);
        }
      }
      setEmployeePayRates(payRatesMap);
    } catch (error) {
      console.error("Error loading site employees:", error);
      toast.error("Failed to load site employees");
    } finally {
      setIsLoadingSiteEmployees(false);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchValue("");
    setDateRange(undefined);
    setSelectedSite("all");
    setWorkedHoursRange([0, 10]);
    setPhotosFilter("all");
  };

  const hasActiveFilters = 
    searchValue !== "" ||
    dateRange?.from ||
    dateRange?.to ||
    selectedSite !== "all" ||
    workedHoursRange[0] !== 0 ||
    workedHoursRange[1] !== 10 ||
    photosFilter !== "all";

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-background border border-emerald-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Cleaning Tracker
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track cleaning jobs, hours worked, and service charges
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            size="lg"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-muted/30 border-b-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Filter cleaning tracker entries
              </p>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search by Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cleaner or site..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Site Filter */}
            <div className="space-y-2">
              <Label>Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger>
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.name}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Worked Hours Range */}
            <div className="space-y-2">
              <Label>Worked Hours: {workedHoursRange[0]} - {workedHoursRange[1]} hrs</Label>
              <Slider
                value={workedHoursRange}
                onValueChange={(value) => setWorkedHoursRange(value as [number, number])}
                min={0}
                max={10}
                step={0.25}
                className="w-full mt-2"
              />
            </div>

            {/* Photos Filter */}
            <div className="space-y-2">
              <Label>Photos Uploaded</Label>
              <Select value={photosFilter} onValueChange={setPhotosFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-muted/30 border-b-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">
                Cleaning Entries ({filteredEntries.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredEntries.length === entries.length
                  ? "All entries"
                  : `Filtered from ${entries.length} total entries`}
              </p>
            </div>
            {/* View Mode Toggle */}
            <div className="space-y-2">
              <Label>View Mode</Label>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
                className="justify-start"
              >
                <ToggleGroupItem value="table" aria-label="Table view">
                  <Table2 className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading entries...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No entries found</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-xl border-2 overflow-x-auto shadow-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/5 border-b-2">
                    <TableHead className="font-bold">Work ID</TableHead>
                    <TableHead className="font-bold">Month</TableHead>
                    <TableHead className="font-bold">Work Date</TableHead>
                    <TableHead className="font-bold">Site Name</TableHead>
                    <TableHead className="font-bold">Cleaner Name</TableHead>
                    <TableHead className="font-bold">Worked Hours</TableHead>
                    <TableHead className="font-bold">Service Charge</TableHead>
                    <TableHead className="font-bold">Special Notes</TableHead>
                    <TableHead className="font-bold">Photos</TableHead>
                    <TableHead className="font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) =>
                    entry.cleaners.map((cleaner, cleanerIndex) => (
                      <TableRow
                        key={`${entry.id}-${cleanerIndex}`}
                        className="hover:bg-gradient-to-r hover:from-emerald-500/5 hover:to-transparent transition-all duration-200"
                      >
                        {cleanerIndex === 0 && (
                          <>
                            <TableCell
                              rowSpan={entry.cleaners.length}
                              className="font-semibold"
                            >
                              {entry.workId}
                            </TableCell>
                            <TableCell
                              rowSpan={entry.cleaners.length}
                            >
                              {entry.month || getMonthFromDate(entry.workDate)}
                            </TableCell>
                            <TableCell
                              rowSpan={entry.cleaners.length}
                            >
                              {format(new Date(entry.workDate), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell
                              rowSpan={entry.cleaners.length}
                              className="font-medium"
                            >
                              {entry.siteName}
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800">
                            {cleaner.cleanerName}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">{cleaner.workedHours} hrs</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            <span className="font-semibold text-green-600">
                              ${cleaner.serviceCharge.toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cleaner.specialNotes ? (
                            <div className="max-w-xs">
                              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                                {cleaner.specialNotes}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={cleaner.photosUploaded ? "default" : "outline"}
                            className={
                              cleaner.photosUploaded
                                ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                                : "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
                            }
                          >
                            {cleaner.photosUploaded ? (
                              <span className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Yes
                              </span>
                            ) : (
                              "No"
                            )}
                          </Badge>
                        </TableCell>
                        {cleanerIndex === 0 && (
                          <TableCell
                            rowSpan={entry.cleaners.length}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEntries.map((entry, entryIndex) => {
                const gradientColors = [
                  "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50",
                  "from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent dark:border-purple-500/50",
                  "from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50",
                  "from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent dark:border-orange-500/50",
                  "from-pink-500/10 via-pink-500/5 to-transparent border-pink-500/30 dark:from-pink-500/20 dark:via-pink-500/10 dark:to-transparent dark:border-pink-500/50",
                  "from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/30 dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-transparent dark:border-indigo-500/50",
                  "from-teal-500/10 via-teal-500/5 to-transparent border-teal-500/30 dark:from-teal-500/20 dark:via-teal-500/10 dark:to-transparent dark:border-teal-500/50",
                  "from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/30 dark:from-cyan-500/20 dark:via-cyan-500/10 dark:to-transparent dark:border-cyan-500/50",
                ];
                const gradientColor = gradientColors[entryIndex % gradientColors.length];
                
                return (
                  <Card 
                    key={entry.id} 
                    className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                    <CardHeader className="pb-3 relative">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="font-mono font-bold text-xs">
                              ID: {entry.workId}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {entry.month || getMonthFromDate(entry.workDate)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>{format(new Date(entry.workDate), "dd MMM yyyy")}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entry)}
                            className="h-8 w-8 p-0 hover:bg-background/50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entry)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 relative">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-background/30 backdrop-blur-sm">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">{entry.siteName}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Cleaners ({entry.cleaners.length})
                        </Label>
                        {entry.cleaners.map((cleaner, cleanerIndex) => {
                          const cleanerGradientColors = [
                            "from-slate-500/10 via-slate-500/5 to-transparent border-slate-500/20",
                            "from-gray-500/10 via-gray-500/5 to-transparent border-gray-500/20",
                          ];
                          const cleanerGradient = cleanerGradientColors[cleanerIndex % cleanerGradientColors.length];
                          
                          return (
                            <div
                              key={cleanerIndex}
                              className={`p-3 rounded-lg border bg-gradient-to-br ${cleanerGradient} space-y-2.5`}
                            >
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="bg-background/50 font-medium">
                                  <User className="h-3 w-3 mr-1.5" />
                                  {cleaner.cleanerName}
                                </Badge>
                                <Badge
                                  variant={cleaner.photosUploaded ? "default" : "outline"}
                                  className={
                                    cleaner.photosUploaded
                                      ? "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30"
                                      : "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30"
                                  }
                                >
                                  {cleaner.photosUploaded ? (
                                    <span className="flex items-center gap-1">
                                      <ImageIcon className="h-3 w-3" />
                                      Photos
                                    </span>
                                  ) : (
                                    "No Photos"
                                  )}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="flex items-center gap-2 p-2 rounded-md bg-background/30">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Hours</span>
                                    <span className="font-semibold text-sm">{cleaner.workedHours} hrs</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-md bg-background/30">
                                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Charge</span>
                                    <span className="font-semibold text-sm text-green-600 dark:text-green-400">
                                      ${cleaner.serviceCharge.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {cleaner.specialNotes && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-1.5 rounded">
                                    <FileText className="h-3 w-3 inline mr-1" />
                                    {cleaner.specialNotes}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
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
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle>
              {editingEntryId ? "Edit Cleaning Entry" : "Add Cleaning Entry"}
            </DialogTitle>
            <DialogDescription>
              {editingEntryId
                ? "Update the cleaning entry details. All fields match the table columns."
                : "Fill in all the cleaning tracker information. All fields correspond to the table columns."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Work ID Display (when editing) */}
            {editingEntryId && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Work ID:</Label>
                  <Badge variant="outline" className="font-mono">
                    {entries.find((e) => e.id === editingEntryId)?.workId || "N/A"}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    (Auto-generated, cannot be edited)
                  </span>
                </div>
              </div>
            )}

            {/* Basic Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <Label className="text-base font-semibold">Basic Information</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workDate">
                    Work Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="workDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedWorkDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedWorkDate ? (
                          format(selectedWorkDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedWorkDate}
                        onSelect={(date) => {
                          setSelectedWorkDate(date);
                          if (date) {
                            const dateString = date.toISOString().split("T")[0];
                            setFormData({
                              ...formData,
                              workDate: dateString,
                              month: getMonthFromDate(dateString),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              workDate: "",
                              month: "",
                            });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Month</Label>
                  <Input
                    id="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    placeholder="November"
                  />
                  <p className="text-xs text-muted-foreground">
                    Auto-filled from work date, or enter manually
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteName">
                    Site Name <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.siteName}
                    onValueChange={(value) => {
                      const site = sites.find((s) => s.name === value);
                      const newSiteId = site?.id || "";
                      
                      // If site changed, clear cleaners and selected employees
                      if (selectedSiteId && selectedSiteId !== newSiteId && formData.cleaners.length > 0) {
                        setFormData({ ...formData, siteName: value, cleaners: [] });
                        setSelectedEmployeeIds([]);
                      } else {
                        setFormData({ ...formData, siteName: value });
                      }
                      
                      setSelectedSiteId(newSiteId);
                    }}
                  >
                    <SelectTrigger id="siteName">
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.name}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Display employees at selected site - Full width second row */}
              {selectedSiteId && (
                <div className="space-y-3 mt-4">
                  {isLoadingSiteEmployees ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading employees...
                    </div>
                  ) : siteEmployees.length > 0 ? (
                    <div>
                      <Label className="mb-3 block text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Employees at this Site
                      </Label>
                      <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 pt-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/30">
                        {siteEmployees.map((allocation, index) => {
                              const gradientColors = [
                                "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50",
                                "from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent dark:border-purple-500/50",
                                "from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50",
                                "from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent dark:border-orange-500/50",
                                "from-pink-500/10 via-pink-500/5 to-transparent border-pink-500/30 dark:from-pink-500/20 dark:via-pink-500/10 dark:to-transparent dark:border-pink-500/50",
                                "from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/30 dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-transparent dark:border-indigo-500/50",
                              ];
                              const gradientColor = gradientColors[index % gradientColors.length];
                              
                              // Get employee details
                              const employee = employees.find((e) => e.id === allocation.employeeId);
                              const role = employee?.role || "Employee";
                              
                              // Get role icon
                              const getRoleIcon = () => {
                                const roleLower = role.toLowerCase();
                                if (roleLower.includes("manager") || roleLower.includes("supervisor")) {
                                  return <Shield className="h-3.5 w-3.5" />;
                                } else if (roleLower.includes("lead") || roleLower.includes("senior")) {
                                  return <Award className="h-3.5 w-3.5" />;
                                } else if (roleLower.includes("specialist") || roleLower.includes("expert")) {
                                  return <Star className="h-3.5 w-3.5" />;
                                } else if (roleLower.includes("cleaner") || roleLower.includes("professional")) {
                                  return <Sparkles className="h-3.5 w-3.5" />;
                                } else if (roleLower.includes("assistant") || roleLower.includes("junior")) {
                                  return <Zap className="h-3.5 w-3.5" />;
                                } else {
                                  return <Briefcase className="h-3.5 w-3.5" />;
                                }
                              };
                              
                              const isSelected = selectedEmployeeIds.includes(allocation.employeeId);
                              
                              return (
                                <Card
                                  key={allocation.id}
                                  onClick={() => {
                                    if (!isSelected) {
                                      addCleanerFromEmployee(allocation.employeeId, allocation.employeeName);
                                    }
                                  }}
                                  className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex-shrink-0 min-w-[200px] ${
                                    isSelected 
                                      ? "ring-2 ring-primary ring-offset-2 cursor-pointer border-primary" 
                                      : "cursor-pointer hover:border-primary/50"
                                  }`}
                                >
                                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 z-10">
                                      <CheckCircle2 className="h-5 w-5 text-primary fill-primary bg-background rounded-full" />
                                    </div>
                                  )}
                                  <CardContent className="p-4 relative">
                                    <div className="flex items-center gap-3">
                                      <Avatar className={`h-10 w-10 border-2 shadow-md flex-shrink-0 ${
                                        isSelected ? "border-primary" : "border-background"
                                      }`}>
                                        <AvatarFallback className={`bg-gradient-to-br ${
                                          gradientColor.includes("blue") 
                                            ? "from-blue-500 to-blue-600" 
                                            : gradientColor.includes("purple") 
                                            ? "from-purple-500 to-purple-600" 
                                            : gradientColor.includes("green") 
                                            ? "from-green-500 to-green-600" 
                                            : gradientColor.includes("orange") 
                                            ? "from-orange-500 to-orange-600" 
                                            : gradientColor.includes("pink") 
                                            ? "from-pink-500 to-pink-600" 
                                            : "from-indigo-500 to-indigo-600"
                                        } text-white text-sm font-semibold`}>
                                          {allocation.employeeName
                                            .split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">
                                          {allocation.employeeName}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className="text-primary">
                                            {getRoleIcon()}
                                          </span>
                                          <p className="text-xs text-muted-foreground truncate font-medium">
                                            {role}
                                          </p>
                                        </div>
                                        {allocation.actualWorkingTime && (
                                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{allocation.actualWorkingTime}</span>
                                          </div>
                                        )}
                                        {employeePayRates[allocation.employeeId] && (
                                          <div className="flex items-center gap-1 mt-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                                            <DollarSign className="h-3 w-3" />
                                            <span>${employeePayRates[allocation.employeeId].toFixed(2)}/hr</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border border-dashed">
                          No employees assigned to this site
                        </div>
                      )}
                    </div>
                  )}
              </div>

            {/* Cleaners Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">
                    Cleaners Information <span className="text-destructive">*</span>
                  </Label>
                </div>
                {(!selectedSiteId || siteEmployees.length === 0) && (
                  <Button type="button" variant="outline" size="sm" onClick={addCleaner}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Cleaner
                  </Button>
                )}
              </div>
              
              {selectedSiteId && siteEmployees.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Click on employee cards above to add them as cleaners</span>
                  </p>
                </div>
              )}

              {formData.cleaners.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="font-medium mb-1">No cleaners added</p>
                  <p className="text-sm">Click "Add Cleaner" to add cleaning information</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.cleaners.map((cleaner, index) => (
                    <Card key={index} className="p-5 border-2">
                      <div className="flex items-start justify-between mb-4 pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-semibold">
                            Cleaner {index + 1}
                          </Badge>
                          {formData.cleaners.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCleaner(index)}
                              className="text-destructive hover:text-destructive h-7 px-2"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Cleaner Name - Show selected employee or allow manual entry if no site selected */}
                        <div className="space-y-2">
                          <Label>
                            Cleaner Name <span className="text-destructive">*</span>
                          </Label>
                          {selectedSiteId && siteEmployees.length > 0 ? (
                            <>
                              <div className="flex items-center gap-2 p-3 rounded-lg border-2 bg-muted/30">
                                <User className="h-4 w-4 text-primary" />
                                <span className="font-medium">{cleaner.cleanerName || "Not selected"}</span>
                                {cleaner.cleanerName && (
                                  <Badge variant="secondary" className="ml-auto">
                                    Selected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Select an employee from the cards above
                              </p>
                            </>
                          ) : (
                            <Select
                              value={cleaner.cleanerName}
                              onValueChange={(value) =>
                                updateCleaner(index, { cleanerName: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select cleaner" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.name}>
                                    {emp.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Worked Hours */}
                        <div className="space-y-2">
                          <Label>
                            Worked Hours <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              max="24"
                              value={cleaner.workedHours || ""}
                              onChange={(e) =>
                                updateCleaner(index, {
                                  workedHours: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="2.5"
                              className="pl-9"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter hours (e.g., 2.5, 3, 3.5)
                          </p>
                        </div>

                        {/* Service Charge */}
                        <div className="space-y-2">
                          <Label>
                            Service Charge ($) <span className="text-destructive">*</span>
                          </Label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={cleaner.serviceCharge || ""}
                              onChange={(e) =>
                                updateCleaner(index, {
                                  serviceCharge: parseFloat(e.target.value) || 0,
                                })
                              }
                              placeholder="62.50"
                              className="pl-9"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const cleanerName = cleaner.cleanerName;
                              const allocation = siteEmployees.find(alloc => alloc.employeeName === cleanerName);
                              if (allocation && employeePayRates[allocation.employeeId]) {
                                return `Auto-calculated from hours × hourly rate ($${employeePayRates[allocation.employeeId].toFixed(2)}/hr). You can edit if needed.`;
                              }
                              return "Currency amount in dollars";
                            })()}
                          </p>
                        </div>

                        {/* Photos Uploaded */}
                        <div className="space-y-2">
                          <Label>Photos Uploaded</Label>
                          <Select
                            value={cleaner.photosUploaded ? "yes" : "no"}
                            onValueChange={(value) =>
                              updateCleaner(index, { photosUploaded: value === "yes" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">
                                <span className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4 text-green-600" />
                                  Yes
                                </span>
                              </SelectItem>
                              <SelectItem value="no">
                                <span className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4 text-orange-600" />
                                  No
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Special Notes */}
                        <div className="space-y-2 md:col-span-2">
                          <Label>Special Notes</Label>
                          <Textarea
                            value={cleaner.specialNotes || ""}
                            onChange={(e) =>
                              updateCleaner(index, { specialNotes: e.target.value })
                            }
                            placeholder="Enter any special notes, issues, or additional information about this cleaning job..."
                            rows={3}
                            className="resize-none"
                          />
                          <p className="text-xs text-muted-foreground">
                            Optional: Add notes about issues, special circumstances, or other relevant information
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingEntryId ? (
                "Update Entry"
              ) : (
                "Add Entry"
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
              This action cannot be undone. This will permanently delete the cleaning entry
              from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingEntryId(null)}>
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

export default CleaningTracker;

