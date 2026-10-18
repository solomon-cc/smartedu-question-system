import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const company = mode === 'company';
  return {
    plugins: [
      vue(),
      ...(company
        ? [
            {
              name: 'company-entry',
              transformIndexHtml: {
                order: 'pre' as const,
                handler: (html: string) =>
                  html
                    .replace('/src/main.ts', '/src/company.ts')
                    .replace(/<title>.*?<\/title>/, '<title>一粒麦子 · 儿童发展与融合支持</title>')
                    .replace(
                      /<meta name="description" content="[^"]*" \/>/,
                      '<meta name="description" content="一粒麦子，专注儿童发展、早期干预、家庭指导与融合教育支持。了解我们的服务与师资团队。" /><link rel="canonical" href="https://www.ylmz.com.cn/" />',
                    ),
              },
            },
          ]
        : []),
    ],
    publicDir: company && command === 'build' ? false : 'public',
    // Prebundle lazy-route components up front to avoid a full reload on first navigation.
    optimizeDeps: { include: ['@arco-design/web-vue'] },
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '127.0.0.1',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
      },
    },
    build: {
      outDir: company ? 'dist-company' : 'dist',
      rollupOptions: {
        output: { manualChunks: { framework: company ? ['vue'] : ['vue', 'vue-router'] } },
      },
    },
  };
});
