import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tickmark",
    short_name: "Tickmark",
    description:
      "A bouldering log that records every attempt and shows what to work on.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#1a2230",
    theme_color: "#1a2230",
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
