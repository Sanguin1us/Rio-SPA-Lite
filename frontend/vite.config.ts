import { fileURLToPath, URL } from "node:url"; // <-- MODIFIED LINE
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/app/",
  resolve: {
    alias: {
      // Use fileURLToPath to ensure the path is correct on all OSes
      "@": fileURLToPath(new URL("./src", import.meta.url)), // <-- MODIFIED LINE
    },
  },
  server: {
    proxy: {
      // Proxy API requests to the backend server
      "/api": {
        target: "http://127.0.0.1:8000", // Default backend address
        changeOrigin: true,
      },
    },
  },
});