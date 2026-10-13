import { readFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { renderAnalyticsTag, resolveDeployment, type Deployment } from "./src/config/deployment";

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

/**
 * Builds /sw.js from src/sw/service-worker.js with this build's shell files
 * (the page, the entry chunk and its stylesheet, the manifest and icons) and
 * the list of every hashed asset, so the worker can precache the shell and
 * prune files a build no longer ships.
 */
const serviceWorkerPlugin = (): Plugin => ({
  name: "lok-service-worker",
  apply: "build",
  generateBundle(_options, bundle) {
    const outputs = Object.values(bundle);
    const assets = outputs.map((output) => `/${output.fileName}`).filter((name) => name.startsWith("/assets/"));
    const shell = new Set([
      "/",
      "/site.webmanifest",
      "/favicon-96x96.png",
      "/apple-touch-icon.png",
      "/web-app-manifest-192x192.png",
      "/web-app-manifest-512x512.png",
    ]);
    for (const output of outputs) {
      if (output.type !== "chunk" || !output.isEntry) continue;
      shell.add(`/${output.fileName}`);
      for (const css of output.viteMetadata?.importedCss ?? []) shell.add(`/${css}`);
    }
    const template = readFileSync(new URL("./src/sw/service-worker.js", import.meta.url), "utf8");
    this.emitFile({
      type: "asset",
      fileName: "sw.js",
      source: template
        .replace("__VERSION__", systemVersion)
        .replace("__PRECACHE__", JSON.stringify([...shell]))
        .replace("__ASSETS__", JSON.stringify(assets)),
    });
  },
});

/**
 * Fills index.html from the deployment settings (src/config/deployment.ts):
 * %SITE_URL% in canonical and social-card URLs, %ANALYTICS_TAG% with the
 * Umami tag or nothing. Runs before Vite's own %ENV% substitution.
 */
const deploymentHtmlPlugin = (deployment: Deployment): Plugin => ({
  name: "lok-deployment-html",
  transformIndexHtml: {
    order: "pre",
    handler: (html) => html
      .replaceAll("%SITE_URL%", deployment.VITE_SITE_URL)
      .replace("%ANALYTICS_TAG%", renderAnalyticsTag(deployment)),
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // VITE_* from .env files and the build environment, with lok.computer's defaults.
  const deployment = resolveDeployment(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    server: {
      host: "::",
      port: 8080,
      // The API Worker owns upstream credentials. Proxy API calls during local
      // development so browser requests use the same authenticated service as
      // the deployed site instead of falling through to Vite's SPA fallback.
      // LOK_API_ORIGIN points the proxy at a local Worker (e.g. `wrangler dev`).
      proxy: {
        "/api": {
          target: process.env.LOK_API_ORIGIN || deployment.VITE_SITE_URL,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    plugins: [
      react(),
      systemVersionPlugin(),
      deploymentHtmlPlugin(deployment),
      serviceWorkerPlugin(),
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
  };
});
