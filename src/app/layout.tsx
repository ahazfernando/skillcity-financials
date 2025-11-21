import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "finflow-central-44",
  description: "Financial Management System",
  openGraph: {
    images: ["/logo/SkillCityQ 1.png"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/logo/SkillCityQ 1.png"],
  },
  icons: {
    icon: {
      url: "/logo/SkillCityQ 1.png",
      type: "image/png",
    },
    apple: {
      url: "/logo/SkillCityQ 1.png",
      type: "image/png",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}

