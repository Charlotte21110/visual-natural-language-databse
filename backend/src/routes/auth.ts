/**
 * Auth Router
 * 处理认证相关的接口（Cookie、Token 管理）
 */
import { Router } from 'express';
import { getCapiClient } from '../clients/capi-client.js';

export const authRouter = Router();

/**
 * POST /api/auth/login
 * 
 * 前端登录后，将 Cookie 传递给后端保存
 * 
 * 请求体:
 * {
 *   "cookie": "uin=xxx; skey=xxx; ...",
 *   "envId": "xxx"
 * }
 */
authRouter.post('/login', (req, res) => {
  try {
    const { cookie, envId } = req.body;

    if (!cookie) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'cookie is required',
      });
    }

    // 保存 Cookie 到 CAPI Client（单例）
    const capiClient = getCapiClient();
    capiClient.setCookie(cookie);

    console.log('[Auth] Cookie saved successfully');

    res.json({
      success: true,
      message: '登录态已保存',
      envId: envId || process.env.TCB_ENV_ID,
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/logout
 * 清除 Cookie
 */
authRouter.post('/logout', (_req, res) => {
  try {
    const capiClient = getCapiClient();
    capiClient.setCookie('');
    capiClient.setToken('');

    res.json({
      success: true,
      message: '已退出登录',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/status
 * 检查登录状态
 */
authRouter.get('/status', (_req, res) => {
  // TODO: 检查 Cookie 是否有效
  res.json({
    loggedIn: true, // 简化版，实际应该验证 Cookie
    envId: process.env.TCB_ENV_ID,
  });
});
