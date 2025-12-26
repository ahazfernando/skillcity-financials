"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  LayoutGrid,
  Table2,
  Package,
  Wrench,
  X,
  Building2,
  Users,
  ChevronsUpDown,
  CheckCircle2,
  Award,
  Briefcase,
  Star,
  Zap,
  Shield,
  CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  addRepair,
  updateRepair,
  deleteRepair,
  getProductById,
} from "@/lib/firebase/products";
import {
  getAllCategories,
} from "@/lib/firebase/categories";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllocationsBySite } from "@/lib/firebase/siteEmployeeAllocations";
import { Product, Category, Site, Employee, SiteEmployeeAllocation, Repair } from "@/types/financial";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [siteEmployees, setSiteEmployees] = useState<SiteEmployeeAllocation[]>([]);
  const [isLoadingSiteEmployees, setIsLoadingSiteEmployees] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sitePopoverOpen, setSitePopoverOpen] = useState(false);
  const [siteSearchValue, setSiteSearchValue] = useState("");
  const [isRepairDialogOpen, setIsRepairDialogOpen] = useState(false);
  const [isRepairManagementDialogOpen, setIsRepairManagementDialogOpen] = useState(false);
  const [selectedProductForRepairs, setSelectedProductForRepairs] = useState<Product | null>(null);
  const [editingRepair, setEditingRepair] = useState<Repair | null>(null);
  const [repairFormData, setRepairFormData] = useState({
    location: "",
    repairBusiness: "",
    cause: "",
    repairPersonName: "",
    repairPersonContact: "",
    cost: 0,
    assignees: [] as string[], // Employee IDs
    repairStartDate: new Date(),
    repairEndDate: undefined as Date | undefined,
    status: 'Not in Repair' as 'In repair' | 'Repaired' | 'Not in Repair' | 'Pickup pending' | 'Payment Pending',
  });
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [assigneeSearchValue, setAssigneeSearchValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    equipmentCode: "",
    description: "",
    category: "",
    image: "",
    selectedSites: [] as string[],
    selectedEmployees: [] as string[],
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadSites();
    loadEmployees();
  }, []);

  // Load employees when sites are selected
  useEffect(() => {
    if (isDialogOpen) {
      loadSiteEmployees(formData.selectedSites);
    }
  }, [formData.selectedSites, isDialogOpen]);

  const loadCategories = async () => {
    try {
      const data = await getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const loadSites = async () => {
    try {
      const data = await getAllSites();
      setSites(data);
    } catch (error) {
      console.error("Error loading sites:", error);
      toast.error("Failed to load sites");
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await getAllEmployees();
      // Filter out clients - only show actual employees
      const actualEmployees = data.filter(
        (emp) => (!emp.type || emp.type === "employee") && emp.status === "active"
      );
      // Sort employees alphabetically
      const sortedEmployees = actualEmployees.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setEmployees(sortedEmployees);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    }
  };

  const loadSiteEmployees = async (siteIds: string[]) => {
    if (siteIds.length === 0) {
      setSiteEmployees([]);
      return;
    }

    try {
      setIsLoadingSiteEmployees(true);
      const allAllocations: SiteEmployeeAllocation[] = [];
      
      // Load allocations for all selected sites
      for (const siteId of siteIds) {
        try {
          const allocations = await getAllocationsBySite(siteId);
          allAllocations.push(...allocations);
        } catch (error) {
          console.error(`Error loading employees for site ${siteId}:`, error);
        }
      }

      // Remove duplicates (same employee assigned to multiple sites)
      const uniqueAllocations = allAllocations.reduce((acc, allocation) => {
        if (!acc.find(a => a.employeeId === allocation.employeeId)) {
          acc.push(allocation);
        }
        return acc;
      }, [] as SiteEmployeeAllocation[]);

      setSiteEmployees(uniqueAllocations);
    } catch (error) {
      console.error("Error loading site employees:", error);
      toast.error("Failed to load site employees");
    } finally {
      setIsLoadingSiteEmployees(false);
    }
  };

  // Load employees when sites are selected
  useEffect(() => {
    if (isDialogOpen) {
      loadSiteEmployees(formData.selectedSites);
    }
  }, [formData.selectedSites, isDialogOpen]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productData = {
        name: formData.name,
        equipmentCode: formData.equipmentCode,
        quantity: 0, // Default quantity
        description: formData.description,
        category: formData.category,
        imageUrl: formData.image,
        siteIds: formData.selectedSites,
        employeeIds: formData.selectedEmployees,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id!, productData as Partial<Product>);
        toast.success("Product updated successfully");
      } else {
        await addProduct(productData as Omit<Product, "id" | "createdAt" | "updatedAt">);
        toast.success("Product created successfully");
      }

      setIsDialogOpen(false);
      setFormData({
        name: "",
        equipmentCode: "",
        description: "",
        category: "",
        image: "",
        selectedSites: [],
        selectedEmployees: [],
      });
      setEditingProduct(null);
      await loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(
        editingProduct
          ? "Failed to update product"
          : "Failed to create product"
      );
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      equipmentCode: product.equipmentCode,
      description: product.description || "",
      category: product.category,
      image: product.imageUrl || "",
      selectedSites: product.siteIds || [],
      selectedEmployees: product.employeeIds || [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      toast.success("Product deleted successfully");
      await loadProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      equipmentCode: "",
      description: "",
      category: "",
      image: "",
      selectedSites: [],
      selectedEmployees: [],
    });
    setIsDialogOpen(true);
  };

  // Repair form handlers
  const resetRepairForm = () => {
    setRepairFormData({
      location: "",
      repairBusiness: "",
      cause: "",
      repairPersonName: "",
      repairPersonContact: "",
      cost: 0,
      assignees: [],
      repairStartDate: new Date(),
      repairEndDate: undefined,
      status: 'Not in Repair',
    });
  };

  const handleAddRepair = (product: Product) => {
    setSelectedProductForRepairs(product);
    setIsRepairManagementDialogOpen(true);
  };

  const handleOpenAddRepairForm = () => {
    setEditingRepair(null);
    resetRepairForm();
    setIsRepairDialogOpen(true);
  };

  const handleEditRepair = (product: Product, repair: Repair) => {
    setSelectedProductForRepairs(product);
    setEditingRepair(repair);
    // Convert assignee names to employee IDs if they exist
    // If assignees are already IDs, use them; otherwise try to match by name
    let assigneeIds: string[] = [];
    if (repair.assignees && repair.assignees.length > 0) {
      assigneeIds = repair.assignees.map(assignee => {
        // Check if it's already an ID (format check)
        if (assignee.length > 10) {
          // Likely an ID, check if it exists in employees
          const employee = employees.find(e => e.id === assignee);
          if (employee) return assignee;
        }
        // Otherwise, try to find by name
        const employee = employees.find(e => e.name === assignee);
        return employee?.id || assignee; // Fallback to original if not found
      }).filter(id => id && id.length > 0) as string[];
    }
    setRepairFormData({
      location: repair.location,
      repairBusiness: repair.repairBusiness,
      cause: repair.cause,
      repairPersonName: repair.repairPersonName,
      repairPersonContact: repair.repairPersonContact,
      cost: repair.cost || 0,
      assignees: assigneeIds,
      repairStartDate: repair.repairStartDate ? new Date(repair.repairStartDate) : new Date(),
      repairEndDate: repair.repairEndDate ? new Date(repair.repairEndDate) : undefined,
      status: repair.status || 'Not in Repair',
    });
    setIsRepairDialogOpen(true);
  };

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProductForRepairs?.id) return;
    
    try {
      // Convert employee IDs to employee names for storage (or keep IDs if preferred)
      // For now, we'll store both IDs and names, but primarily use names for display
      const assigneeNames = repairFormData.assignees
        .map(id => {
          const employee = employees.find(e => e.id === id);
          return employee?.name || id;
        })
        .filter(name => name.trim() !== "");
      
      const repairData = {
        ...repairFormData,
        assignees: assigneeNames.length > 0 ? assigneeNames : undefined,
      };
      
      if (editingRepair) {
        // Update existing repair
        await updateRepair(selectedProductForRepairs.id, editingRepair.id!, repairData);
        toast.success("Repair updated successfully");
      } else {
        // Add new repair
        await addRepair(selectedProductForRepairs.id, repairData);
        toast.success("Repair added successfully");
      }
      
      setIsRepairDialogOpen(false);
      setEditingRepair(null);
      resetRepairForm();
      await loadProducts(); // Refresh data
      // Refresh selected product to show updated repairs
      if (selectedProductForRepairs?.id) {
        const updatedProduct = await getProductById(selectedProductForRepairs.id);
        if (updatedProduct) {
          setSelectedProductForRepairs(updatedProduct);
        }
      }
    } catch (error) {
      console.error("Error saving repair:", error);
      toast.error(
        editingRepair ? "Failed to update repair" : "Failed to add repair"
      );
    }
  };

  const handleDeleteRepair = async (productId: string, repairId: string) => {
    if (!confirm("Are you sure you want to delete this repair?")) return;
    try {
      await deleteRepair(productId, repairId);
      toast.success("Repair deleted successfully");
      await loadProducts();
      // Refresh selected product to show updated repairs
      if (selectedProductForRepairs?.id === productId) {
        const updatedProduct = await getProductById(productId);
        if (updatedProduct) {
          setSelectedProductForRepairs(updatedProduct);
        }
      }
    } catch (error) {
      console.error("Error deleting repair:", error);
      toast.error("Failed to delete repair");
    }
  };

  const filteredProducts = products.filter((prod) => {
    const matchesSearch =
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.equipmentCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || prod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || categoryId;
  };

  const getSiteName = (siteId: string): string => {
    const site = sites.find((s) => s.id === siteId);
    return site?.name || siteId;
  };

  const getEmployeeName = (employeeId: string): string => {
    const employee = employees.find((e) => e.id === employeeId);
    return employee?.name || employeeId;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-muted-foreground mt-2">
          Manage your equipment inventory
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>All Products</CardTitle>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id!}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "card" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("card")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
                  <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
                    {/* Left side - Image with Logo and Heading */}
                    <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
                      <img
                        src="/signin/5c2ede019db83843cf9cc0f02bd691eb.jpg"
                        alt={editingProduct ? "Edit Product" : "Add Product"}
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
                            {editingProduct ? "Edit Product" : "Add Product"}
                          </h2>
                          <p className="text-sm text-white">
                            {editingProduct
                              ? "Update the product details"
                              : "Add a new product to your inventory"}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side - Form */}
                    <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg bg-background p-6">
                      <DialogHeader className="md:hidden mb-4">
                        <DialogTitle>
                          {editingProduct ? "Edit Product" : "Add Product"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingProduct
                            ? "Update the product details"
                            : "Add a new product to your inventory"}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="flex flex-col h-full">
                        <div className="space-y-4 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="equipmentCode">Equipment Code</Label>
                          <Input
                            id="equipmentCode"
                            value={formData.equipmentCode}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                equipmentCode: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) =>
                            setFormData({ ...formData, category: value })
                          }
                          required
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id!}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Assign to Sites</Label>
                          <Popover open={sitePopoverOpen} onOpenChange={setSitePopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !formData.selectedSites.length && "text-muted-foreground"
                                )}
                              >
                                {formData.selectedSites.length > 0
                                  ? `${formData.selectedSites.length} site(s) selected`
                                  : "Select sites..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search sites..."
                                  value={siteSearchValue}
                                  onValueChange={setSiteSearchValue}
                                />
                                <CommandList>
                                  <CommandEmpty>No site found.</CommandEmpty>
                                  <CommandGroup>
                                    {sites.length === 0 ? (
                                      <CommandItem disabled>
                                        <span className="text-muted-foreground">
                                          No sites available. Please create sites first.
                                        </span>
                                      </CommandItem>
                                    ) : (
                                      sites
                                        .filter(
                                          (site) =>
                                            !siteSearchValue ||
                                            site.name
                                              .toLowerCase()
                                              .includes(siteSearchValue.toLowerCase()) ||
                                            (site.clientName &&
                                              site.clientName
                                                .toLowerCase()
                                                .includes(siteSearchValue.toLowerCase()))
                                        )
                                        .map((site) => (
                                          <CommandItem
                                            key={site.id}
                                            value={site.name}
                                            onSelect={() => {
                                              if (formData.selectedSites.includes(site.id!)) {
                                                setFormData({
                                                  ...formData,
                                                  selectedSites: formData.selectedSites.filter(
                                                    (id) => id !== site.id
                                                  ),
                                                });
                                              } else {
                                                setFormData({
                                                  ...formData,
                                                  selectedSites: [
                                                    ...formData.selectedSites,
                                                    site.id!,
                                                  ],
                                                });
                                              }
                                            }}
                                          >
                                            <Checkbox
                                              checked={formData.selectedSites.includes(site.id!)}
                                              className="mr-2"
                                              onCheckedChange={() => {}}
                                            />
                                            <div className="flex flex-col">
                                              <span>{site.name}</span>
                                              {site.clientName && (
                                                <span className="text-xs text-muted-foreground">
                                                  {site.clientName}
                                                </span>
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
                                          selectedSites: formData.selectedSites.filter(
                                            (id) => id !== siteId
                                          ),
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
                      
                      {/* Employees Section - Full Width */}
                      {formData.selectedSites.length > 0 ? (
                        <div className="space-y-3 mt-4">
                          {isLoadingSiteEmployees ? (
                            <div className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                              <Users className="h-4 w-4 animate-spin" />
                              Loading employees...
                            </div>
                          ) : siteEmployees.length > 0 ? (
                            <div>
                              <Label className="mb-3 block text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Employees at Selected Site(s)
                              </Label>
                              <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 pt-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/30">
                                {siteEmployees.map((allocation, index) => {
                                  // Find the full employee details
                                  const employee = employees.find((e) => e.id === allocation.employeeId);
                                  if (!employee) return null;
                                  
                                  const gradientColors = [
                                    "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50",
                                    "from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/30 dark:from-purple-500/20 dark:via-purple-500/10 dark:to-transparent dark:border-purple-500/50",
                                    "from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50",
                                    "from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/30 dark:from-orange-500/20 dark:via-orange-500/10 dark:to-transparent dark:border-orange-500/50",
                                    "from-pink-500/10 via-pink-500/5 to-transparent border-pink-500/30 dark:from-pink-500/20 dark:via-pink-500/10 dark:to-transparent dark:border-pink-500/50",
                                    "from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/30 dark:from-indigo-500/20 dark:via-indigo-500/10 dark:to-transparent dark:border-indigo-500/50",
                                  ];
                                  const gradientColor = gradientColors[index % gradientColors.length];
                                  
                                  const role = employee.role || "Employee";
                                  
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
                                      return <Wrench className="h-3.5 w-3.5" />;
                                    } else if (roleLower.includes("assistant") || roleLower.includes("junior")) {
                                      return <Zap className="h-3.5 w-3.5" />;
                                    } else {
                                      return <Briefcase className="h-3.5 w-3.5" />;
                                    }
                                  };
                                  
                                  const isSelected = formData.selectedEmployees.includes(employee.id!);
                                  
                                  return (
                                    <Card
                                      key={employee.id}
                                      onClick={() => {
                                        if (isSelected) {
                                          setFormData({
                                            ...formData,
                                            selectedEmployees: formData.selectedEmployees.filter(
                                              (id) => id !== employee.id
                                            ),
                                          });
                                        } else {
                                          setFormData({
                                            ...formData,
                                            selectedEmployees: [
                                              ...formData.selectedEmployees,
                                              employee.id!,
                                            ],
                                          });
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
                                              {employee.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">
                                              {employee.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1">
                                              <span className="text-primary">
                                                {getRoleIcon()}
                                              </span>
                                              <p className="text-xs text-muted-foreground truncate font-medium">
                                                {role}
                                              </p>
                                            </div>
                                            {employee.email && (
                                              <p className="text-xs text-muted-foreground truncate mt-1">
                                                {employee.email}
                                              </p>
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
                              No employees assigned to the selected site(s)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-medium">Please select a site first to view employees</span>
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image">Product Image</Label>
                        <FileUpload
                          key={editingProduct?.id || "new"}
                          value={formData.image}
                          onChange={(value) =>
                            setFormData({ ...formData, image: value })
                          }
                          enableCloudinary={true}
                        />
                      </div>
                        </div>
                        <DialogFooter className="mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">
                            {editingProduct ? "Update" : "Create"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Repair Dialog */}
              <Dialog open={isRepairDialogOpen} onOpenChange={setIsRepairDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRepair ? "Edit Repair" : "Add Repair"}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedProductForRepairs && (
                        <span>
                          {editingRepair
                            ? "Update repair details for"
                            : "Add a new repair for"}{" "}
                          <strong>{selectedProductForRepairs.name}</strong>
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRepairSubmit}>
                    <div className="space-y-4 py-4">
                      {/* Date Fields - Side by Side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="repairStartDate">Repair Start Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !repairFormData.repairStartDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {repairFormData.repairStartDate ? (
                                  format(repairFormData.repairStartDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={repairFormData.repairStartDate}
                                onSelect={(date) => date && setRepairFormData({ ...repairFormData, repairStartDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="repairEndDate">Repair End Date (Optional)</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !repairFormData.repairEndDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {repairFormData.repairEndDate ? (
                                  format(repairFormData.repairEndDate, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={repairFormData.repairEndDate}
                                onSelect={(date) => setRepairFormData({ ...repairFormData, repairEndDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="space-y-2">
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          value={repairFormData.location}
                          onChange={(e) => setRepairFormData({ ...repairFormData, location: e.target.value })}
                          required
                        />
                      </div>

                      {/* Repair Business */}
                      <div className="space-y-2">
                        <Label htmlFor="repairBusiness">Repair Business *</Label>
                        <Input
                          id="repairBusiness"
                          value={repairFormData.repairBusiness}
                          onChange={(e) => setRepairFormData({ ...repairFormData, repairBusiness: e.target.value })}
                          required
                        />
                      </div>

                      {/* Cause of Repair */}
                      <div className="space-y-2">
                        <Label htmlFor="cause">Cause of Repair *</Label>
                        <Textarea
                          id="cause"
                          value={repairFormData.cause}
                          onChange={(e) => setRepairFormData({ ...repairFormData, cause: e.target.value })}
                          rows={3}
                          required
                        />
                      </div>

                      {/* Repair Person Name and Contact - Side by Side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="repairPersonName">Repair Person Name *</Label>
                          <Input
                            id="repairPersonName"
                            value={repairFormData.repairPersonName}
                            onChange={(e) => setRepairFormData({ ...repairFormData, repairPersonName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="repairPersonContact">Repair Person Contact Number *</Label>
                          <Input
                            id="repairPersonContact"
                            value={repairFormData.repairPersonContact}
                            onChange={(e) => setRepairFormData({ ...repairFormData, repairPersonContact: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      {/* Repair Cost and Status - Side by Side */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cost">Repair Cost ($)</Label>
                          <Input
                            id="cost"
                            type="number"
                            step="0.01"
                            min="0"
                            value={repairFormData.cost}
                            onChange={(e) => setRepairFormData({ ...repairFormData, cost: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={repairFormData.status}
                            onValueChange={(value) => setRepairFormData({ ...repairFormData, status: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not in Repair">Not in Repair</SelectItem>
                              <SelectItem value="In repair">In repair</SelectItem>
                              <SelectItem value="Repaired">Repaired</SelectItem>
                              <SelectItem value="Pickup pending">Pickup pending</SelectItem>
                              <SelectItem value="Payment Pending">Payment Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Assignees */}
                      <div className="space-y-2">
                        <Label>Assignees</Label>
                        <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                repairFormData.assignees.length === 0 && "text-muted-foreground"
                              )}
                            >
                              {repairFormData.assignees.length > 0
                                ? `${repairFormData.assignees.length} employee(s) selected`
                                : "Select employees..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput
                                placeholder="Search employees..."
                                value={assigneeSearchValue}
                                onValueChange={setAssigneeSearchValue}
                              />
                              <CommandList>
                                <CommandEmpty>No employee found.</CommandEmpty>
                                <CommandGroup>
                                  {employees
                                    .filter((employee) =>
                                      !assigneeSearchValue ||
                                      employee.name.toLowerCase().includes(assigneeSearchValue.toLowerCase()) ||
                                      employee.email?.toLowerCase().includes(assigneeSearchValue.toLowerCase())
                                    )
                                    .map((employee) => {
                                      const isSelected = repairFormData.assignees.includes(employee.id!);
                                      return (
                                        <CommandItem
                                          key={employee.id}
                                          value={employee.id}
                                          onSelect={() => {
                                            setRepairFormData({
                                              ...repairFormData,
                                              assignees: isSelected
                                                ? repairFormData.assignees.filter((id) => id !== employee.id)
                                                : [...repairFormData.assignees, employee.id!],
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
                        {repairFormData.assignees.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Selected employees ({repairFormData.assignees.length}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {repairFormData.assignees.map((employeeId) => {
                                const employee = employees.find((e) => e.id === employeeId);
                                return employee ? (
                                  <Badge
                                    key={employeeId}
                                    variant="secondary"
                                    className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                                    onClick={() => {
                                      setRepairFormData({
                                        ...repairFormData,
                                        assignees: repairFormData.assignees.filter((id) => id !== employeeId),
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
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsRepairDialogOpen(false);
                          setEditingRepair(null);
                          resetRepairForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingRepair ? "Update" : "Add"} Repair
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Repair Management Dialog */}
              <Dialog open={isRepairManagementDialogOpen} onOpenChange={setIsRepairManagementDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Manage Repairs</DialogTitle>
                    <DialogDescription>
                      {selectedProductForRepairs && (
                        <span>
                          View and manage repairs for <strong>{selectedProductForRepairs.name}</strong>
                        </span>
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex justify-end">
                      <Button onClick={handleOpenAddRepairForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Repair
                      </Button>
                    </div>
                    {selectedProductForRepairs?.repairs && selectedProductForRepairs.repairs.length > 0 ? (
                      <div className="space-y-4">
                        {selectedProductForRepairs.repairs.map((repair) => (
                          <Card key={repair.id}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">
                                      {repair.status || "Not in Repair"}
                                    </Badge>
                                    {repair.cost && (
                                      <Badge variant="secondary">
                                        ${repair.cost.toFixed(2)}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Location:</p>
                                      <p className="font-medium">{repair.location}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Repair Business:</p>
                                      <p className="font-medium">{repair.repairBusiness}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Start Date:</p>
                                      <p className="font-medium">
                                        {repair.repairStartDate ? format(new Date(repair.repairStartDate), "PPP") : "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">End Date:</p>
                                      <p className="font-medium">
                                        {repair.repairEndDate ? format(new Date(repair.repairEndDate), "PPP") : "N/A"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Repair Person:</p>
                                      <p className="font-medium">{repair.repairPersonName}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Contact:</p>
                                      <p className="font-medium">{repair.repairPersonContact}</p>
                                    </div>
                                  </div>
                                  {repair.cause && (
                                    <div className="mt-3">
                                      <p className="text-muted-foreground text-sm">Cause:</p>
                                      <p className="text-sm">{repair.cause}</p>
                                    </div>
                                  )}
                                  {repair.assignees && repair.assignees.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-muted-foreground text-sm mb-1">Assignees:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {repair.assignees.map((assignee, idx) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {assignee}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      handleEditRepair(selectedProductForRepairs, repair);
                                      setIsRepairManagementDialogOpen(false);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteRepair(selectedProductForRepairs.id!, repair.id!)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No repairs found for this product</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={handleOpenAddRepairForm}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Repair
                        </Button>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsRepairManagementDialogOpen(false)}
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No products found
            </div>
          ) : viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.equipmentCode}
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{getCategoryName(product.category)}</TableCell>
                    <TableCell>
                      {product.siteIds && product.siteIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.siteIds.slice(0, 2).map((siteId) => (
                            <Badge key={siteId} variant="outline" className="text-xs">
                              {getSiteName(siteId)}
                            </Badge>
                          ))}
                          {product.siteIds.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.siteIds.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.employeeIds && product.employeeIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {product.employeeIds.slice(0, 2).map((employeeId) => (
                            <Badge key={employeeId} variant="outline" className="text-xs">
                              {getEmployeeName(employeeId)}
                            </Badge>
                          ))}
                          {product.employeeIds.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.employeeIds.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAddRepair(product)}
                          title="Manage Repairs"
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(product)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {product.imageUrl ? (
                    <div className="aspect-video w-full overflow-hidden bg-muted relative">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-muted flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {product.equipmentCode}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium">
                          {getCategoryName(product.category)}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      {product.repairs && product.repairs.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Wrench className="h-4 w-4" />
                          <span>{product.repairs.length} repair(s)</span>
                        </div>
                      )}
                      {product.siteIds && product.siteIds.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Sites:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {product.siteIds.map((siteId) => (
                              <Badge key={siteId} variant="outline" className="text-xs">
                                {getSiteName(siteId)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Employees:</span>
                        </div>
                        {product.employeeIds && product.employeeIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {product.employeeIds.map((employeeId) => (
                              <Badge key={employeeId} variant="outline" className="text-xs">
                                {getEmployeeName(employeeId)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No employees assigned</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddRepair(product)}
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Repairs
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(product.id!)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

