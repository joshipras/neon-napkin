import type { Metadata, Viewport } from "next";
import { getSiteUrl, siteDescription, siteTitle } from "@/lib/siteUrl";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Visualize.fm"
  },
  description: siteDescription,
  applicationName: "Visualize.fm",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: "/",
    siteName: "Visualize.fm",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Visualize.fm retro music visualizer"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/opengraph-image"]
  },
  icons: {
    icon: "/favicon.svg"
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#030406",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
