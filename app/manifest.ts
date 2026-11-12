import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HOLD!",
    short_name: "HOLD!",
    description:
      "A bouldering log that records every attempt, shows what holds you back, and lets you climb with your buddies.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EEF2FB",
    theme_color: "#EEF2FB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
