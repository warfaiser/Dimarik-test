import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Позволяет проекту работать одновременно:
 * 1) через Vite (`npm run dev` / `npm run build`) из исходников `src/main.tsx`;
 * 2) напрямую с GitHub Pages из корня ветки `main` без предварительной сборки,
 *    подгружая предсобранный бандл `bundle/app.js` и `bundle/app.css`.
 */
function githubPagesRootFallback(): Plugin {
  return {
    name: "github-pages-root-fallback",
    enforce: "post",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html
          .replace(/<link[^>]*data-static-bundle[^>]*>\s*/g, "")
          .replace(
            /<script[^>]*data-static-bundle[^>]*><\/script>/,
            '<script type="module" src="./src/main.tsx"></script>'
          );
      },
    },
    generateBundle(_options, bundle) {
      const bundleDir = path.resolve(__dirname, "bundle");
      fs.mkdirSync(bundleDir, { recursive: true });
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk" && item.isEntry) {
          fs.writeFileSync(path.join(bundleDir, "app.js"), item.code, "utf-8");
        } else if (item.type === "asset" && item.fileName.endsWith(".css")) {
          const css = typeof item.source === "string" ? item.source : Buffer.from(item.source).toString("utf-8");
          fs.writeFileSync(path.join(bundleDir, "app.css"), css, "utf-8");
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
  plugins: [githubPagesRootFallback(), react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
