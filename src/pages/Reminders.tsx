"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, CheckCircle2, Loader2, Trash2, Edit } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reminders</h2>
          <p className="text-muted-foreground">Manage notifications and alerts</p>
        </div>
        <Button onClick={handleAddReminder}>
          <Bell className="mr-2 h-4 w-4" />
          New Reminder
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reminders</CardTitle>
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
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleEditReminder(reminder)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{reminder.title}</h4>
                      <Badge variant={
                        reminder.priority === "high" ? "destructive" : 
                        reminder.priority === "medium" ? "default" : "secondary"
                      }>
                        {reminder.priority}
                      </Badge>
                      <Badge variant="outline">{reminder.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Due: {new Date(reminder.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleMarkComplete(reminder.id)}
                      title="Mark as completed"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReminder(reminder)}
                      className="text-destructive hover:text-destructive"
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
        <Card>
          <CardHeader>
            <CardTitle>Completed Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedReminders.map((reminder) => (
                <div key={reminder.id} className="flex items-start justify-between p-4 border rounded-lg opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold line-through">{reminder.title}</h4>
                      <Badge variant="outline">{reminder.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{reminder.description}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-success" />
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
