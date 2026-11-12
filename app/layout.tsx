import type { Metadata, Viewport } from "next";
import "@fontsource-variable/big-shoulders";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "Tickmark",
  description:
    "A bouldering log that records every attempt and shows what to work on.",
  applicationName: "Tickmark",
  appleWebApp: {
    capable: true,
    title: "Tickmark",
    statusBarStyle: "black-translucent",
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
  themeColor: "#1a2230",
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
      <body className="min-h-full">
        <div className="mx-auto w-full max-w-md px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
          {children}
        </div>
        <Nav />
        <ServiceWorker />
      </body>
    </html>
  );
}
