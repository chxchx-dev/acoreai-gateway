import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gatewayMode = String(env.VITE_AI_GATEWAY_MODE || "local").toLowerCase();
  const usePublicGateway = ["public", "publico", "production", "produccion"].includes(gatewayMode);
  const gatewayUrl =
    (usePublicGateway
      ? env.VITE_AI_GATEWAY_PUBLIC_URL
      : env.VITE_AI_GATEWAY_LOCAL_URL) ||
    env.VITE_GATEWAY_LOCAL_URL ||
    env.VITE_AI_GATEWAY_URL ||
    "http://localhost:4005";
  const gatewayKey =
    (usePublicGateway
      ? env.VITE_AI_GATEWAY_PUBLIC_KEY
      : env.VITE_AI_GATEWAY_LOCAL_KEY) ||
    env.VITE_GATEWAY_LOCAL_KEY ||
    env.AI_GATEWAY_KEY ||
    "";

  return {
    plugins: [react()],
    server: {
      port: 5175,
      proxy: {
        "/ai": {
          target: gatewayUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (gatewayKey) {
                proxyReq.setHeader("x-ai-gateway-key", gatewayKey);
              }
            });
          },
        },
      },
    },
  };
});
