"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Wallet, Clock3, Calendar, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAllEmployees } from "@/lib/firebase/employees";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { getAllWorkHours } from "@/lib/firebase/workHours";
import { getAllAllocations } from "@/lib/firebase/siteEmployeeAllocations";
import { formatCurrency } from "@/lib/utils";
import { Employee, Payroll, SiteEmployeeAllocation, WorkHours } from "@/types/financial";
import { toast } from "sonner";

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

type SearchResult = {
  key: string;
  name: string;
  employeeId?: string;
  source: "employee" | "payroll";
  status?: "active" | "inactive";
};

const EmployeeCompensationSearch = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [workHours, setWorkHours] = useState<WorkHours[]>([]);
  const [allocations, setAllocations] = useState<SiteEmployeeAllocation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [employeeData, payrollData, workHoursData, allocationData] = await Promise.all([
          getAllEmployees(),
          getAllPayrolls(),
          getAllWorkHours(),
          getAllAllocations(),
        ]);

        const activeEmployees = employeeData.filter(
          (employee) => employee.status === "active" && (employee.type === "employee" || !employee.type),
        );
        setEmployees(activeEmployees);
        setPayrolls(payrollData);
        setWorkHours(workHoursData);
        setAllocations(allocationData);
      } catch (error) {
        console.error("Failed to load employee compensation details:", error);
        toast.error("Unable to load employee details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const searchResults = useMemo(() => {
    const employeeResults: SearchResult[] = employees.map((employee) => ({
      key: `employee:${employee.id}`,
      name: employee.name,
      employeeId: employee.id,
      source: "employee",
      status: employee.status,
    }));

    const seenNames = new Set(employeeResults.map((result) => normalize(result.name)));
    const payrollNameResults: SearchResult[] = [];

    for (const payroll of payrolls) {
      const payrollName = payroll.employeeName || payroll.name;
      if (!payrollName) continue;
      const normalizedPayrollName = normalize(payrollName);
      if (!normalizedPayrollName || seenNames.has(normalizedPayrollName)) continue;

      seenNames.add(normalizedPayrollName);
      payrollNameResults.push({
        key: `payroll-name:${normalizedPayrollName}`,
        name: payrollName.trim(),
        source: "payroll",
      });
    }

    return [...employeeResults, ...payrollNameResults].sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, payrolls]);

  const filteredResults = useMemo(() => {
    const query = normalize(searchTerm);
    if (!query) return searchResults.slice(0, 10);

    return searchResults.filter((result) => normalize(result.name).includes(query)).slice(0, 15);
  }, [searchResults, searchTerm]);

  const selectedResult = useMemo(
    () => searchResults.find((result) => result.key === selectedResultKey) || null,
    [searchResults, selectedResultKey],
  );

  const selectedEmployee = useMemo(
    () =>
      selectedResult?.employeeId
        ? employees.find((employee) => employee.id === selectedResult.employeeId) || null
        : null,
    [employees, selectedResult],
  );

  const employeePayrolls = useMemo(() => {
    if (!selectedResult) return [];
    const selectedName = normalize(selectedResult.name);

    return payrolls
      .filter((payroll) => {
        if (selectedResult.employeeId && payroll.employeeId && payroll.employeeId === selectedResult.employeeId) return true;
        if (payroll.employeeName && normalize(payroll.employeeName) === selectedName) return true;
        return normalize(payroll.name) === selectedName;
      })
      .sort((a, b) => (b.paymentDate || b.date || "").localeCompare(a.paymentDate || a.date || ""));
  }, [payrolls, selectedResult]);

  const employeeWorkHours = useMemo(() => {
    if (!selectedResult) return [];
    const selectedName = normalize(selectedResult.name);
    return workHours
      .filter((entry) => {
        if (selectedResult.employeeId && entry.employeeId === selectedResult.employeeId) return true;
        return normalize(entry.employeeName) === selectedName;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [workHours, selectedResult]);

  const employeeAllocations = useMemo(() => {
    if (!selectedResult) return [];
    const selectedName = normalize(selectedResult.name);
    return allocations
      .filter((allocation) => {
        if (selectedResult.employeeId && allocation.employeeId === selectedResult.employeeId) return true;
        return normalize(allocation.employeeName) === selectedName;
      })
      .sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [allocations, selectedResult]);

  const totalPaid = useMemo(
    () => employeePayrolls.reduce((total, payroll) => total + (Number(payroll.totalAmount) || 0), 0),
    [employeePayrolls],
  );
  const totalHours = useMemo(
    () => employeeWorkHours.reduce((total, work) => total + (Number(work.hoursWorked) || 0), 0),
    [employeeWorkHours],
  );
  const allocatedSiteNames = useMemo(() => {
    const names = Array.from(
      new Set(
        employeeAllocations
          .map((allocation) => allocation.siteName?.trim())
          .filter((siteName): siteName is string => Boolean(siteName)),
      ),
    );
    return names.sort((a, b) => a.localeCompare(b));
  }, [employeeAllocations]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Workforce Compensation</h2>
        <p className="text-muted-foreground">
          Search by name to view compensation history, paid amounts, work hours, and site allocations.
        </p>
      </div>

      <Card className="rounded-[24px]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Search Workforce
          </CardTitle>
          <CardDescription>Type a name and select a person to load details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            {isLoading ? (
              <div className="grid gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <div className="max-h-64 overflow-auto rounded-md border">
                {filteredResults.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No matching result found for this search.</p>
                ) : (
                  filteredResults.map((result) => (
                    <button
                      key={result.key}
                      type="button"
                      onClick={() => setSelectedResultKey(result.key)}
                      className={`flex w-full items-center justify-between border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50 ${
                        selectedResultKey === result.key ? "bg-muted" : ""
                      }`}
                    >
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={result.source === "employee" ? "default" : "secondary"}>
                        {result.source === "employee" ? result.status || "employee" : "payroll"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedResult ? (
        <Card className="rounded-[24px]">
          <CardContent className="flex min-h-28 items-center justify-center text-muted-foreground">
            Select a result from search to view details.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="rounded-[24px]">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  Employee
                </CardDescription>
                <CardTitle className="text-base">{selectedResult.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{selectedEmployee?.role || "Role not available for this record"}</p>
                <p>{selectedEmployee?.email || "Email not available for this record"}</p>
              </CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Allocated Sites
                </CardDescription>
                <CardTitle className="text-base leading-snug">
                  {allocatedSiteNames.length > 0 ? allocatedSiteNames.join(", ") : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {employeeAllocations.length} allocation{employeeAllocations.length === 1 ? "" : "s"}
              </CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Total Paid
                </CardDescription>
                <CardTitle className="text-base">{formatCurrency(totalPaid)}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{employeePayrolls.length} payment records</CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4" />
                  Total Work Hours
                </CardDescription>
                <CardTitle className="text-base">{totalHours.toFixed(2)} hrs</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{employeeWorkHours.length} work entries</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="rounded-[24px]">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All recorded payments with date and amount.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeePayrolls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No payments found for this employee.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeePayrolls.map((payroll) => (
                        <TableRow key={payroll.id}>
                          <TableCell>{payroll.paymentDate || payroll.date || "-"}</TableCell>
                          <TableCell>{payroll.siteOfWork || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={payroll.status === "paid" ? "default" : "secondary"}>{payroll.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(payroll.totalAmount) || 0, payroll.currency || "AUD")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="rounded-[24px]">
              <CardHeader>
                <CardTitle>Work Hours by Site</CardTitle>
                <CardDescription>Recorded dates, sites, and hours worked.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeWorkHours.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No work hours found for this employee.
                        </TableCell>
                      </TableRow>
                    ) : (
                      employeeWorkHours.slice(0, 20).map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.date}</TableCell>
                          <TableCell>{entry.siteName || "-"}</TableCell>
                          <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                          <TableCell className="text-right font-medium">{entry.hoursWorked.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[24px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Site Allocations
              </CardTitle>
              <CardDescription>Assigned sites and allocated working time details.</CardDescription>
            </CardHeader>
            <CardContent>
              {employeeAllocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No site allocations found for this employee.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {employeeAllocations.map((allocation) => (
                    <Card key={allocation.id} className="rounded-[24px] border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{allocation.siteName}</CardTitle>
                        <CardDescription>Employee #{allocation.employeeNumber}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Allocated Time:</span>{" "}
                          {allocation.actualWorkingTime || allocation.allocatedHours || "-"}
                        </p>
                        {allocation.hasExtraTime && (
                          <p>
                            <span className="text-muted-foreground">Extra Time:</span>{" "}
                            {allocation.extraTime || "-"} {allocation.extraTimeDay ? `(${allocation.extraTimeDay})` : ""}
                          </p>
                        )}
                        {allocation.notes && (
                          <p className="text-muted-foreground">Note: {allocation.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default EmployeeCompensationSearch;
