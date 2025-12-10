"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, CheckCircle2, Loader2, Trash2, Edit, Calendar } from "lucide-react";
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
import { Reminder } from "@/types/financial";
import { getAllReminders, addReminder, updateReminder, deleteReminder, markReminderCompleted } from "@/lib/firebase/reminders";
import { toast } from "sonner";

const Reminders = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: "invoice" as "invoice" | "payroll" | "payment",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "high" | "medium" | "low",
    relatedId: "",
  });

  // Load reminders from Firebase
  useEffect(() => {
    const loadReminders = async () => {
      try {
        setIsLoading(true);
        const fetchedReminders = await getAllReminders();
        setReminders(fetchedReminders);
      } catch (error) {
        console.error("Error loading reminders:", error);
        toast.error("Failed to load reminders. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadReminders();
  }, []);

  const resetForm = () => {
    setFormData({
      type: "invoice",
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      relatedId: "",
    });
    setEditingReminderId(null);
  };

  const handleEditReminder = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setFormData({
      type: reminder.type,
      title: reminder.title,
      description: reminder.description,
      dueDate: reminder.dueDate,
      priority: reminder.priority,
      relatedId: reminder.relatedId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteReminder = (reminder: Reminder) => {
    setDeletingReminderId(reminder.id);
    setIsDeleteDialogOpen(true);
  };

  const handleMarkComplete = async (reminderId: string) => {
    try {
      await markReminderCompleted(reminderId);
      const updatedReminders = await getAllReminders();
      setReminders(updatedReminders);
      toast.success("Reminder marked as completed!");
    } catch (error) {
      console.error("Error marking reminder as completed:", error);
      toast.error("Failed to mark reminder as completed. Please try again.");
    }
  };

  const handleSaveReminder = async () => {
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast.error("Please fill in all required fields (Title, Description, Due Date)");
      return;
    }

    try {
      setIsSaving(true);

      if (editingReminderId) {
        // Update existing reminder
        await updateReminder(editingReminderId, {
          type: formData.type,
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          priority: formData.priority,
          relatedId: formData.relatedId,
        });

        // Reload reminders to get the latest data from Firebase
        const updatedReminders = await getAllReminders();
        setReminders(updatedReminders);
        
        toast.success("Reminder updated successfully!");
        setIsEditDialogOpen(false);
      } else {
        // Add new reminder
        const newReminder: Omit<Reminder, "id"> = {
          type: formData.type,
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          priority: formData.priority,
          status: "pending",
          relatedId: formData.relatedId,
        };

        // Add reminder to Firebase
        await addReminder(newReminder);
        
        // Reload reminders to get the latest data from Firebase
        const updatedReminders = await getAllReminders();
        setReminders(updatedReminders);
        
        toast.success("Reminder added successfully!");
        setIsAddDialogOpen(false);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving reminder:", error);
      toast.error(`Failed to ${editingReminderId ? 'update' : 'add'} reminder. Please try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingReminderId) return;

    try {
      await deleteReminder(deletingReminderId);
      
      // Reload reminders to get the latest data from Firebase
      const updatedReminders = await getAllReminders();
      setReminders(updatedReminders);
      
      toast.success("Reminder deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingReminderId(null);
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder. Please try again.");
    }
  };

  const handleAddReminder = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const pendingReminders = reminders.filter(r => r.status === "pending");
  const completedReminders = reminders.filter(r => r.status === "completed");

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-500/10 via-orange-500/5 to-background border border-yellow-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Reminders
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Manage notifications and alerts efficiently</p>
        </div>
          <Button 
            onClick={handleAddReminder}
            className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
            size="lg"
          >
          <Bell className="mr-2 h-4 w-4" />
          New Reminder
        </Button>
        </div>
      </div>

      <Card className="border-2 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-muted/30 border-b-2">
          <div>
            <CardTitle className="text-xl font-bold">Pending Reminders</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Active reminders requiring attention</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading reminders...</p>
              </div>
            ) : pendingReminders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No pending reminders</p>
              </div>
            ) : (
              pendingReminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className="flex items-start justify-between p-5 border-2 rounded-xl hover:border-yellow-500/50 hover:bg-gradient-to-r hover:from-yellow-500/5 hover:to-transparent transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg group"
                  onClick={() => handleEditReminder(reminder)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        reminder.priority === "high" ? "bg-red-500/10" : 
                        reminder.priority === "medium" ? "bg-yellow-500/10" : "bg-blue-500/10"
                      }`}>
                        <Bell className={`h-4 w-4 ${
                          reminder.priority === "high" ? "text-red-600 dark:text-red-400" : 
                          reminder.priority === "medium" ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"
                        }`} />
                      </div>
                      <h4 className="font-bold text-lg">{reminder.title}</h4>
                      <Badge 
                        variant={reminder.priority === "high" ? "destructive" : reminder.priority === "medium" ? "default" : "secondary"}
                        className={
                          reminder.priority === "high" ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20" :
                          reminder.priority === "medium" ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" :
                          "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                        }
                      >
                        {reminder.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{reminder.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{reminder.description}</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground">
                      Due: {new Date(reminder.dueDate).toLocaleDateString()}
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleMarkComplete(reminder.id)}
                      title="Mark as completed"
                      className="h-9 w-9 hover:bg-green-500/10 text-green-600 dark:text-green-400 transition-all duration-200"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReminder(reminder)}
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                      title="Delete reminder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {completedReminders.length > 0 && (
        <Card className="border-2 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-muted/30 border-b-2">
            <div>
              <CardTitle className="text-xl font-bold">Completed Reminders</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Finished reminder tasks</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedReminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className="flex items-start justify-between p-5 border-2 rounded-xl bg-muted/30 opacity-75 hover:opacity-100 transition-opacity"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-semibold line-through text-muted-foreground">{reminder.title}</h4>
                      <Badge variant="outline" className="text-xs">{reminder.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{reminder.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Reminder Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
            <DialogDescription>
              Create a new reminder to track important tasks and deadlines.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as "invoice" | "payroll" | "payment" })}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as "high" | "medium" | "low" })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Invoice Overdue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="INV-2025-003 from Tech Solutions is overdue"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relatedId">Related ID</Label>
                <Input
                  id="relatedId"
                  value={formData.relatedId}
                  onChange={(e) => setFormData({ ...formData, relatedId: e.target.value })}
                  placeholder="inv-003"
                />
              </div>
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
            <Button onClick={handleSaveReminder} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Reminder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reminder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
            <DialogDescription>
              Update the reminder details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as "invoice" | "payroll" | "payment" })}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as "high" | "medium" | "low" })}
                >
                  <SelectTrigger id="edit-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Invoice Overdue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="INV-2025-003 from Tech Solutions is overdue"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date *</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-relatedId">Related ID</Label>
                <Input
                  id="edit-relatedId"
                  value={formData.relatedId}
                  onChange={(e) => setFormData({ ...formData, relatedId: e.target.value })}
                  placeholder="inv-003"
                />
              </div>
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
            <Button onClick={handleSaveReminder} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Reminder"
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
              This action cannot be undone. This will permanently delete the reminder from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingReminderId(null)}>
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

export default Reminders;
