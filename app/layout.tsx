import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Providers from "./providers";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "Global Gate LeadFlow",
  description: "Lead Management System — Global Gate Education Consultancy",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextTopLoader color="#0E356B" height={3} showSpinner={false} />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
