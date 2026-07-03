"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/authService";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type TopHeaderProps = {
  leading?: React.ReactNode;
};

export const TopHeader = ({ leading }: TopHeaderProps) => {
  const { theme, setTheme } = useTheme();
  const { user, userData } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark =
    mounted &&
    (theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));

  const handleLogout = async () => {
    try {
      await authService.logout();
      toast.success("Logged out successfully");
      router.push("/signin");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  const getUserInitials = () => {
    if (userData?.name) {
      return userData.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-muted/30 px-5 py-3.5 text-foreground dark:border-white/10 dark:bg-black dark:text-white md:px-8 md:py-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {leading}
        <h1 className="truncate text-sm font-semibold sm:text-base md:hidden">Skill City</h1>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-base hover:bg-muted dark:border-transparent dark:bg-[#1a1a1a] dark:text-white dark:shadow-none dark:hover:bg-[#252525]"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? (
            <Moon className="h-[18px] w-[18px]" strokeWidth={1.5} />
          ) : (
            <Sun className="h-[18px] w-[18px]" strokeWidth={1.5} />
          )}
        </button>
        <button
          type="button"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition-base hover:bg-muted dark:border-transparent dark:bg-[#1a1a1a] dark:text-white dark:shadow-none dark:hover:bg-[#252525]"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ff2a2a] ring-2 ring-background dark:ring-[#1a1a1a]" />
        </button>

        <div className="mx-0.5 h-8 w-px shrink-0 bg-border dark:bg-white/20" aria-hidden />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-bold leading-tight text-foreground dark:text-white">
                    {userData?.name || "User"}
                  </div>
                  <div className="text-xs font-normal leading-tight text-muted-foreground dark:text-white/55">
                    {user.email}
                  </div>
                </div>
                <Avatar className="h-10 w-10 shrink-0 ring-2 ring-[#007300]/70 ring-offset-2 ring-offset-background dark:ring-[#007300]/50 dark:ring-offset-black">
                  <AvatarFallback className="bg-[#007300] text-white text-sm font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userData?.name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
