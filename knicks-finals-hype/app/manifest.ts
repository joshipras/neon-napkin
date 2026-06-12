import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NYK After Dark: Finals Hype",
    short_name: "NYK Hype",
    description:
      "A simulated Knicks Finals scoreboard and interactive game-night companion.",
    start_url: "/",
    display: "standalone",
    background_color: "#071B33",
    theme_color: "#071B33",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
