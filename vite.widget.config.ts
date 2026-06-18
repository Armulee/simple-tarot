import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"
import { resolve } from "node:path"

/**
 * Builds the MCP Apps card-picker widget into a single self-contained HTML file
 * (all JS/CSS inlined) — required because the host renders it in a sandboxed
 * iframe that blocks external scripts.
 *
 * Run via `npm run build:widget`, which then wraps the output into
 * lib/mcp/card-picker-html.ts for import by the MCP route.
 */
export default defineConfig({
    root: resolve(__dirname, "widget/card-picker"),
    plugins: [viteSingleFile()],
    // The widget CSS is plain CSS; bypass the project's Tailwind PostCSS config.
    css: { postcss: { plugins: [] } },
    build: {
        outDir: resolve(__dirname, "widget/dist"),
        emptyOutDir: true,
        cssCodeSplit: false,
        assetsInlineLimit: 100_000_000,
        rollupOptions: {
            input: resolve(__dirname, "widget/card-picker/index.html"),
        },
    },
})
