import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Worm Ranch",
    short_name: "Worm Ranch",
    description: "Display-aware worm chasing with desktop and mobile rule sets.",
    start_url: "/",
    display: "standalone",
    background_color: "#07111b",
    theme_color: "#07111b",
    icons: [
      {
        src: "/worm-ranch-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}