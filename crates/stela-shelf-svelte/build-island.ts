import { build } from "npm:vite@6";
import { svelte } from "npm:@sveltejs/vite-plugin-svelte@5";
import "npm:svelte@5";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Compiling Svelte Search Island...");

await build({
  root: __dirname,
  plugins: [svelte()],
  resolve: {
    conditions: ["browser", "production"],
  },
  build: {
    outDir: resolve(__dirname, "assets"),
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      input: resolve(__dirname, "ui/main.ts"),
      output: {
        format: "es",
        entryFileNames: "island.js",
        assetFileNames: "island[extname]",
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("Done! Output generated at crates/stela-shelf-svelte/assets/island.js");
