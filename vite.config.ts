import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const packageJsonUrl = new URL("./package.json", import.meta.url);
const readSystemVersion = () => (
  JSON.parse(readFileSync(packageJsonUrl, "utf8")) as { version: string }
).version;
const systemVersion = readSystemVersion();

const systemVersionPlugin = (): Plugin => ({
  name: "lok-system-version",
  transformIndexHtml(html) {
    return html.replaceAll("%SYSTEM_VERSION%", readSystemVersion());
  },
  configureServer(server) {
    server.middlewares.use("/system-version.json", (_request, response) => {
      response.setHeader("content-type", "application/json");
      response.setHeader("cache-control", "no-store, no-cache, must-revalidate");
      response.end(JSON.stringify({ version: readSystemVersion() }));
    });
  },
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "system-version.json",
      source: JSON.stringify({ version: systemVersion }),
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // The API Worker owns upstream credentials. Proxy API calls during local
    // development so browser requests use the same authenticated service as
    // the deployed site instead of falling through to Vite's SPA fallback.
    // LOK_API_ORIGIN points the proxy at a local Worker (e.g. `wrangler dev`).
    proxy: {
      "/api": {
        target: process.env.LOK_API_ORIGIN || "https://lok.computer",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [
    react(),
    systemVersionPlugin(),
  ],
  build: {
    // Raster images stay files: the boot screen warms them into the HTTP cache,
    // and they are reused across versions instead of being re-downloaded as
    // base64 inside every new entry chunk. Small SVGs (theme glyphs) inline.
    assetsInlineLimit: (filePath, content) => filePath.endsWith(".svg") && content.length < 4096,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
