import { build } from "npm:vite@6";
import solidPlugin from "npm:vite-plugin-solid";
import "npm:solid-js@1";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Compiling SolidJS Search Island...");

await build({
  root: __dirname,
  plugins: [solidPlugin()],
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
      input: resolve(__dirname, "ui/main.tsx"),
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

console.log("Done! Output generated at crates/stela-shelf-solid/assets/island.js");
