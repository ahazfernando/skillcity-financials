"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockReminders } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2 } from "lucide-react";

const Reminders = () => {
  const pendingReminders = mockReminders.filter(r => r.status === "pending");
  const completedReminders = mockReminders.filter(r => r.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reminders</h2>
          <p className="text-muted-foreground">Manage notifications and alerts</p>
        </div>
        <Button>
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
            {pendingReminders.map((reminder) => (
              <div key={reminder.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
                <Button variant="ghost" size="sm">
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {pendingReminders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No pending reminders</p>
              </div>
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
    </div>
  );
};

export default Reminders;
