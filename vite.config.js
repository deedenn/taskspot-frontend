import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { publicPagesPlugin } from "./scripts/public-pages/plugin.js";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), publicPagesPlugin()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          antd: ["antd", "@ant-design/icons"]
        }
      }
    }
  },
  test: {
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: "./src/test/setup.js"
  }
});
