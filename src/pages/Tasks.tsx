"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  MoreVertical,
  X,
  User,
  Eye,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Task, Site, Employee, Subtask } from "@/types/financial";
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
} from "@/lib/firebase/tasks";
import { getAllSites, getSiteById } from "@/lib/firebase/sites";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllUsers } from "@/lib/firebase/users";
import { getAllocationsBySite } from "@/lib/firebase/siteEmployeeAllocations";
import { SiteEmployeeAllocation } from "@/types/financial";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import { uploadToCloudinary } from "@/lib/cloudinary/upload-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewMembers: (task: Task) => void;
  onViewDetails: (task: Task) => void;
}

function TaskCard({ task, onEdit, onDelete, onViewMembers, onViewDetails }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open details if clicking on the dropdown menu or its trigger
    if ((e.target as HTMLElement).closest('[role="menu"]') || 
        (e.target as HTMLElement).closest('[data-radix-popper-content-wrapper]')) {
      return;
    }
    onViewDetails(task);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500 text-white";
      case "mid":
        return "bg-green-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      "Design": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      "Dev": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      "Research": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      "Content": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
      "Planning": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    return colors[category || ""] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short" });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="mb-3 cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-200 hover:border-primary/20"
    >
      <CardContent className="p-4">
        {/* Category and Priority Badges */}
        <div className="flex items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className={cn("text-xs font-medium border-0", getCategoryColor(task.category))}
          >
            {task.category || "Task"}
          </Badge>
          <Badge
            className={cn("text-xs font-medium px-2 py-0.5", getPriorityColor(task.priority))}
          >
            {task.priority === "high" ? "High" : task.priority === "mid" ? "Mid" : "Low"}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100 leading-tight">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {task.progress}/10
            </span>
          </div>
          <Progress 
            value={(task.progress / 10) * 100} 
            className="h-2 bg-gray-100 dark:bg-gray-800"
          />
        </div>

        {/* Icons Row - Views, Comments, Deadline */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>0</span>
          </div>
          {task.deadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(task.deadline)}</span>
            </div>
          )}
        </div>

        {/* Assigned Members */}
        {task.assignedToNames && task.assignedToNames.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {task.assignedToNames.slice(0, 3).map((name, idx) => (
                <Avatar key={idx} className="h-7 w-7 border-2 border-white dark:border-gray-900 shadow-sm">
                  <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium">
                    {name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignedToNames.length > 3 && (
                <div className="h-7 w-7 rounded-full border-2 border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 shadow-sm">
                  +{task.assignedToNames.length - 3}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-800">
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewMembers(task)}>
                  <Users className="mr-2 h-4 w-4" />
                  View Members
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Additional Info (Site, Pay Rate, etc.) - Collapsed by default */}
        {(task.siteName || task.payRate || task.totalHours) && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
              {task.siteName && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate max-w-[120px]">{task.siteName}</span>
                </div>
              )}
              {task.payRate && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>${task.payRate}/hr</span>
                </div>
              )}
              {task.totalHours && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{task.totalHours} hrs</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Images Indicator */}
        {task.status === "completed" && task.completedImages && task.completedImages.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>{task.completedImages.length} image(s)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewMembers: (task: Task) => void;
  onViewDetails: (task: Task) => void;
  onAddTask?: () => void;
  isAdmin?: boolean;
}

function Column({ id, title, tasks, onEdit, onDelete, onViewMembers, onViewDetails, onAddTask, isAdmin }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });


  return (
    <div className="flex-1 min-w-[320px] max-w-[380px]">
      {/* Column Header */}
      <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 tracking-wide">
            {title}
          </h2>
          <Badge 
            variant="secondary" 
            className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold px-2.5 py-0.5"
          >
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-3 min-h-[500px] p-2 rounded-lg transition-colors bg-gray-50/50 dark:bg-gray-950/50",
          isOver && "bg-primary/5 border-2 border-primary border-dashed"
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewMembers={onViewMembers}
              onViewDetails={onViewDetails}
            />
          ))}
        </SortableContext>

        {/* Add Card Button */}
        {isAdmin && onAddTask && (
          <Button
            variant="ghost"
            className="w-full mt-2 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-primary/5 text-gray-600 dark:text-gray-400 hover:text-primary h-10"
            onClick={onAddTask}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Card
          </Button>
        )}
      </div>
    </div>
  );
}

