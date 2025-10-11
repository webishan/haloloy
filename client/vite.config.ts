import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  server: {
    port: 5173,
    host: true,
    https: true, // Enable HTTPS for camera access
    proxy: {
      '/api': {
        target: 'http://localhost:5006',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:5006',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
});
