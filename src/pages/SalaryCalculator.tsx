"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Calculator, DollarSign, Clock, FileText, Download, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Employee, EmployeePayRate } from "@/types/financial";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getEmployeePayRatesByEmployee } from "@/lib/firebase/employeePayRates";

interface SiteCalculation {
  siteId: string;
  siteName: string;
  hourlyRate: number;
  travelAllowance: number;
  hoursWorked: number;
  subtotal: number;
}

const SalaryCalculator = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [payRates, setPayRates] = useState<EmployeePayRate[]>([]);
  const [calculations, setCalculations] = useState<SiteCalculation[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isLoadingPayRates, setIsLoadingPayRates] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadPayRates(selectedEmployeeId);
      const employee = employees.find((emp) => emp.id === selectedEmployeeId);
      setSelectedEmployee(employee || null);
    } else {
      setPayRates([]);
      setCalculations([]);
      setSelectedEmployee(null);
    }
  }, [selectedEmployeeId, employees]);

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const fetchedEmployees = await getAllEmployees();
      // Filter out clients and inactive employees
      const activeEmployees = fetchedEmployees.filter(
        (emp) => emp.status === "active" && (!emp.type || emp.type === "employee")
      );
      // Sort employees alphabetically by name
      const sortedEmployees = activeEmployees.sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      setEmployees(sortedEmployees);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Failed to load employees");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const loadPayRates = async (employeeId: string) => {
    try {
      setIsLoadingPayRates(true);
      const fetchedPayRates = await getEmployeePayRatesByEmployee(employeeId);
      setPayRates(fetchedPayRates);

      // Initialize calculations with pay rates
      const initialCalculations: SiteCalculation[] = fetchedPayRates.map((pr) => ({
        siteId: pr.siteId,
        siteName: pr.siteName,
        hourlyRate: pr.hourlyRate,
        travelAllowance: pr.travelAllowance || 0,
        hoursWorked: 0,
        subtotal: 0,
      }));
      setCalculations(initialCalculations);
    } catch (error) {
      console.error("Error loading pay rates:", error);
      toast.error("Failed to load pay rates");
    } finally {
      setIsLoadingPayRates(false);
    }
  };

  const handleHoursChange = (siteId: string, hours: number) => {
    setCalculations((prev) =>
      prev.map((calc) => {
        if (calc.siteId === siteId) {
          const hoursWorked = Math.max(0, hours);
          const subtotal = hoursWorked * calc.hourlyRate + calc.travelAllowance;
          return { ...calc, hoursWorked, subtotal };
        }
        return calc;
      })
    );
  };

  const calculateTotal = () => {
    return calculations.reduce((sum, calc) => sum + calc.subtotal, 0);
  };

  const calculateTotalHours = () => {
    return calculations.reduce((sum, calc) => sum + calc.hoursWorked, 0);
  };

  const getInvoiceFrequencyLabel = (frequency?: string) => {
    switch (frequency) {
      case "Monthly":
        return "Monthly";
      case "Fortnightly":
        return "Fortnightly";
      case "Weekly":
        return "Weekly";
      default:
        return "Not set";
    }
  };

  const handleExport = () => {
    if (!selectedEmployee) return;

    const data = {
      employee: selectedEmployee.name,
      email: selectedEmployee.email,
      invoiceFrequency: selectedEmployee.invoiceCollectionFrequency || "Not set",
      date: new Date().toLocaleDateString(),
      calculations: calculations.map((calc) => ({
        site: calc.siteName,
        hourlyRate: calc.hourlyRate,
        hours: calc.hoursWorked,
        travelAllowance: calc.travelAllowance,
        subtotal: calc.subtotal,
      })),
      totalHours: calculateTotalHours(),
      totalSalary: calculateTotal(),
    };

    const content = `
Employee Salary Calculation Report
==================================
Employee: ${data.employee}
Email: ${data.email}
Invoice Frequency: ${data.invoiceFrequency}
Date: ${data.date}

Site Breakdown:
${data.calculations
  .map(
    (calc) => `
Site: ${calc.site}
  Hourly Rate: $${calc.hourlyRate.toFixed(2)}
  Hours Worked: ${calc.hours}
  Travel Allowance: $${calc.travelAllowance.toFixed(2)}
  Subtotal: $${calc.subtotal.toFixed(2)}
`
  )
  .join("")}
Total Hours: ${data.totalHours}
Total Salary: $${data.totalSalary.toFixed(2)}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salary-calculation-${selectedEmployee.name}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Calculation exported successfully");
  };

  const totalSalary = calculateTotal();
  const totalHours = calculateTotalHours();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Salary Calculator</h2>
        <p className="text-muted-foreground">
          Calculate employee salaries based on pay rates and hours worked
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
          <CardDescription>Choose an employee to calculate their salary</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEmployees ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={employeePopoverOpen}
                  className="w-full justify-between"
                >
                  {selectedEmployee
                    ? `${selectedEmployee.name}${selectedEmployee.email ? ` (${selectedEmployee.email})` : ""}`
                    : "Select an employee..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employees..." />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {employees.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.name} ${employee.email || ""}`}
                          onSelect={() => {
                            setSelectedEmployeeId(employee.id);
                            setEmployeePopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmployeeId === employee.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{employee.name}</span>
                            {employee.email && (
                              <span className="text-xs text-muted-foreground">{employee.email}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Employee Information</CardTitle>
                <CardDescription>
                  {selectedEmployee.name} - {selectedEmployee.role || "N/A"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                <FileText className="h-3 w-3 mr-1" />
                Invoice Frequency: {getInvoiceFrequencyLabel(selectedEmployee.invoiceCollectionFrequency)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{selectedEmployee.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <p className="text-sm font-medium">{selectedEmployee.phone || "N/A"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Base Salary</Label>
                <p className="text-sm font-medium">
                  ${selectedEmployee.salary ? selectedEmployee.salary.toLocaleString() : "0"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Invoice Frequency</Label>
                <p className="text-sm font-medium">
                  {getInvoiceFrequencyLabel(selectedEmployee.invoiceCollectionFrequency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoadingPayRates && selectedEmployeeId ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : calculations.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Salary Calculation</CardTitle>
              <CardDescription>
                Enter hours worked for each site to calculate the total salary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Site</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Travel Allowance</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calc) => (
                      <TableRow key={calc.siteId}>
                        <TableCell className="font-medium">{calc.siteName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">${calc.hourlyRate.toFixed(2)}/hr</Badge>
                        </TableCell>
                        <TableCell>
                          {calc.travelAllowance > 0 ? (
                            <Badge variant="secondary">
                              ${calc.travelAllowance.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">$0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            value={calc.hoursWorked || ""}
                            onChange={(e) =>
                              handleHoursChange(calc.siteId, parseFloat(e.target.value) || 0)
                            }
                            className="w-24"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${calc.subtotal.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Hours</Label>
                    <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Calculator className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Salary</Label>
                    <p className="text-2xl font-bold">${totalSalary.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Average Rate</Label>
                    <p className="text-2xl font-bold">
                      ${totalHours > 0 ? (totalSalary / totalHours).toFixed(2) : "0.00"}/hr
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleExport} disabled={totalHours === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Calculation
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : selectedEmployeeId && !isLoadingPayRates ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No pay rates found for this employee. Please add pay rates first.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default SalaryCalculator;

