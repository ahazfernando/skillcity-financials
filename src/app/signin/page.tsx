"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { authService } from "@/lib/authService";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  async function handleSignIn() {
    try {
      setError(null);
      setIsLoading(true);

      if (!formData.email || !formData.password) {
        setError("Please fill in all fields");
        setIsLoading(false);
        return;
      }

      await authService.login(formData.email, formData.password);

      toast.success("Signed in successfully!");
      router.push("/");
    } catch (e) {
      console.error("Sign in error:", e);
      let errorMessage = "Sign in failed. Please try again.";

      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === "object" && e !== null && "message" in e) {
        errorMessage = (e as { message: string }).message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

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

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/signin/signin.png"
          alt="Background"
          fill
          className="object-cover"
          priority
          quality={90}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "/placeholder.svg";
          }}
        />
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen py-8 px-4">
        <div className="w-full max-w-md">
          <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-3xl">
            <CardHeader className="text-center space-y-4">
              <div className="flex items-center justify-start mb-2">
                <Image
                  src="/logo/skillcityyy.png"
                  alt="Skill City Logo"
                  width={120}
                  height={120}
                  className="h-20 w-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
              <CardTitle className="text-3xl lg:text-4xl font-bold text-[#1E130B] text-start">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-[#1E130B] text-start">
                Sign in to access your financial management system
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 lg:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[#1E130B]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Input your email"
                  className="px-4 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-[#1E130B] placeholder:text-gray-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSignIn();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[#1E130B]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Input your password"
                    className="px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-[#1E130B] placeholder:text-gray-500"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSignIn();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              {error ? <p className="text-sm text-red-600 w-full">{error}</p> : null}
              <Button
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full py-3 bg-[#4A9D5E] text-white font-medium rounded-xl hover:bg-green-600 focus:ring-1 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
              <Separator className="bg-gray-300/50" />
              <p className="text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/signup" className="text-[#4A9D5E] hover:text-green-700 font-medium">
                  Sign up here
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

