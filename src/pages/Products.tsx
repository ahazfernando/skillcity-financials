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
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/firebase/products";
import {
  getAllCategories,
} from "@/lib/firebase/categories";
import { getAllSites } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllocationsBySite } from "@/lib/firebase/siteEmployeeAllocations";
import { Product, Category, Site, Employee, SiteEmployeeAllocation } from "@/types/financial";
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
                      {product.employeeIds && product.employeeIds.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Employees:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {product.employeeIds.map((employeeId) => (
                              <Badge key={employeeId} variant="outline" className="text-xs">
                                {getEmployeeName(employeeId)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
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

