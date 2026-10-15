import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baked into the build so open tabs can spot a newer deploy (src/components/shell/whats-new.tsx).
  env: { APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
