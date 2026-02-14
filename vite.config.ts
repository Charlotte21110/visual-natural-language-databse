import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      /**
       * CAPI 代理
       *
       * 本地请求: /weda-capi/qcloud-weida/v1/capi?i=tcb/RunSql
       * 转发到:   https://weda-api.cloud.tencent.com/qcloud-weida/v1/capi?i=tcb/RunSql
       *
       * 核心：通过代理绕过跨域限制，Cookie 由浏览器自动携带
       */
      '/weda-capi': {
        target: 'https://weda-api.cloud.tencent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/weda-capi/, ''),
        secure: true,
      },

      /**
       * LCAP 代理
       *
       * 本地请求: /lcap-api/api/v1/xxx
       * 转发到:   https://lcap.cloud.tencent.com/api/v1/xxx
       */
      '/lcap-api': {
        target: 'https://lcap.cloud.tencent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lcap-api/, ''),
        secure: true,
      },

      /**
       * TCB API 代理
       *
       * 本地请求: /tcb-api/xxx
       * 转发到:   https://tcb-api.cloud.tencent.com/xxx
       */
      '/tcb-api': {
        target: 'https://tcb-api.cloud.tencent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tcb-api/, ''),
        secure: true,
      },
    },
  },
});