const Tasks = () => {
  const { user, userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [siteEmployees, setSiteEmployees] = useState<SiteEmployeeAllocation[]>([]);
  const [isLoadingSiteEmployees, setIsLoadingSiteEmployees] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "low" as "low" | "mid" | "high",
    siteId: "",
    assignedTo: [] as string[],
    deadline: "",
    location: "",
    category: "",
    progress: 0,
    subtasks: [] as Subtask[],
    completedImages: [] as string[],
    payRate: undefined as number | undefined,
    totalHours: undefined as number | undefined,
  });

  const [newSubtask, setNewSubtask] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  // Deduplicate employees by name (case-insensitive, normalized)
  const deduplicateEmployees = (employees: Employee[]): Employee[] => {
    const seenByName = new Map<string, Employee>();
    
    for (const employee of employees) {
      // Normalize name: lowercase, trim, remove extra spaces
      const normalizedName = employee.name.toLowerCase().trim().replace(/\s+/g, ' ');
      
      // Only keep the first occurrence of each normalized name
      if (!seenByName.has(normalizedName)) {
        seenByName.set(normalizedName, employee);
      }
    }
    
    return Array.from(seenByName.values());
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [fetchedTasks, fetchedSites, fetchedEmployees, fetchedUsers] = await Promise.all([
        getAllTasks(),
        getAllSites(),
        getAllEmployees(),
        getAllUsers(),
      ]);
      setTasks(fetchedTasks);
      setSites(fetchedSites);
      setEmployees(fetchedEmployees);
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSiteId && sites.length > 0) {
      const site = sites.find((s) => s.id === selectedSiteId);
      if (site) {
        setFormData((prev) => ({
          ...prev,
          payRate: site.hourlyRate || site.dayRate || undefined,
          totalHours: site.invoicingWorkingHours || undefined,
        }));
        
        // Load employees for this site
        loadSiteEmployees(selectedSiteId);
      } else {
        setSiteEmployees([]);
      }
    } else {
      setSiteEmployees([]);
    }
  }, [selectedSiteId, sites]);

  const loadSiteEmployees = async (siteId: string) => {
    try {
      setIsLoadingSiteEmployees(true);
      const allocations = await getAllocationsBySite(siteId);
      setSiteEmployees(allocations);
    } catch (error) {
      console.error("Error loading site employees:", error);
      toast.error("Failed to load site employees");
    } finally {
      setIsLoadingSiteEmployees(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    
    // Check if dropped on a column (status) or another task
    let newStatus: "new" | "in_progress" | "completed" | null = null;
    
    if (over.id === "new" || over.id === "in_progress" || over.id === "completed") {
      newStatus = over.id as "new" | "in_progress" | "completed";
    } else {
      // Dropped on another task, find its status
      const targetTask = tasks.find((t) => t.id === over.id);
      if (targetTask) {
        newStatus = targetTask.status;
      }
    }

    if (!newStatus) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Check if user has permission to update this task
    const isAssigned = task.assignedTo.includes(user?.uid || "");
    const isAdmin = userData?.isAdmin || userData?.role === "admin";
    
    if (!isAssigned && !isAdmin) {
      toast.error("You can only update tasks assigned to you");
      return;
    }

    const oldStatus = task.status;

    try {
      await updateTaskStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus! } : t))
      );
      
      // Send email notification for status change
      try {
        const updatedTask = { ...task, status: newStatus };
        const { notifyTaskStatusChange } = await import("@/lib/resend/taskNotifications");
        await notifyTaskStatusChange(updatedTask, oldStatus, newStatus);
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the status update if email fails
      }
      
      toast.success("Task status updated");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleAddTask = () => {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      priority: "low",
      siteId: "",
      assignedTo: [],
      deadline: "",
      location: "",
      category: "",
      progress: 0,
      subtasks: [],
      completedImages: [],
      payRate: undefined,
      totalHours: undefined,
    });
    setSelectedSiteId("");
    setSelectedEmployees([]);
    setIsDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    // Check if user has permission to edit this task
    const isAssigned = task.assignedTo.includes(user?.uid || "");
    const isAdmin = userData?.isAdmin || userData?.role === "admin";
    
    if (!isAssigned && !isAdmin) {
      toast.error("You can only edit tasks assigned to you");
      return;
    }

    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      siteId: task.siteId || "",
      assignedTo: task.assignedTo || [],
      deadline: task.deadline || "",
      location: task.location || "",
      category: task.category || "",
      progress: task.progress,
      subtasks: task.subtasks || [],
      completedImages: task.completedImages || [],
      payRate: task.payRate,
      totalHours: task.totalHours,
    });
    setSelectedSiteId(task.siteId || "");
    setSelectedEmployees(task.assignedTo || []);
    setIsDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a task title");
      return;
    }

    const isAdmin = userData?.isAdmin || userData?.role === "admin";
    const isAssigned = editingTask?.assignedTo.includes(user?.uid || "") || false;

    // Employees can only update certain fields
    if (editingTask && !isAdmin && isAssigned) {
      // Employees can only update: description, progress, subtasks, completedImages
      const taskData: Partial<Task> = {
        description: formData.description,
        progress: formData.progress,
        subtasks: formData.subtasks,
        completedImages: formData.completedImages,
      };
      
      try {
        setIsSaving(true);
        await updateTask(editingTask.id, taskData);
        toast.success("Task updated successfully");
        setIsDialogOpen(false);
        loadData();
      } catch (error) {
        console.error("Error saving task:", error);
        toast.error("Failed to save task");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Admin can update all fields
    try {
      setIsSaving(true);

      const assignedToNames = selectedEmployees.map((id) => {
        const employee = employees.find((e) => e.id === id);
        const user = users.find((u) => u.uid === id);
        return employee?.name || user?.name || "Unknown";
      });

      const site = sites.find((s) => s.id === selectedSiteId);
      const siteName = site?.name;

      const taskData: Omit<Task, "id" | "createdAt" | "updatedAt"> = {
        title: formData.title,
        description: formData.description,
        status: editingTask?.status || "new",
        priority: formData.priority,
        siteId: selectedSiteId || undefined,
        siteName: siteName,
        assignedTo: selectedEmployees,
        assignedToNames: assignedToNames,
        deadline: formData.deadline || undefined,
        subtasks: formData.subtasks,
        location: formData.location || undefined,
        payRate: formData.payRate,
        totalHours: formData.totalHours,
        completedImages: formData.completedImages,
        progress: formData.progress,
        category: formData.category || undefined,
        createdBy: editingTask?.createdBy || user?.uid || "",
        createdByName: editingTask?.createdByName || userData?.name || "",
      };

      let taskId: string;
      let savedTask: Task;

      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        taskId = editingTask.id;
        savedTask = { ...taskData, id: taskId } as Task;
        
        // Send email notifications for updates
        try {
          const oldAssignedTo = editingTask.assignedTo || [];
          const newAssignedTo = selectedEmployees;
          
          // Check if assignment changed
          if (JSON.stringify(oldAssignedTo.sort()) !== JSON.stringify(newAssignedTo.sort())) {
            const { notifyTaskAssignmentChange } = await import("@/lib/resend/taskNotifications");
            await notifyTaskAssignmentChange(
              savedTask,
              oldAssignedTo,
              newAssignedTo,
              userData?.name || "Admin"
            );
          }
          
          // Check if status changed
          if (editingTask.status !== taskData.status) {
            const { notifyTaskStatusChange } = await import("@/lib/resend/taskNotifications");
            await notifyTaskStatusChange(savedTask, editingTask.status, taskData.status);
          }
          
          // Check if deadline changed
          if (editingTask.deadline !== taskData.deadline) {
            const { notifyTaskDeadlineChange } = await import("@/lib/resend/taskNotifications");
            await notifyTaskDeadlineChange(savedTask, editingTask.deadline, taskData.deadline);
          }
        } catch (emailError) {
          console.error("Error sending email notifications:", emailError);
          // Don't fail the task update if email fails
        }
        
        toast.success("Task updated successfully");
      } else {
        taskId = await createTask(taskData);
        savedTask = { ...taskData, id: taskId } as Task;
        
        // Send email notifications for new task assignments
        if (selectedEmployees.length > 0) {
          try {
            const { notifyTaskAssignment } = await import("@/lib/resend/taskNotifications");
            await notifyTaskAssignment(
              savedTask,
              selectedEmployees,
              userData?.name || "Admin"
            );
          } catch (emailError) {
            console.error("Error sending email notifications:", emailError);
            // Don't fail the task creation if email fails
          }
        }
        
        toast.success("Task created successfully");
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;

    try {
      await deleteTask(deletingTask.id);
      toast.success("Task deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingTask(null);
      loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;

    const subtask: Subtask = {
      id: Date.now().toString(),
      title: newSubtask,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, subtask],
    }));
    setNewSubtask("");
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      ),
    }));
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== subtaskId),
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImages(true);
      const uploadPromises = Array.from(files).map((file) => uploadToCloudinary(file));
      const results = await Promise.all(uploadPromises);
      const imageUrls = results.map((r) => r.secureUrl);

      setFormData((prev) => ({
        ...prev,
        completedImages: [...prev.completedImages, ...imageUrls],
      }));

      toast.success("Images uploaded successfully");
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (imageUrl: string) => {
    setFormData((prev) => ({
      ...prev,
      completedImages: prev.completedImages.filter((url) => url !== imageUrl),
    }));
  };

  // Filter tasks based on user role
  const getFilteredTasks = () => {
    const isAdmin = userData?.isAdmin || userData?.role === "admin";
    const currentUserId = user?.uid || "";
    
    // If admin, show all tasks; otherwise, show only tasks assigned to the current user
    if (isAdmin) {
      return tasks;
    }
    
    // For employees, filter tasks where they are assigned
    // We need to check multiple ways a task could be assigned to this employee:
    // 1. Direct Firebase Auth UID match
    // 2. Employee document ID match (if employee record exists)
    // 3. Email match (through employee or user records)
    
    // First, try to find the employee record for the current user
    let employeeRecordId: string | null = null;
    if (userData?.email) {
      const employee = employees.find(e => e.email?.toLowerCase() === userData.email?.toLowerCase());
      if (employee) {
        employeeRecordId = employee.id;
      }
    }
    
    return tasks.filter((task) => {
      if (!task.assignedTo || task.assignedTo.length === 0) {
        return false; // Don't show unassigned tasks to employees
      }
      
      // Check 1: Direct Firebase Auth UID match
      if (currentUserId && task.assignedTo.includes(currentUserId)) {
        return true;
      }
      
      // Check 2: Employee document ID match
      if (employeeRecordId && task.assignedTo.includes(employeeRecordId)) {
        return true;
      }
      
      // Check 3: Email-based matching (for any assigned ID)
      if (userData?.email) {
        const userEmail = userData.email.toLowerCase();
        
        // Check each assigned ID to see if it matches the current user
        for (const assignedId of task.assignedTo) {
          // Check if this ID is an employee document ID with matching email
          const employee = employees.find(e => e.id === assignedId);
          if (employee && employee.email?.toLowerCase() === userEmail) {
            return true;
          }
          
          // Check if this ID is a user UID with matching email
          const assignedUser = users.find(u => u.uid === assignedId);
          if (assignedUser && assignedUser.email?.toLowerCase() === userEmail) {
            return true;
          }
        }
      }
      
      return false;
    });
  };

  const filteredTasks = getFilteredTasks();

  const getTasksByStatus = (status: "new" | "in_progress" | "completed") => {
    return filteredTasks.filter((t) => t.status === status);
  };

  const columns = [
    { id: "new", title: "TODO", tasks: getTasksByStatus("new") },
    { id: "in_progress", title: "IN PROGRESS", tasks: getTasksByStatus("in_progress") },
    { id: "completed", title: "COMPLETED", tasks: getTasksByStatus("completed") },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Task Management</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Task Dashboard</h1>
        </div>
        {userData?.isAdmin && (
          <Button onClick={handleAddTask} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6">
          {columns.map((column) => (
            <Column
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={column.tasks}
              onEdit={handleEditTask}
              onDelete={(task) => {
                setDeletingTask(task);
                setIsDeleteDialogOpen(true);
              }}
              onViewMembers={(task) => {
                setViewingTask(task);
                setIsMembersDialogOpen(true);
              }}
              onViewDetails={(task) => {
                setDetailsTask(task);
                setIsDetailsDialogOpen(true);
              }}
              onAddTask={userData?.isAdmin ? handleAddTask : undefined}
              isAdmin={userData?.isAdmin || false}
            />
          ))}
        </div>
        <DragOverlay>
          {activeId ? (
            <Card className="opacity-90 rotate-3">
              <CardContent className="p-4">
                <div className="font-semibold text-sm">
                  {tasks.find((t) => t.id === activeId)?.title}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add/Edit Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl w-full p-0 gap-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] sm:rounded-lg">
          <div className="grid md:grid-cols-2 h-[90vh] max-h-[90vh]">
            {/* Left side - Image with Logo and Heading */}
            <div className="relative hidden md:block overflow-hidden md:rounded-l-lg">
              <img
                src="/modalimages/finflow.jpg"
                alt={editingTask ? "Edit Task" : "Create New Task"}
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
                    {editingTask ? "Edit Task" : "Create New Task"}
                  </h2>
                  <p className="text-sm text-white">
                    {editingTask ? "Update task details" : "Add a new task to the dashboard"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Form */}
            <div className="flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:rounded-r-lg bg-background">
              <div className="p-6">
                <DialogHeader className="md:hidden mb-4">
                  <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
                  <DialogDescription>
                    {editingTask ? "Update task details" : "Add a new task to the dashboard"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "low" | "mid" | "high") =>
                    setFormData({ ...formData, priority: value })
                  }
                  disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Design, Dev, Research"
                  disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="site">Site</Label>
              <Select 
                value={selectedSiteId || "none"} 
                onValueChange={(value) => {
                  const newSiteId = value === "none" ? "" : value;
                  setSelectedSiteId(newSiteId);
                }}
                disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSiteId && (
                <div className="mt-4 space-y-3">
                  {/* Pay Rate and Total Hours Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {formData.payRate && (
                      <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border-green-500/30 dark:from-green-500/20 dark:via-green-500/10 dark:to-transparent dark:border-green-500/50">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-transparent rounded-bl-full"></div>
                        <CardContent className="p-4 relative">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20 backdrop-blur-sm border border-green-500/30">
                              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Pay Rate</p>
                              <p className="text-lg font-bold">${formData.payRate}/hr</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {formData.totalHours && (
                      <Card className="relative overflow-hidden border-2 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/30 dark:from-blue-500/20 dark:via-blue-500/10 dark:to-transparent dark:border-blue-500/50">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full"></div>
                        <CardContent className="p-4 relative">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-500/30">
                              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Total Hours</p>
                              <p className="text-lg font-bold">{formData.totalHours} hrs</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Site Employees */}
                  {isLoadingSiteEmployees ? (
                    <div className="text-sm text-muted-foreground">Loading employees...</div>
                  ) : siteEmployees.length > 0 ? (
                    <div>
                      <Label className="mb-2 block">Employees at this Site</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                          
                          // Find employee to get email for user matching
                          const employee = employees.find(e => e.id === allocation.employeeId);
                          const userForEmployee = employee 
                            ? users.find(u => u.email.toLowerCase() === employee.email.toLowerCase())
                            : null;
                          const employeeOrUserId = userForEmployee?.uid || allocation.employeeId;
                          const isSelectedByAnyId = selectedEmployees.includes(allocation.employeeId) || 
                            (userForEmployee && selectedEmployees.includes(userForEmployee.uid));

                          return (
                            <Card
                              key={allocation.id}
                              className={`relative overflow-hidden border-2 bg-gradient-to-br ${gradientColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer ${
                                isSelectedByAnyId ? "ring-2 ring-primary ring-offset-2" : ""
                              }`}
                              onClick={() => {
                                const idToUse = employeeOrUserId;
                                setSelectedEmployees((prev) =>
                                  prev.includes(idToUse)
                                    ? prev.filter((id) => id !== idToUse)
                                    : [...prev, idToUse]
                                );
                              }}
                            >
                              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full"></div>
                              <CardContent className="p-3 relative">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8 border-2 border-background">
                                    <AvatarFallback className={`bg-gradient-to-br ${gradientColor.includes("blue") ? "from-blue-500 to-blue-600" : gradientColor.includes("purple") ? "from-purple-500 to-purple-600" : gradientColor.includes("green") ? "from-green-500 to-green-600" : gradientColor.includes("orange") ? "from-orange-500 to-orange-600" : gradientColor.includes("pink") ? "from-pink-500 to-pink-600" : "from-indigo-500 to-indigo-600"} text-white text-xs`}>
                                      {allocation.employeeName
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{allocation.employeeName}</p>
                                  </div>
                                  {isSelectedByAnyId && (
                                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div>
              <Label>Assign Members</Label>
              <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {selectedEmployees.length > 0
                      ? `${selectedEmployees.length} member(s) selected`
                      : "Select members"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search employees..." />
                    <CommandList>
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {deduplicateEmployees(employees)
                          .sort((a, b) => {
                            // Sort by name for better UX
                            return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
                          })
                          .map((employee) => (
                            <CommandItem
                              key={employee.id}
                              value={employee.id}
                              onSelect={() => {
                                setSelectedEmployees((prev) =>
                                  prev.includes(employee.id)
                                    ? prev.filter((id) => id !== employee.id)
                                    : [...prev, employee.id]
                                );
                              }}
                            >
                              <Checkbox
                                checked={selectedEmployees.includes(employee.id)}
                                className="mr-2"
                              />
                              {employee.name}
                            </CommandItem>
                          ))}
                        {users
                          .filter((user) => {
                            // Only show users that don't have a corresponding employee record
                            // Match by email (case-insensitive)
                            const hasEmployeeRecord = employees.some(
                              (emp) => emp.email.toLowerCase() === user.email.toLowerCase()
                            );
                            return !hasEmployeeRecord;
                          })
                          .map((user) => (
                            <CommandItem
                              key={user.uid}
                              value={user.uid}
                              onSelect={() => {
                                setSelectedEmployees((prev) =>
                                  prev.includes(user.uid)
                                    ? prev.filter((id) => id !== user.uid)
                                    : [...prev, user.uid]
                                );
                              }}
                            >
                              <Checkbox
                                checked={selectedEmployees.includes(user.uid)}
                                className="mr-2"
                              />
                              {user.name || user.email}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Task location"
                  disabled={editingTask && !userData?.isAdmin && editingTask.assignedTo.includes(user?.uid || "")}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="progress">Progress (0-10)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="10"
                value={formData.progress}
                onChange={(e) =>
                  setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div>
              <Label>Subtasks</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add subtask"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddSubtask();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddSubtask} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formData.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={subtask.completed}
                      onCheckedChange={() => handleToggleSubtask(subtask.id)}
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        subtask.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {subtask.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {(editingTask?.status === "completed" || formData.completedImages.length > 0 || editingTask) && (
              <div>
                <Label>Completed Images</Label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploadingImages}
                  className="mb-2"
                />
                {uploadingImages && <p className="text-sm text-muted-foreground">Uploading...</p>}
                {formData.completedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {formData.completedImages.map((url, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={url}
                          alt={`Completed ${idx + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => handleRemoveImage(url)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
                </div>
                <DialogFooter className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTask} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingTask ? (
                      "Update"
                    ) : (
                      "Create"
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
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Task Members</DialogTitle>
            <DialogDescription>
              Members assigned to: {viewingTask?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {viewingTask?.assignedToNames && viewingTask.assignedToNames.length > 0 ? (
              viewingTask.assignedToNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 border rounded">
                  <Avatar>
                    <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span>{name}</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No members assigned</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Task Details</DialogTitle>
            <DialogDescription>
              Complete information about the task
            </DialogDescription>
          </DialogHeader>

          {detailsTask && (
            <div className="space-y-6 mt-4">
              {/* Title and Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{detailsTask.title}</h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm",
                      detailsTask.status === "completed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : detailsTask.status === "in_progress"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    )}
                  >
                    {detailsTask.status === "completed"
                      ? "Completed"
                      : detailsTask.status === "in_progress"
                      ? "In Progress"
                      : "New"}
                  </Badge>
                </div>
                {detailsTask.description && (
                  <p className="text-muted-foreground">{detailsTask.description}</p>
                )}
              </div>

              {/* Category and Priority */}
              <div className="flex items-center gap-3">
                {detailsTask.category && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm",
                      detailsTask.category === "Design"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : detailsTask.category === "Dev"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : detailsTask.category === "Research"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        : detailsTask.category === "Content"
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                        : detailsTask.category === "Planning"
                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    )}
                  >
                    {detailsTask.category}
                  </Badge>
                )}
                <Badge
                  className={cn(
                    "text-sm",
                    detailsTask.priority === "high"
                      ? "bg-red-500 text-white"
                      : detailsTask.priority === "mid"
                      ? "bg-green-500 text-white"
                      : "bg-blue-500 text-white"
                  )}
                >
                  {detailsTask.priority === "high" ? "High" : detailsTask.priority === "mid" ? "Mid" : "Low"} Priority
                </Badge>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Progress</Label>
                  <span className="text-sm text-muted-foreground">{detailsTask.progress}/10</span>
                </div>
                <Progress value={(detailsTask.progress / 10) * 100} className="h-3" />
              </div>

              {/* Grid Layout for Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Site Information */}
                {detailsTask.siteName && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Site
                    </Label>
                    <p className="text-sm">{detailsTask.siteName}</p>
                  </div>
                )}

                {/* Deadline */}
                {detailsTask.deadline && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Deadline
                    </Label>
                    <p className="text-sm">
                      {new Date(detailsTask.deadline).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}

                {/* Pay Rate */}
                {detailsTask.payRate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pay Rate
                    </Label>
                    <p className="text-sm">${detailsTask.payRate}/hr</p>
                  </div>
                )}

                {/* Total Hours */}
                {detailsTask.totalHours && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Total Hours
                    </Label>
                    <p className="text-sm">{detailsTask.totalHours} hours</p>
                  </div>
                )}

                {/* Created By */}
                {detailsTask.createdByName && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Created By
                    </Label>
                    <p className="text-sm">{detailsTask.createdByName}</p>
                  </div>
                )}

                {/* Created Date */}
                {detailsTask.createdAt && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Created On
                    </Label>
                    <p className="text-sm">
                      {new Date(detailsTask.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Assigned Members */}
              {detailsTask.assignedToNames && detailsTask.assignedToNames.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Assigned Members ({detailsTask.assignedToNames.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {detailsTask.assignedToNames.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            {name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks */}
              {detailsTask.subtasks && detailsTask.subtasks.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Subtasks ({detailsTask.subtasks.length})</Label>
                  <div className="space-y-2">
                    {detailsTask.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className={cn(
                          "flex items-center gap-2 p-2 border rounded-lg",
                          subtask.completed && "bg-green-50 dark:bg-green-900/10"
                        )}
                      >
                        {subtask.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            subtask.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Images */}
              {detailsTask.status === "completed" &&
                detailsTask.completedImages &&
                detailsTask.completedImages.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Completed Images ({detailsTask.completedImages.length})
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {detailsTask.completedImages.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`Completed ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors rounded-lg"
                          >
                            <span className="text-white opacity-0 group-hover:opacity-100 text-xs">
                              View Full Size
                            </span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            {detailsTask && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailsDialogOpen(false);
                  handleEditTask(detailsTask);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;

