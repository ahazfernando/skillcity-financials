"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DeleteCollectionsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm("⚠️ WARNING: This will permanently delete ALL data except the 'users' collection!\n\nAre you absolutely sure?")) {
      return;
    }

    if (!confirm("This is your LAST chance to cancel. Click OK to proceed with deletion.")) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/delete-all-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete collections");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="text-red-600">⚠️ Delete All Collections (Except Users)</CardTitle>
          <CardDescription>
            This will permanently delete all documents from all collections except the "users" collection.
            This action cannot be undone!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Danger Zone</AlertTitle>
            <AlertDescription>
              This operation will delete all data from:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>employees, workRecords, workHours, employeeTimesheets</li>
                <li>employeePayRates, bankDetails, leaveRequests</li>
                <li>invoices, payroll, expenses</li>
                <li>sites, clients, siteEmployeeAllocations</li>
                <li>reminders, groups, chatGroups, messages</li>
                <li>activityLogs, tasks, cleaningTracker</li>
                <li>products, categories, employeeLocations</li>
              </ul>
              <strong className="mt-2 block">The "users" collection will be preserved.</strong>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleDelete}
            disabled={loading}
            variant="destructive"
            size="lg"
            className="w-full"
          >
            {loading ? "Deleting..." : "Delete All Collections (Except Users)"}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert>
              <AlertTitle>Deletion Complete</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Total documents deleted:</strong> {result.totalDeleted}</p>
                  <p><strong>Collections processed:</strong> {result.results?.length || 0}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-semibold">View Details</summary>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {result.results?.map((r: any, i: number) => (
                        <li key={i}>
                          {r.collection}: {r.count} documents
                          {r.error && <span className="text-red-600"> (Error: {r.error})</span>}
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
