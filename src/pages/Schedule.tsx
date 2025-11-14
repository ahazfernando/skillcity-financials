"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockWorkSchedules } from "@/data/mockData";
import { Search, Calendar } from "lucide-react";

const Schedule = () => {
  const [searchValue, setSearchValue] = useState("");

  const filteredSchedules = mockWorkSchedules.filter(schedule => {
    return schedule.siteName.toLowerCase().includes(searchValue.toLowerCase()) ||
      schedule.employeeName.toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Work Schedule</h2>
          <p className="text-muted-foreground">Track employee assignments and hours</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Add Schedule
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by site or employee..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {new Date(schedule.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{schedule.siteName}</TableCell>
                    <TableCell>{schedule.employeeName}</TableCell>
                    <TableCell>{schedule.hoursWorked} hours</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {schedule.notes || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Schedule;
