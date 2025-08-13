// vite.config.ts
import { defineConfig } from "vite";
import reactPlugin from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    reactPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "BARN Labs",
        short_name: "BARN",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\.(?:glb|gltf)$/,
            handler: "CacheFirst",
            options: { cacheName: "models-cache" },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: "CacheFirst",
            options: { cacheName: "images-cache" },
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          dropzone: ["react-dropzone"],
          table: ["@tanstack/react-table"],
        },
      },
    },
  },
  // FIX: Add this server proxy configuration to connect frontend to backend
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787", // Default wrangler dev port
        changeOrigin: true,
      },
    },
  },
});
