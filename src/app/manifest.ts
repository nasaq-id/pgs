import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistem Manajemen Lembaga - PGS",
    short_name: "SML",
    description: "Sistem Informasi Manajemen Sekolah",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3f8",
    theme_color: "#f5f3f8",
    orientation: "portrait-primary",
    categories: ["education", "productivity"],
    lang: "id",
    prefer_related_applications: false,
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
        purpose: "maskable",
      },
    ],
  }
}
