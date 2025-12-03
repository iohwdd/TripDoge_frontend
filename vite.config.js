import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://110.40.207.231:7979',
        changeOrigin: true,
        // 有时候后端会校验 Referer/Origin，这里可以手动修正（虽然 changeOrigin 应该已经处理了 Host）
        // configure: (proxy, options) => {
        //   proxy.on('proxyReq', (proxyReq, req, res) => {
        //     proxyReq.setHeader('Origin', 'http://110.40.207.231:7979');
        //   });
        // }
      }
    }
  }
})
