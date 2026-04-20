import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import wasm from "vite-plugin-wasm"
import topLevelAwait from "vite-plugin-top-level-await"

export default defineConfig({
    plugins: [react(), tailwindcss(), wasm(), topLevelAwait()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        target: "esnext",
    },
    server: {
        port: 3000,
        strictPort: true,
    },
    preview: {
        port: 3000,
        strictPort: true,
    },
})
