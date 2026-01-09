"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserPlus, Loader2, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
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
import { Client, Employee, Site } from "@/types/financial";
import { getAllClients, addClient, updateClient, deleteClient } from "@/lib/firebase/clients";
import { getAllEmployees, updateEmployee, deleteEmployee } from "@/lib/firebase/employees";
import { getAllSites } from "@/lib/firebase/sites";
import { toast } from "sonner";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ClientDisplay extends Omit<Client, "id"> {
  id: string;
  source: "client" | "employee"; // Track if it came from clients collection or employees collection
}

const Clients = () => {
  const [searchValue, setSearchValue] = useState("");
  const [clients, setClients] = useState<ClientDisplay[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingClientSource, setEditingClientSource] = useState<"client" | "employee" | null>(null);
  const [originalClientData, setOriginalClientData] = useState<ClientDisplay | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [deletingClientSource, setDeletingClientSource] = useState<"client" | "employee" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [companyNamePopoverOpen, setCompanyNamePopoverOpen] = useState(false);
  const [siteSearchValue, setSiteSearchValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    status: "active" as "active" | "inactive",
    notes: "",
    selectedSites: [] as string[], // Array of site IDs
  });

  // Load clients and sites from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [fetchedClients, fetchedEmployees, fetchedSites] = await Promise.all([
          getAllClients(),
          getAllEmployees(),
          getAllSites(),
        ]);

        // Sort sites alphabetically by name
        const sortedSites = fetchedSites.sort((a, b) => 
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setSites(sortedSites);

        // Convert clients to ClientDisplay format
        const clientsFromCollection: ClientDisplay[] = fetchedClients.map((client) => ({
          ...client,
          source: "client" as const,
        }));

        // Convert employees with type="client" to ClientDisplay format
        const employeesAsClients: ClientDisplay[] = fetchedEmployees
          .filter((emp) => emp.type === "client")
          .map((emp) => ({
            id: emp.id,
            name: emp.name,
            companyName: emp.role || undefined,
            email: emp.email,
            phone: emp.phone,
            address: undefined,
            contactPerson: undefined,
            status: emp.status,
            notes: undefined,
            source: "employee" as const,
          }));

        // Merge both sources
        const allClients = [...clientsFromCollection, ...employeesAsClients];
        setClients(allClients);
      } catch (error) {
        console.error("Error loading clients:", error);
        toast.error("Failed to load clients. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      companyName: "",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
      status: "active",
      notes: "",
      selectedSites: [],
    });
    setEditingClientId(null);
    setEditingClientSource(null);
    setOriginalClientData(null);
    setCompanyNamePopoverOpen(false);
    setSiteSearchValue("");
  };

  const handleEditClient = async (client: ClientDisplay) => {
    setEditingClientId(client.id);
    setEditingClientSource(client.source);
    
    // If client is from clients collection, fetch the latest data to ensure sites are loaded
    let clientWithSites = client;
    if (client.source === "client") {
      try {
        const { getClientById } = await import("@/lib/firebase/clients");
        const fullClient = await getClientById(client.id);
        if (fullClient) {
          clientWithSites = {
            ...client,
            ...fullClient,
            source: "client" as const,
          };
        }
      } catch (error) {
        console.error("Error fetching client details:", error);
      }
    }
    
    setOriginalClientData(clientWithSites);
    
    // Load sites from client.sites - ensure it's always an array
    const clientSites = (clientWithSites as any).sites;
    const sitesArray = Array.isArray(clientSites) ? clientSites : [];
    
    setFormData({
      name: clientWithSites.name,
      companyName: clientWithSites.companyName || "",
      email: clientWithSites.email,
      phone: clientWithSites.phone,
      address: clientWithSites.address || "",
      contactPerson: clientWithSites.contactPerson || "",
      status: clientWithSites.status,
      notes: clientWithSites.notes || "",
      selectedSites: sitesArray,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClient = (client: ClientDisplay) => {
    setDeletingClientId(client.id);
    setDeletingClientSource(client.source);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveClient = async () => {
    // Only validate required fields when adding a new client
    if (!editingClientId && (!formData.name || !formData.email)) {
      toast.error("Please fill in required fields (Name and Email)");
      return;
    }

    try {
      setIsSaving(true);

      if (editingClientId && originalClientData) {
        // Build partial update object - only include fields that have changed
        const buildPartialUpdate = () => {
          const updates: Partial<Omit<Client, "id">> = {};
          
          if (formData.name !== originalClientData.name) {
            updates.name = formData.name;
          }
          if (formData.email !== originalClientData.email) {
            updates.email = formData.email;
          }
          if (formData.companyName !== (originalClientData.companyName || "")) {
            updates.companyName = formData.companyName || undefined;
          }
          if (formData.phone !== originalClientData.phone) {
            updates.phone = formData.phone;
          }
          if (formData.address !== (originalClientData.address || "")) {
            updates.address = formData.address || undefined;
          }
          if (formData.contactPerson !== (originalClientData.contactPerson || "")) {
            updates.contactPerson = formData.contactPerson || undefined;
          }
          if (formData.status !== originalClientData.status) {
            updates.status = formData.status;
          }
          if (formData.notes !== (originalClientData.notes || "")) {
            updates.notes = formData.notes || undefined;
          }
          
          // Compare sites arrays properly (handle order and undefined/null)
          const originalSites = (originalClientData as any).sites || [];
          const newSites = formData.selectedSites || [];
          
          // Sort both arrays for comparison to handle order differences
          const sortedOriginalSites = [...originalSites].sort();
          const sortedNewSites = [...newSites].sort();
          
          // Compare arrays element by element
          const sitesChanged = sortedOriginalSites.length !== sortedNewSites.length ||
            sortedOriginalSites.some((siteId: string, index: number) => siteId !== sortedNewSites[index]);
          
          if (sitesChanged) {
            // Always include sites field - use empty array to ensure it's saved (even if empty)
            updates.sites = newSites;
          }
          
          return updates;
        };

        // Update existing client - check if it's from clients collection or employees collection
        if (editingClientSource === "employee") {
          // Update employee that is marked as client
          // Note: Sites can only be saved for clients in the clients collection, not employees
          const updates = buildPartialUpdate();
          const employeeUpdates: Partial<Omit<Employee, "id">> = {};
          
          if (updates.name !== undefined) employeeUpdates.name = updates.name;
          if (updates.email !== undefined) employeeUpdates.email = updates.email;
          if (updates.phone !== undefined) employeeUpdates.phone = updates.phone;
          if (updates.status !== undefined) employeeUpdates.status = updates.status;
          if (updates.companyName !== undefined) employeeUpdates.role = updates.companyName || "";
          
          // Always include type to ensure it stays as "client"
          employeeUpdates.type = "client";
          
          await updateEmployee(editingClientId, employeeUpdates);
          
          // If sites were changed and this is an employee-client, we can't save sites to employees
          // We should log a warning or show a message to the user
          if (updates.sites !== undefined) {
            console.warn("Sites cannot be saved for clients that are stored as employees. Sites are only supported for clients in the clients collection.");
          }
        } else {
          // Update client from clients collection - only send changed fields
          const updates = buildPartialUpdate();
          
          // If sites were changed, ensure they're included in the update (even if empty array)
          if (updates.sites !== undefined) {
            // Use the formData.selectedSites directly (already set in buildPartialUpdate)
            // This ensures empty arrays are saved properly
          }
          
          await updateClient(editingClientId, updates);
        }

        // Reload clients to get the latest data from Firebase
        const [fetchedClients, fetchedEmployees] = await Promise.all([
          getAllClients(),
          getAllEmployees(),
        ]);

        const clientsFromCollection: ClientDisplay[] = fetchedClients.map((client) => ({
          ...client,
          source: "client" as const,
        }));

        const employeesAsClients: ClientDisplay[] = fetchedEmployees
          .filter((emp) => emp.type === "client")
          .map((emp) => ({
            id: emp.id,
            name: emp.name,
            companyName: emp.role || undefined,
            email: emp.email,
            phone: emp.phone,
            address: undefined,
            contactPerson: undefined,
            status: emp.status,
            notes: undefined,
            source: "employee" as const,
          }));

        const allClients = [...clientsFromCollection, ...employeesAsClients];
        setClients(allClients);
        
        toast.success("Client updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new client - always add to clients collection
        const newClient: Omit<Client, "id"> = {
          name: formData.name,
          companyName: formData.companyName || undefined,
          email: formData.email,
          phone: formData.phone,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
          sites: formData.selectedSites.length > 0 ? formData.selectedSites : undefined,
        };

        // Add client to Firebase
        await addClient(newClient);
        
        // Reload clients to get the latest data from Firebase
        const [fetchedClients, fetchedEmployees] = await Promise.all([
          getAllClients(),
          getAllEmployees(),
        ]);

        const clientsFromCollection: ClientDisplay[] = fetchedClients.map((client) => ({
          ...client,
          source: "client" as const,
        }));

        const employeesAsClients: ClientDisplay[] = fetchedEmployees
          .filter((emp) => emp.type === "client")
          .map((emp) => ({
            id: emp.id,
            name: emp.name,
            companyName: emp.role || undefined,
            email: emp.email,
            phone: emp.phone,
            address: undefined,
            contactPerson: undefined,
            status: emp.status,
            notes: undefined,
            source: "employee" as const,
          }));

        const allClients = [...clientsFromCollection, ...employeesAsClients];
        setClients(allClients);
        
        toast.success("Client added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error(`Failed to ${editingClientId ? 'update' : 'add'} client. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClientId) return;

    try {
      // Check if it's from clients collection or employees collection
      if (deletingClientSource === "employee") {
        // For employees marked as clients, delete them from employees collection
        await deleteEmployee(deletingClientId);
      } else {
        // Delete from clients collection
        await deleteClient(deletingClientId);
      }
      
      // Reload clients to get the latest data from Firebase
      const [fetchedClients, fetchedEmployees] = await Promise.all([
        getAllClients(),
        getAllEmployees(),
      ]);

      const clientsFromCollection: ClientDisplay[] = fetchedClients.map((client) => ({
        ...client,
        source: "client" as const,
      }));

      const employeesAsClients: ClientDisplay[] = fetchedEmployees
        .filter((emp) => emp.type === "client")
        .map((emp) => ({
          id: emp.id,
          name: emp.name,
          companyName: emp.role || undefined,
          email: emp.email,
          phone: emp.phone,
          address: undefined,
          contactPerson: undefined,
          status: emp.status,
          notes: undefined,
          source: "employee" as const,
        }));

      const allClients = [...clientsFromCollection, ...employeesAsClients];
      setClients(allClients);
      
      toast.success("Client deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingClientId(null);
      setDeletingClientSource(null);
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client. Please try again.");
    }
  };

  const handleAddClient = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const filteredClients = clients.filter(client => {
    return client.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      (client.companyName && client.companyName.toLowerCase().includes(searchValue.toLowerCase())) ||
      client.email.toLowerCase().includes(searchValue.toLowerCase()) ||
      client.phone.toLowerCase().includes(searchValue.toLowerCase());
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your client information</p>
        </div>
        <Button onClick={handleAddClient} className="w-full sm:w-auto">
          <UserPlus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg sm:text-xl">Client List</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant={viewMode === "card" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="flex-1 sm:flex-initial"
              >
                <LayoutGrid className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Card View</span>
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="flex-1 sm:flex-initial"
              >
                <TableIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Table View</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or company..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading clients...</span>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients found
            </div>
          ) : viewMode === "table" ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[150px]">Company</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditClient(client)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.companyName || "-"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Badge className={client.status === "active" ? "bg-success" : "bg-muted"}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client)}
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
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedClients.map((client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:shadow-md transition-all duration-200"
                  onClick={() => handleEditClient(client)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold mb-1 truncate">{client.name}</CardTitle>
                        <p className="text-sm text-muted-foreground truncate">
                          {client.companyName || "No company"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center">
                      <Badge className={client.status === "active" ? "bg-success" : "bg-muted"}>
                        {client.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
 
          {filteredClients.length > 0 && totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {(() => {
                    const pages: (number | string)[] = [];
                    
                    if (totalPages <= 7) {
                      // Show all pages if 7 or fewer
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Always show first page
                      pages.push(1);
                      
                      if (currentPage <= 3) {
                        // Near the start
                        for (let i = 2; i <= 4; i++) {
                          pages.push(i);
                        }
                        pages.push("ellipsis");
                        pages.push(totalPages);
                      } else if (currentPage >= totalPages - 2) {
                        // Near the end
                        pages.push("ellipsis");
                        for (let i = totalPages - 3; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // In the middle
                        pages.push("ellipsis");
                        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                          pages.push(i);
                        }
                        pages.push("ellipsis");
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages.map((page, index) => {
                      if (page === "ellipsis") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page as number);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    });
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1);
                        }
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg max-h-[95vh] sm:max-h-[90vh] m-2 sm:m-4">
          <div className="grid md:grid-cols-2 h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/emp_modalimg.jpg"
                alt="Add Client"
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
                    Add a new client
                  </h2>
                  <p className="text-sm text-white">
                    Add a new client to the system by filling in the details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Add Client</DialogTitle>
                  <DialogDescription>
                    Fill in the client details. Name and Email are required fields.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sites">Sites</Label>
                      <Popover open={companyNamePopoverOpen} onOpenChange={setCompanyNamePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={companyNamePopoverOpen}
                            className="w-full justify-between"
                          >
                            {formData.selectedSites.length > 0
                              ? `${formData.selectedSites.length} site${formData.selectedSites.length > 1 ? "s" : ""} selected`
                              : "Select sites..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search sites..." 
                              value={siteSearchValue}
                              onValueChange={setSiteSearchValue}
                            />
                            <CommandList className="overscroll-contain scroll-smooth">
                              <CommandEmpty>No site found.</CommandEmpty>
                              <CommandGroup>
                                {sites.length === 0 ? (
                                  <CommandItem disabled>
                                    <span className="text-muted-foreground">No sites available. Please create sites first.</span>
                                  </CommandItem>
                                ) : (
                                  sites
                                    .filter((site) =>
                                      !siteSearchValue ||
                                      site.name.toLowerCase().includes(siteSearchValue.toLowerCase()) ||
                                      (site.clientName && site.clientName.toLowerCase().includes(siteSearchValue.toLowerCase()))
                                    )
                                    .map((site) => (
                                      <CommandItem
                                        key={site.id}
                                        value={site.name}
                                        onSelect={() => {
                                          if (formData.selectedSites.includes(site.id)) {
                                            setFormData({
                                              ...formData,
                                              selectedSites: formData.selectedSites.filter((id) => id !== site.id),
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              selectedSites: [...formData.selectedSites, site.id],
                                            });
                                          }
                                        }}
                                      >
                                        <Checkbox
                                          checked={formData.selectedSites.includes(site.id)}
                                          className="mr-2"
                                          onCheckedChange={() => {}}
                                        />
                                        <div className="flex flex-col">
                                          <span>{site.name}</span>
                                          {site.clientName && (
                                            <span className="text-xs text-muted-foreground">{site.clientName}</span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {formData.selectedSites.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Selected sites ({formData.selectedSites.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {formData.selectedSites.map((siteId) => {
                              const site = sites.find((s) => s.id === siteId);
                              return site ? (
                                <Badge
                                  key={siteId}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      selectedSites: formData.selectedSites.filter((id) => id !== siteId),
                                    });
                                  }}
                                >
                                  {site.name}
                                  <X className="ml-1 h-3 w-3" />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john.smith@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about the client..."
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
                  <Button onClick={handleSaveClient} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Add Client"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg max-h-[95vh] sm:max-h-[90vh] m-2 sm:m-4">
          <div className="grid md:grid-cols-2 h-[95vh] sm:h-[90vh] max-h-[95vh] sm:max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/emp_modalimg.jpg"
                alt="Edit Client"
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
                    Edit client details
                  </h2>
                  <p className="text-sm text-white">
                    Update the client details below.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg">
              <div className="p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                  <DialogDescription>
                    Update the client details. All fields are optional and can be filled partially.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-sites">Sites</Label>
                      <Popover open={companyNamePopoverOpen} onOpenChange={setCompanyNamePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={companyNamePopoverOpen}
                            className="w-full justify-between"
                          >
                            {formData.selectedSites.length > 0
                              ? `${formData.selectedSites.length} site${formData.selectedSites.length > 1 ? "s" : ""} selected`
                              : "Select sites..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search sites..." 
                              value={siteSearchValue}
                              onValueChange={setSiteSearchValue}
                            />
                            <CommandList className="overscroll-contain scroll-smooth">
                              <CommandEmpty>No site found.</CommandEmpty>
                              <CommandGroup>
                                {sites.length === 0 ? (
                                  <CommandItem disabled>
                                    <span className="text-muted-foreground">No sites available. Please create sites first.</span>
                                  </CommandItem>
                                ) : (
                                  sites
                                    .filter((site) =>
                                      !siteSearchValue ||
                                      site.name.toLowerCase().includes(siteSearchValue.toLowerCase()) ||
                                      (site.clientName && site.clientName.toLowerCase().includes(siteSearchValue.toLowerCase()))
                                    )
                                    .map((site) => (
                                      <CommandItem
                                        key={site.id}
                                        value={site.name}
                                        onSelect={() => {
                                          if (formData.selectedSites.includes(site.id)) {
                                            setFormData({
                                              ...formData,
                                              selectedSites: formData.selectedSites.filter((id) => id !== site.id),
                                            });
                                          } else {
                                            setFormData({
                                              ...formData,
                                              selectedSites: [...formData.selectedSites, site.id],
                                            });
                                          }
                                        }}
                                      >
                                        <Checkbox
                                          checked={formData.selectedSites.includes(site.id)}
                                          className="mr-2"
                                          onCheckedChange={() => {}}
                                        />
                                        <div className="flex flex-col">
                                          <span>{site.name}</span>
                                          {site.clientName && (
                                            <span className="text-xs text-muted-foreground">{site.clientName}</span>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))
                                )}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {formData.selectedSites.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Selected sites ({formData.selectedSites.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {formData.selectedSites.map((siteId) => {
                              const site = sites.find((s) => s.id === siteId);
                              return site ? (
                                <Badge
                                  key={siteId}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      selectedSites: formData.selectedSites.filter((id) => id !== siteId),
                                    });
                                  }}
                                >
                                  {site.name}
                                  <X className="ml-1 h-3 w-3" />
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john.smith@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Phone</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Address</Label>
                    <Input
                      id="edit-address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, City, State, ZIP"
                    />
                  </div>

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

                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Textarea
                      id="edit-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about the client..."
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
                  <Button onClick={handleSaveClient} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Update Client"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingClientId(null)}>
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

export default Clients;


