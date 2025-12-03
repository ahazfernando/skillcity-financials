"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { authService } from "@/lib/authService";
import { useAuth } from "@/contexts/AuthContext";

const carouselImages = [
  {
    src: "/signin/signin.png",
    alt: "Skill City Services",
    title: "Professional Services",
    description: "Expert maintenance for your business needs",
  },
  {
    src: "/signin/signin.png",
    alt: "Skill City Sign",
    title: "Quality Craftsmanship",
    description: "Delivering excellence in every project we undertake",
  },
];

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  async function handleSignUp() {
    try {
      setError(null);
      setIsLoading(true);

      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError("Please fill in all fields");
        setIsLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        setIsLoading(false);
        return;
      }

      await authService.register(formData.email, formData.password);

      toast.success("Account created successfully!");
      router.push("/");
    } catch (e) {
      console.error("Sign up error:", e);
      let errorMessage = "Sign up failed. Please try again.";

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
    <div className="min-h-screen bg-gray-50">
      <main className="container flex items-center justify-center min-h-screen py-8 px-4">
        <div className="flex flex-col lg:flex-row w-full max-w-[980px] bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Left Side - Image Carousel */}
          <div className="lg:w-[486px] p-6 lg:p-0 lg:pl-6 lg:py-6">
            <div className="w-full h-full rounded-3xl overflow-hidden relative min-h-[400px] lg:min-h-[500px] group">
              {/* Image Container */}
              <div className="relative w-full h-full">
                {carouselImages.map((image, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      index === currentSlide ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentSlide ? "bg-white w-6" : "bg-white/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Sign Up Form */}
          <div className="flex-1 p-6 lg:p-8 flex items-center justify-center">
            <Card className="w-full max-w-md border-0 shadow-none bg-transparent">
              <CardHeader className="text-center space-y-4">
                <div className="flex items-center justify-start mb-2">
                  <Image
                    src="/logo/SkillCityQ 1.png"
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
                  Create Account
                </CardTitle>
                <CardDescription className="text-[#1E130B] text-start">
                  Sign up to start managing your finances with ease
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 lg:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-[#1E130B]">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Input your full name"
                    className="px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-[#1E130B]">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Input your email"
                    className="px-4 py-3 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      className="px-4 py-3 pr-12 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-[#1E130B]">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className="px-4 py-3 pr-12 bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4">
                {error ? <p className="text-sm text-red-600 w-full">{error}</p> : null}
                <Button
                  onClick={handleSignUp}
                  disabled={isLoading}
                  className="w-full py-3 bg-[#4A9D5E] text-white font-medium rounded-xl hover:bg-green-600 focus:ring-1 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  {isLoading ? "Creating Account..." : "Sign Up"}
                </Button>
                <Separator className="bg-gray-300/50" />
                <p className="text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link href="/signin" className="text-[#4A9D5E] hover:text-green-700 font-medium">
                    Sign in here
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
