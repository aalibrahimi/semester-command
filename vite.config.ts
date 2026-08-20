import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri injects TAURI_ENV_* into the dev-server process. We key the mobile/debug
// tweaks off them so `vite dev` standalone (browser-only UI work) still behaves.
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Kept in lockstep with tsconfig.json / tsconfig.app.json `paths`.
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Tauri expects a fixed port and fails rather than silently picking another,
  // because the Rust side hardcodes devUrl in tauri.conf.json.
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      // src-tauri churns constantly during `cargo build`; watching it triggers
      // pointless full reloads of the webview.
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    // Tauri v2 ships a modern webview on every target we support, so we can emit
    // modern output and skip the legacy transform cost.
    target: "es2022",
    // NOTE: `true`, not `"esbuild"`. Vite 8 bundles with rolldown and ships oxc
    // as the minifier; naming esbuild explicitly makes it try to import a
    // package that is not installed, and the build dies in renderChunk.
    minify: !process.env.TAURI_ENV_DEBUG,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
