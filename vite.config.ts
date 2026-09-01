import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-radix": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tooltip", "@radix-ui/react-slot", "@radix-ui/react-separator", "@radix-ui/react-scroll-area", "@radix-ui/react-avatar", "@radix-ui/react-switch", "@radix-ui/react-tabs"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-tailwind": ["tailwindcss"],
        },
      },
    },
  },
  server: {
    host: process.env.HOST ?? "0.0.0.0",
    port: Number(process.env.PORT ?? 5173),
    strictPort: false,
  },
});
