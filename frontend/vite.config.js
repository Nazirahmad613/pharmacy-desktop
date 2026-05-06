import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // ✅ 🔥 این خط خیلی مهم برای build و Electron
  base: "./",

  server: {
    host: "localhost",
    port: 5174,
    strictPort: true,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
    historyApiFallback: true, // 🔹 برای SPA
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "app": path.resolve(__dirname, "src/app"),
    },
  },
});