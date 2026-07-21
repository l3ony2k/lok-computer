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
  },
  plugins: [
    react(),
    systemVersionPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
