import type { MetadataRoute } from "next";
import { basePath } from "@/lib/paths";

export const dynamic = "force-static";

const home = `${basePath}/`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ExpnsTracker",
    short_name: "Expns",
    description: "Debiti, spese, salvadanai e idee di investimento. Tutto in euro, sul tuo iPhone.",
    id: home,
    start_url: home,
    scope: home,
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F3EF",
    theme_color: "#F4F3EF",
    lang: "it",
    icons: [
      {
        src: "icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
