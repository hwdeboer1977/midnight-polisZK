import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";

// The Compact runtime ships sourcemaps that reference source files it does not
// publish, so Vite warns once per module on every start. The warnings say
// nothing actionable — filter just those and leave every other warning intact.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logger = createLogger();
const isSourcemapNoise = (message: string) =>
  message.includes("points to missing source files");

const { warn, warnOnce } = logger;
logger.warn = (message, options) => {
  if (!isSourcemapNoise(message)) warn(message, options);
};
// Vite logs this particular message through warnOnce, not warn.
logger.warnOnce = (message, options) => {
  if (!isSourcemapNoise(message)) warnOnce(message, options);
};

export default defineConfig({
  customLogger: logger,
  // The Compact runtime ships wasm-bindgen's bundler target, which imports the
  // .wasm module directly and initialises it with top-level await. Modern
  // browsers support that natively, so targeting esnext avoids needing a
  // transform plugin — reasonable here, since the app requires a wallet
  // extension anyway. esbuild's dep pre-bundling cannot handle the wasm
  // import, hence the exclusions.
  plugins: [react(), wasm()],
  resolve: {
    alias: {
      // Both are packages written for Node that the indexer provider pulls in.
      // See the shim files for what each one gets wrong in a browser build.
      "isomorphic-ws": path.resolve(__dirname, "src/shims/isomorphic-ws.ts"),
      assert: path.resolve(__dirname, "src/shims/assert.ts"),
    },
  },
  build: { target: "esnext" },
  esbuild: { target: "esnext" },
  optimizeDeps: {
    exclude: [
      "@midnight-ntwrk/compact-runtime",
      "@midnight-ntwrk/onchain-runtime-v3",
    ],
    // Excluding a package also skips its dependencies, and compact-runtime
    // depends on object-inspect, which is CommonJS with no exports map. Served
    // raw it has no default export, so importing it dies with
    // "does not provide an export named 'default'". Pre-bundling just that one
    // gives it the interop shim it needs.
    include: ["object-inspect"],
    esbuildOptions: { target: "esnext" },
  },
  server: {
    port: 5173,
    // Vite binds to 127.0.0.1 by default, which inside WSL2 is the Linux VM's
    // own loopback — a browser running on the Windows host cannot reach it.
    // Binding all interfaces publishes it on the WSL IP so the host connects.
    host: true,
    // The demo onboarding service runs separately and holds the platform key.
    // Proxying it keeps the browser on one origin, so no CORS setup is needed.
    proxy: { "/api": "http://127.0.0.1:8787" },
  },
});
