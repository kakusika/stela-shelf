import { build } from "npm:vite@6";
import { svelte } from "npm:@sveltejs/vite-plugin-svelte@4";
import "npm:svelte@5";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Compiling Svelte Search Island...");

await build({
  root: __dirname,
  plugins: [svelte()],
  build: {
    outDir: resolve(__dirname, "assets"),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "ui/main.ts"),
      name: "Island",
      formats: ["es"],
      fileName: () => "island.js",
      cssFileName: "island",
    },
    minify: true,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("Done! Output generated at crates/stela-shelf-svelte/assets/island.js");
