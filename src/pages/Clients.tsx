"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserPlus, Loader2, Trash2 } from "lucide-react";
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
import { Client } from "@/types/financial";
import { getAllClients, addClient, updateClient, deleteClient } from "@/lib/firebase/clients";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Clients = () => {
  const [searchValue, setSearchValue] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 8;
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    status: "active" as "active" | "inactive",
    notes: "",
  });

  // Load clients from Firebase
  useEffect(() => {
    const loadClients = async () => {
      try {
        setIsLoading(true);
        const fetchedClients = await getAllClients();
        setClients(fetchedClients);
      } catch (error) {
        console.error("Error loading clients:", error);
        toast.error("Failed to load clients. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
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
    });
    setEditingClientId(null);
  };

  const handleEditClient = (client: Client) => {
    setEditingClientId(client.id);
    setFormData({
      name: client.name,
      companyName: client.companyName || "",
      email: client.email,
      phone: client.phone,
      address: client.address || "",
      contactPerson: client.contactPerson || "",
      status: client.status,
      notes: client.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClient = (client: Client) => {
    setDeletingClientId(client.id);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!formData.name || !formData.email) {
      toast.error("Please fill in required fields (Name and Email)");
      return;
    }

    try {
      setIsSaving(true);

      if (editingClientId) {
        // Update existing client
        await updateClient(editingClientId, {
          name: formData.name,
          companyName: formData.companyName || undefined,
          email: formData.email,
          phone: formData.phone,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });

        // Reload clients to get the latest data from Firebase
        const updatedClients = await getAllClients();
        setClients(updatedClients);
        
        toast.success("Client updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new client
        const newClient: Omit<Client, "id"> = {
          name: formData.name,
          companyName: formData.companyName || undefined,
          email: formData.email,
          phone: formData.phone,
          address: formData.address || undefined,
          contactPerson: formData.contactPerson || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        };

        // Add client to Firebase
        await addClient(newClient);
        
        // Reload clients to get the latest data from Firebase
        const updatedClients = await getAllClients();
        setClients(updatedClients);
        
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
      await deleteClient(deletingClientId);
      
      // Reload clients to get the latest data from Firebase
      const updatedClients = await getAllClients();
      setClients(updatedClients);
      
      toast.success("Client deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingClientId(null);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">Manage your client information</p>
        </div>
        <Button onClick={handleAddClient}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, email, or phone..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading clients...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClients.map((client) => (
                    <TableRow 
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleEditClient(client)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.companyName || "-"}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.contactPerson || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{client.address || "-"}</TableCell>
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
 
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
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
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
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Add Client</DialogTitle>
                  <DialogDescription>
                    Fill in the client details. Name and Email are required fields.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="ABC Corporation"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
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
              <div className="p-6">
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                  <DialogDescription>
                    Update the client details. Name and Email are required fields.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Name *</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-companyName">Company Name</Label>
                      <Input
                        id="edit-companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="ABC Corporation"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email *</Label>
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


