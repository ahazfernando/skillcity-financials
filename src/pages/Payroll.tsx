"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SearchFilter } from "@/components/SearchFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { mockPayrolls } from "@/data/mockData";
import { Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Payroll = () => {
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredPayrolls = mockPayrolls.filter(payroll => {
    const matchesSearch = payroll.employeeName.toLowerCase().includes(searchValue.toLowerCase()) ||
      payroll.period.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = statusFilter === "all" || payroll.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payroll</h2>
          <p className="text-muted-foreground">Manage employee payroll (GST exempt)</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Payroll
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <SearchFilter
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              placeholder="Search by employee or period..."
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-medium">{payroll.employeeName}</TableCell>
                    <TableCell>{payroll.period}</TableCell>
                    <TableCell>${payroll.basicSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-success">${payroll.allowances.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">-${payroll.deductions.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold">${payroll.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={payroll.status} />
                    </TableCell>
                    <TableCell>
                      {payroll.paymentDate ? new Date(payroll.paymentDate).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      {payroll.receiptUrl ? (
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Badge variant="outline">No receipt</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {payroll.notes || "-"}
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

export default Payroll;
