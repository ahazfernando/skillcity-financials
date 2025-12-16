"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Shield, Mail, LogOut } from "lucide-react";
import { authService } from "@/lib/authService";

interface ProtectedRouteProps {
  children: ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireApproval = true,
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check if user needs approval
  if (requireApproval && userData && !userData.approved) {
    const handleSignOut = async () => {
      try {
        await authService.logout();
        router.push("/signin");
      } catch (error) {
        console.error("Error signing out:", error);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="max-w-lg w-full border-2 shadow-2xl relative overflow-hidden rounded-[24px]">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
          
          <CardHeader className="relative text-center pb-4">
            <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/30 dark:border-amber-500/50 w-20 h-20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent">
              Account Pending Approval
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Your account is currently under review
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 border border-amber-500/20 dark:border-amber-500/30">
              <p className="text-sm text-foreground leading-relaxed">
                Thank you for registering! Your account has been created successfully and is now pending administrator approval. 
                Once approved, you'll receive access to the system and can start using all available features.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">What happens next?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    An administrator will review your account and approve it shortly. You'll be notified once access is granted.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 dark:bg-green-500/10 border border-green-500/20">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Need assistance?</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you have questions or need to expedite the approval process, please contact your system administrator.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full group hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if admin access is required
  if (requireAdmin && userData) {
    const isAdmin = userData.role === "admin" || userData.isAdmin;
    if (!isAdmin) {
      const handleSignOut = async () => {
        try {
          await authService.logout();
          router.push("/signin");
        } catch (error) {
          console.error("Error signing out:", error);
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted/20 to-background">
          <Card className="max-w-lg w-full border-2 shadow-2xl relative overflow-hidden border-red-500/30 dark:border-red-500/50 rounded-[24px]">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
            
            <CardHeader className="relative text-center pb-4">
              <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border-2 border-red-500/30 dark:border-red-500/50 w-20 h-20 flex items-center justify-center">
                <Shield className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                Access Denied
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Insufficient permissions to access this page
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 border border-red-500/20 dark:border-red-500/30">
                <p className="text-sm text-foreground leading-relaxed">
                  You do not have the required administrator privileges to access this page. 
                  Please contact your system administrator if you believe you should have access.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Required Access Level</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This page requires administrator role. Your current role: <span className="font-semibold">{userData.role || "employee"}</span>
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <Button
                  onClick={() => router.push("/")}
                  variant="outline"
                  className="flex-1"
                >
                  Go to Dashboard
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="flex-1 group hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}

