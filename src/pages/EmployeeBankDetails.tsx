"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getBankDetailsByEmployee,
  upsertBankDetails,
} from "@/lib/firebase/bankDetails";
import { BankDetails } from "@/types/financial";
import { Skeleton } from "@/components/ui/skeleton";

const EmployeeBankDetails = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [formData, setFormData] = useState({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    branch: "",
    idNumber: "",
    swiftCode: "",
  });

  useEffect(() => {
    if (user?.uid) {
      loadBankDetails();
    }
  }, [user]);

  const loadBankDetails = async () => {
    try {
      setIsLoading(true);
      const employeeId = user?.uid || "";
      const details = await getBankDetailsByEmployee(employeeId);
      
      if (details) {
        setBankDetails(details);
        setFormData({
          bankName: details.bankName ?? "",
          accountHolderName: details.accountHolderName ?? "",
          accountNumber: details.accountNumber ?? "",
          branch: details.branch ?? "",
          idNumber: details.idNumber ?? "",
          swiftCode: details.swiftCode ?? "",
        });
      } else {
        // Reset form data if no details exist
        setFormData({
          bankName: "",
          accountHolderName: "",
          accountNumber: "",
          branch: "",
          idNumber: "",
          swiftCode: "",
        });
      }
    } catch (error) {
      console.error("Error loading bank details:", error);
      toast.error("Failed to load bank details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error("User information not available");
      return;
    }

    // Validation
    if (!formData.bankName || !formData.accountHolderName || !formData.accountNumber || !formData.branch) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const employeeId = user.uid;
      
      await upsertBankDetails(employeeId, {
        bankName: formData.bankName,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        branch: formData.branch,
        idNumber: formData.idNumber || undefined,
        swiftCode: formData.swiftCode || undefined,
      });

      toast.success("Bank details saved successfully!");
      await loadBankDetails();
    } catch (error) {
      console.error("Error saving bank details:", error);
      toast.error("Failed to save bank details");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Bank Details
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Enter and update your bank account information for payroll
          </p>
        </div>
      </div>

      {/* Bank Details Form */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Account Information
          </CardTitle>
          <CardDescription>
            Your bank details are securely stored and only accessible to you and administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">
                    Bank Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankName"
                    value={formData.bankName}
                    onChange={(e) =>
                      setFormData({ ...formData, bankName: e.target.value })
                    }
                    placeholder="Enter bank name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">
                    Account Holder Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) =>
                      setFormData({ ...formData, accountHolderName: e.target.value })
                    }
                    placeholder="Enter account holder name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    Account Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, accountNumber: e.target.value })
                    }
                    placeholder="Enter account number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">
                    Branch <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    placeholder="Enter branch name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idNumber">ID/NIC Number (Optional)</Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, idNumber: e.target.value })
                    }
                    placeholder="Enter ID/NIC number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                  <Input
                    id="swiftCode"
                    value={formData.swiftCode}
                    onChange={(e) =>
                      setFormData({ ...formData, swiftCode: e.target.value.toUpperCase() })
                    }
                    placeholder="Enter SWIFT/BIC code"
                    maxLength={11}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSaving} className="min-w-32">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Details
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeBankDetails;




