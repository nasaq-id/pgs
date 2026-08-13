import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Relokasi output dev/build ke disk cepat: NEXT_DIST_DIR=/path/to/.next bun run dev
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["possession-vacation-introduced-new.trycloudflare.com"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
