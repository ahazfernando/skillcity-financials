"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllAuditSubmissions,
  approveAuditSubmission,
  rejectAuditSubmission,
  SiteAudit,
} from "@/lib/firebase/audit";
import { format } from "date-fns";
import { Calendar, Check, X, Eye, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

export default function AuditReview() {
  const { userData } = useAuth();
  const [audits, setAudits] = useState<SiteAudit[]>([]);
  const [filteredAudits, setFilteredAudits] = useState<SiteAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudit, setSelectedAudit] = useState<SiteAudit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [cleanerFilter, setCleanerFilter] = useState<string>("all");

  useEffect(() => {
    loadAudits();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [audits, statusFilter, dateFilter, cleanerFilter]);

  const loadAudits = async () => {
    try {
      setLoading(true);
      const fetchedAudits = await getAllAuditSubmissions();
      setAudits(fetchedAudits);
    } catch (error) {
      console.error("Error loading audits:", error);
      toast.error("Failed to load audit submissions");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...audits];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((audit) => audit.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = format(dateFilter, "yyyy-MM-dd");
      filtered = filtered.filter((audit) => audit.date === filterDate);
    }

    // Cleaner filter
    if (cleanerFilter !== "all") {
      filtered = filtered.filter((audit) => audit.cleanerId === cleanerFilter);
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.createdAt.localeCompare(a.createdAt);
    });

    setFilteredAudits(filtered);
  };

  const handleViewDetails = (audit: SiteAudit) => {
    setSelectedAudit(audit);
    setIsDialogOpen(true);
    setRejectionReason("");
    setApprovalNotes("");
  };

  const handleApprove = async () => {
    if (!selectedAudit || !userData) return;

    try {
      setIsApproving(true);
      await approveAuditSubmission(
        selectedAudit.id,
        userData.uid,
        userData.name || userData.email || "Admin",
        approvalNotes.trim() || undefined
      );
      toast.success("Audit submission approved");
      setIsDialogOpen(false);
      loadAudits();
    } catch (error) {
      console.error("Error approving audit:", error);
      toast.error("Failed to approve audit submission");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAudit || !userData || !rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      setIsRejecting(true);
      await rejectAuditSubmission(
        selectedAudit.id,
        userData.uid,
        userData.name || userData.email || "Admin",
        rejectionReason.trim()
      );
      toast.success("Audit submission rejected");
      setIsDialogOpen(false);
      loadAudits();
    } catch (error) {
      console.error("Error rejecting audit:", error);
      toast.error("Failed to reject audit submission");
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-500">
            <Check className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <X className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Pending
          </Badge>
        );
    }
  };

  // Get unique cleaners for filter
  const uniqueCleaners = Array.from(
    new Set(audits.map((a) => a.cleanerId))
  ).map((id) => {
    const audit = audits.find((a) => a.cleanerId === id);
    return { id, name: audit?.cleanerName || "Unknown" };
  });

  // Group audits by date
  const auditsByDate = filteredAudits.reduce((acc, audit) => {
    if (!acc[audit.date]) {
      acc[audit.date] = [];
    }
    acc[audit.date].push(audit);
    return acc;
  }, {} as Record<string, SiteAudit[]>);

  const sortedDates = Object.keys(auditsByDate).sort(
    (a, b) => b.localeCompare(a)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Audit Review</h1>
        <p className="text-muted-foreground">
          Review and approve/reject site audit submissions from cleaners
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                    }}
                    initialFocus
                  />
                  {dateFilter && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDateFilter(undefined)}
                      >
                        Clear filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Cleaner</Label>
              <Select value={cleanerFilter} onValueChange={setCleanerFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cleaners</SelectItem>
                  {uniqueCleaners.map((cleaner) => (
                    <SelectItem key={cleaner.id} value={cleaner.id}>
                      {cleaner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No audit submissions found</p>
            </CardContent>
          </Card>
        ) : (
          sortedDates.map((date) => (
            <Card key={date}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {format(new Date(date), "EEEE, MMMM d, yyyy")}
                </CardTitle>
                <CardDescription>
                  {auditsByDate[date].length} submission
                  {auditsByDate[date].length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditsByDate[date].map((audit) => (
                    <Card key={audit.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {audit.siteName || "Unknown Site"}
                              </h3>
                              {getStatusBadge(audit.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Cleaner: {audit.cleanerName} ({audit.cleanerEmail})
                            </p>
                            {audit.images.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <ImageIcon className="h-4 w-4" />
                                {audit.images.length} image
                                {audit.images.length !== 1 ? "s" : ""}
                              </div>
                            )}
                            {audit.approvedBy && (
                              <p className="text-xs text-muted-foreground">
                                {audit.status === "approved"
                                  ? `Approved by ${audit.approvedByName}`
                                  : `Rejected by ${audit.approvedByName}`}
                                {audit.approvedAt &&
                                  ` on ${format(
                                    new Date(audit.approvedAt),
                                    "MMM d, yyyy 'at' h:mm a"
                                  )}`}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(audit)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Submission Details</DialogTitle>
            <DialogDescription>
              Review the submission and approve or reject it
            </DialogDescription>
          </DialogHeader>

          {selectedAudit && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Site</Label>
                  <p className="font-medium">
                    {selectedAudit.siteName || "Unknown Site"}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedAudit.date), "PPP")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cleaner</Label>
                  <p className="font-medium">{selectedAudit.cleanerName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedAudit.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  Questions & Answers
                </Label>
                <div className="space-y-3">
                  {selectedAudit.questions.map((q, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <p className="font-medium text-sm mb-1">{q.question}</p>
                      <p className="text-sm text-muted-foreground">{q.answer}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAudit.images.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Site Images ({selectedAudit.images.length})
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedAudit.images.map((imageUrl, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                        <Image
                          src={imageUrl}
                          alt={`Site image ${idx + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAudit.notes && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Additional Notes
                  </Label>
                  <p className="text-sm border rounded-lg p-3">{selectedAudit.notes}</p>
                </div>
              )}

              {selectedAudit.rejectionReason && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Rejection Reason
                  </Label>
                  <p className="text-sm border rounded-lg p-3 text-destructive">
                    {selectedAudit.rejectionReason}
                  </p>
                </div>
              )}

              {selectedAudit.status === "pending" && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                    <Textarea
                      id="approval-notes"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Add any notes about this approval..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rejection-reason">Rejection Reason (Required if rejecting)</Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this submission is being rejected..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedAudit?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isApproving || isRejecting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isApproving || isRejecting}
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
              </>
            )}
            {selectedAudit?.status !== "pending" && (
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
