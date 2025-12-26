"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  Sparkles,
  Tag,
  MoreVertical,
  Palette,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/firebase/categories";
import { Category } from "@/types/financial";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    icon: "package",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getAllCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(
          editingCategory.id!,
          formData as Partial<Category>
        );
        toast.success("Category updated successfully");
      } else {
        await addCategory(
          formData as Omit<Category, "id" | "createdAt" | "updatedAt">
        );
        toast.success("Category created successfully");
      }

      setIsDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        color: "#3b82f6",
        icon: "package",
      });
      setEditingCategory(null);
      await loadCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(
        editingCategory ? "Failed to update category" : "Failed to create category"
      );
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color || "#3b82f6",
      icon: category.icon || "package",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted successfully");
      await loadCategories();
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      color: "#3b82f6",
      icon: "package",
    });
    setIsDialogOpen(true);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get icon component dynamically
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Package;
    return IconComponent;
  };

  // Generate gradient colors based on category color
  const getGradientData = (color: string | undefined, index: number) => {
    // Default gradients if no color
    const gradients = [
      "from-blue-500/20 via-cyan-500/15 to-blue-500/10 border-blue-500/30 dark:from-blue-500/30 dark:via-cyan-500/20 dark:to-blue-500/15 dark:border-blue-500/40",
      "from-purple-500/20 via-pink-500/15 to-purple-500/10 border-purple-500/30 dark:from-purple-500/30 dark:via-pink-500/20 dark:to-purple-500/15 dark:border-purple-500/40",
      "from-emerald-500/20 via-teal-500/15 to-emerald-500/10 border-emerald-500/30 dark:from-emerald-500/30 dark:via-teal-500/20 dark:to-emerald-500/15 dark:border-emerald-500/40",
      "from-orange-500/20 via-amber-500/15 to-orange-500/10 border-orange-500/30 dark:from-orange-500/30 dark:via-amber-500/20 dark:to-orange-500/15 dark:border-orange-500/40",
      "from-rose-500/20 via-pink-500/15 to-rose-500/10 border-rose-500/30 dark:from-rose-500/30 dark:via-pink-500/20 dark:to-rose-500/15 dark:border-rose-500/40",
      "from-indigo-500/20 via-blue-500/15 to-indigo-500/10 border-indigo-500/30 dark:from-indigo-500/30 dark:via-blue-500/20 dark:to-indigo-500/15 dark:border-indigo-500/40",
    ];
    
    if (color) {
      // Convert hex to RGB for inline styles
      const hex = color.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      return {
        className: "bg-gradient-to-br",
        style: {
          background: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.15) 0%, rgba(${r}, ${g}, ${b}, 0.1) 50%, rgba(${r}, ${g}, ${b}, 0.05) 100%)`,
          borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
        },
      };
    }
    
    return { className: gradients[index % gradients.length], style: {} };
  };

  // Popular icon options
  const iconOptions = [
    "Package", "Box", "ShoppingCart", "Wrench", "Tool", "Hammer",
    "Droplet", "FlaskConical", "Spray", "Brush", "Sparkles", "Star",
    "Tag", "Folder", "Grid", "Layers", "Archive", "Briefcase",
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Tag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground mt-1">
              Organize and manage your product categories
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Categories</p>
                <p className="text-3xl font-bold mt-2">{categories.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Colors</p>
                <p className="text-3xl font-bold mt-2">
                  {categories.filter(c => c.color).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/10">
                <Palette className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Icons</p>
                <p className="text-3xl font-bold mt-2">
                  {categories.filter(c => c.icon).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-500/10">
                <Sparkles className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Add Section */}
      <Card className="mb-6 border-2">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full md:w-auto md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search categories by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-base"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleAdd} size="lg" className="w-full md:w-auto">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {editingCategory ? "Edit Category" : "Create New Category"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory
                      ? "Update the category details below"
                      : "Fill in the details to create a new category"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base font-semibold">
                        Category Name *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., Cleaning Equipment"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-semibold">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Add a brief description for this category..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="color" className="text-base font-semibold flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Color
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="color"
                            type="color"
                            value={formData.color}
                            onChange={(e) =>
                              setFormData({ ...formData, color: e.target.value })
                            }
                            className="h-12 w-20 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={formData.color}
                            onChange={(e) =>
                              setFormData({ ...formData, color: e.target.value })
                            }
                            placeholder="#3b82f6"
                            className="flex-1 font-mono"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Choose a color to represent this category
                        </p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="icon" className="text-base font-semibold flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Icon
                        </Label>
                        <div className="grid grid-cols-6 gap-2 p-3 border rounded-lg bg-muted/30">
                          {iconOptions.map((iconName) => {
                            const IconComponent = getIconComponent(iconName);
                            const isSelected = formData.icon.toLowerCase() === iconName.toLowerCase();
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, icon: iconName.toLowerCase() })
                                }
                                className={cn(
                                  "p-2 rounded-md border-2 transition-all hover:scale-110",
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-transparent hover:border-primary/50"
                                )}
                              >
                                <IconComponent
                                  className={cn(
                                    "h-5 w-5",
                                    isSelected ? "text-primary" : "text-muted-foreground"
                                  )}
                                />
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select an icon for this category
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="lg">
                      {editingCategory ? "Update Category" : "Create Category"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-2">
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
              <Tag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No categories found" : "No categories yet"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Get started by creating your first category"}
            </p>
            {!searchQuery && (
              <Button onClick={handleAdd} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create First Category
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category, index) => {
            const IconComponent = getIconComponent(category.icon || "package");
            const categoryColor = category.color;
            const gradientData = getGradientData(categoryColor, index);

            return (
              <Card
                key={category.id}
                className={cn(
                  "relative overflow-hidden border-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group",
                  gradientData.className
                )}
                style={gradientData.style}
              >
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                
                <CardContent className="p-6 relative">
                  {/* Header with Icon and Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-3 rounded-xl shadow-md"
                        style={{
                          backgroundColor: categoryColor + "20",
                        }}
                      >
                        <IconComponent
                          className="h-6 w-6"
                          style={{ color: categoryColor }}
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">
                          {category.name}
                        </h3>
                        {category.color && (
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                              style={{ backgroundColor: categoryColor }}
                            />
                            <span className="text-xs font-mono text-muted-foreground">
                              {category.color}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(category.id!)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Description */}
                  {category.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {category.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic mb-4">
                      No description provided
                    </p>
                  )}

                  {/* Footer Badges */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                    {category.icon && (
                      <Badge variant="outline" className="text-xs">
                        <IconComponent className="h-3 w-3 mr-1" />
                        {category.icon}
                      </Badge>
                    )}
                    {category.color && (
                      <Badge variant="outline" className="text-xs">
                        <Palette className="h-3 w-3 mr-1" />
                        Colored
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
