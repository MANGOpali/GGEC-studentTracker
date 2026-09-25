import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Providers from "./providers";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Global Gate LeadFlow",
  description: "Lead Management System — Global Gate Education Consultancy",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "GG LeadFlow" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e40af",
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
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
          }
        `}</Script>
      </body>
    </html>
  );
}
