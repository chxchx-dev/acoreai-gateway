import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gatewayUrl = env.VITE_GATEWAY_LOCAL_URL || 'http://localhost:4005';
  const gatewayKey = env.VITE_GATEWAY_LOCAL_KEY || '';

  return {
    plugins: [react()],
    server: {
      port: 5180,
      allowedHosts: true,
      proxy: {
        '/ai': {
          target: gatewayUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (gatewayKey) {
                proxyReq.setHeader('x-ai-gateway-key', gatewayKey);
              }
            });
          },
        },
      },
    },
  };
});
