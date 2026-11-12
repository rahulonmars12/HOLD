import type { Metadata, Viewport } from "next";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { SyncAgent } from "@/components/SyncAgent";

export const metadata: Metadata = {
  title: "HOLD!",
  description: "A bouldering log that records every attempt, shows what holds you back, and lets you climb with your buddies.",
  applicationName: "HOLD!",
  appleWebApp: {
    capable: true,
    title: "HOLD!",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#EEF2FB",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full overflow-x-clip">
        <div className="relative mx-auto w-full max-w-md px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
          {children}
        </div>
        <Nav />
        <ServiceWorker />
        <SyncAgent />
      </body>
    </html>
  );
}
