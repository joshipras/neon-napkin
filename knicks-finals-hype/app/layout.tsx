import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "NYK After Dark | Finals Hype & Vibe Game",
  description:
    "A live Knicks scoreboard and interactive game-night companion.",
  applicationName: "NYK After Dark",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NYK After Dark",
  },
  icons: {
    icon: [
      { url: "./icon.svg", type: "image/svg+xml" },
      { url: "./icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "./apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#071B33",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
