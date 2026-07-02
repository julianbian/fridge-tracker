import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "冰箱台账",
        short_name: "冰箱台账",
        description: "记录食材，追踪新鲜度，避免浪费",
        theme_color: "#33473A",
        background_color: "#F3EEE2",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "zh-CN",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes("supabase.co"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});
