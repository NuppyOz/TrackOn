import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const apiProxyTarget = process.env.TRACKON_API_PROXY_TARGET ?? "http://127.0.0.1:3000";

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/api": {
                target: apiProxyTarget,
                configure(proxy) {
                    proxy.on("error", (error) => {
                        console.error(`[Vite proxy] No se pudo conectar con la API (${apiProxyTarget}): ${error.message}`);
                    });
                },
            },
        },
    },
    test: {
        environment: "jsdom",
        include: ["test/**/*.{test,spec}.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts"],
            thresholds: {
                lines: 80,
                statements: 70,
                functions: 65,
                branches: 65,
            },
        },
    },
});
