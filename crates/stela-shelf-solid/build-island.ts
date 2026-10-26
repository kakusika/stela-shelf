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
  build: {
    outDir: resolve(__dirname, "assets"),
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "ui/main.tsx"),
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

console.log("Done! Output generated at crates/stela-shelf-solid/assets/island.js");
