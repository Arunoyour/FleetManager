import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fleet Manager",
    short_name: "Fleet",
    description: "Trips, expenses, credit and balances for your lorry fleet.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f2",
    theme_color: "#17201c",
    orientation: "portrait",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
