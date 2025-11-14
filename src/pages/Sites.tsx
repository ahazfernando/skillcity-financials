"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockSites } from "@/data/mockData";
import { Search, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Sites = () => {
  const [searchValue, setSearchValue] = useState("");

  const filteredSites = mockSites.filter(site => {
    return site.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      site.clientName.toLowerCase().includes(searchValue.toLowerCase()) ||
      site.address.toLowerCase().includes(searchValue.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sites</h2>
          <p className="text-muted-foreground">Manage cleaning sites and locations</p>
        </div>
        <Button>
          <Building2 className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Site List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by site name, client, or address..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Contract Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>{site.clientName}</TableCell>
                    <TableCell>{site.address}</TableCell>
                    <TableCell>{site.contactPerson}</TableCell>
                    <TableCell>{site.contactPhone}</TableCell>
                    <TableCell className="font-semibold">${site.contractValue.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={site.status === "active" ? "bg-success" : "bg-muted"}>
                        {site.status}
                      </Badge>
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

export default Sites;
