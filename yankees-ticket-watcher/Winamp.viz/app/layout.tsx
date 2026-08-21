import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://visualize.fm";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Visualize.fm - Turn Any Room Into 1999",
    template: "%s | Visualize.fm"
  },
  description:
    "Free retro music visualizer for karaoke, parties and living rooms. Turn on your microphone, go fullscreen and watch your music come alive.",
  applicationName: "Visualize.fm",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Visualize.fm - Turn Any Room Into 1999",
    description:
      "Free retro music visualizer for karaoke, parties and living rooms. Turn on your microphone, go fullscreen and watch your music come alive.",
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
    title: "Visualize.fm - Turn Any Room Into 1999",
    description:
      "Free retro music visualizer for karaoke, parties and living rooms. Turn on your microphone, go fullscreen and watch your music come alive.",
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
