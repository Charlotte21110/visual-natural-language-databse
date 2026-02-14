import { defineConfig, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

interface CookieData {
  cookieStr: string;
  skey: string;
}

/**
 * 读取腾讯云 Cookie
 * 支持两种格式：
 * 1. cookie.json: JSON 数组格式 [{"name":"key","value":"val"}, ...]
 * 2. cookie.txt: 字符串格式 key=value; key=value
 */
function loadTcloudCookie(): CookieData {
  const projectRoot = process.cwd();

  // 优先读取 cookie.json（JSON 数组格式）
  const jsonPath = path.join(projectRoot, 'cookie.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const cookieArray = JSON.parse(raw) as Array<{ name: string; value: string }>;
      const cookieStr = cookieArray
        .map((c) => `${c.name}=${c.value}`)
        .join('; ');
      const skeyItem = cookieArray.find((c) => c.name === 'skey') ||
                       cookieArray.find((c) => c.name === 'p_skey');
      console.log(`[Proxy] 从 cookie.json 加载了 ${cookieArray.length} 个 Cookie`);
      return { cookieStr, skey: skeyItem?.value || '' };
    } catch (e) {
      console.error('[Proxy] cookie.json 解析失败:', e);
    }
  }

  // 其次读取 cookie.txt（字符串格式）
  const txtPath = path.join(projectRoot, 'cookie.txt');
  if (fs.existsSync(txtPath)) {
    const cookieStr = fs.readFileSync(txtPath, 'utf-8').trim();
    // 从字符串中提取 skey
    const skeyMatch = cookieStr.match(/(?:^|;\s*)(?:p_)?skey=([^;]+)/);
    console.log('[Proxy] 从 cookie.txt 加载 Cookie');
    return { cookieStr, skey: skeyMatch?.[1] || '' };
  }

  console.warn('[Proxy] 未找到 cookie.json 或 cookie.txt，请先配置 Cookie！');
  return { cookieStr: '', skey: '' };
}

/**
 * 保存 Cookie 到文件
 */
function saveCookieToFile(cookieJson: string): { success: boolean; message: string } {
  const projectRoot = process.cwd();
  const jsonPath = path.join(projectRoot, 'cookie.json');

  try {
    // 验证 JSON 格式
    const cookieArray = JSON.parse(cookieJson);
    if (!Array.isArray(cookieArray)) {
      return { success: false, message: '请输入 JSON 数组格式' };
    }

    // 写入文件
    fs.writeFileSync(jsonPath, cookieJson, 'utf-8');
    console.log(`[Proxy] 已保存 ${cookieArray.length} 个 Cookie 到 cookie.json`);

    return { success: true, message: '保存成功，请刷新页面' };
  } catch (e: any) {
    return { success: false, message: e.message || '保存失败' };
  }
}

/**
 * 自定义 Vite 插件：提供保存 Cookie 的 API
 */
function saveCookiePlugin() {
  return {
    name: 'save-cookie-plugin',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/save-cookie', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const { cookieJson } = JSON.parse(body);
              const result = saveCookieToFile(cookieJson);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(result));
            } catch (e: any) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => {
  const { cookieStr: tcloudCookie, skey } = loadTcloudCookie();

  return {
    plugins: [react(), saveCookiePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // 把 skey 注入为前端可用的环境变量，用于 CSRF 计算
    define: {
      __TCLOUD_SKEY__: JSON.stringify(skey),
    },
    server: {
      port: 3000,
      proxy: {
        /**
         * CAPI 代理
         */
        '/weda-capi': {
          target: 'https://weda-api.cloud.tencent.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/weda-capi/, ''),
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (tcloudCookie) {
                proxyReq.setHeader('Cookie', tcloudCookie);
              }
            });
            proxy.on('proxyRes', (proxyRes) => {
              proxyRes.headers['access-control-expose-headers'] =
                'X-Qcloud-Token, x-qcloud-token';
            });
          },
        },

        /**
         * LCAP 代理
         */
        '/lcap-api': {
          target: 'https://lcap.cloud.tencent.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/lcap-api/, ''),
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (tcloudCookie) {
                proxyReq.setHeader('Cookie', tcloudCookie);
              }
            });
          },
        },

        /**
         * TCB API 代理
         */
        '/tcb-api': {
          target: 'https://tcb-api.cloud.tencent.com',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/tcb-api/, ''),
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (tcloudCookie) {
                proxyReq.setHeader('Cookie', tcloudCookie);
              }
            });
          },
        },
      },
    },
  };
});
