/**
 * User Router
 * 处理用户偏好设置（环境、配置等）
 */
import { Router } from 'express';
import { UserPreferenceStore } from '../storage/user-preference-store.js';
import { getCapiClient } from '../clients/capi-client.js';

export const userRouter = Router();

const userPreferenceStore = new UserPreferenceStore();

/**
 * POST /api/user/env
 * 
 * 保存用户选择的环境
 * 
 * 请求体:
 * {
 *   "envId": "ai-database-3guv8gy3a04fb16f"
 * }
 */
userRouter.post('/env', (req, res) => {
  try {
    const { envId } = req.body;

    if (!envId || typeof envId !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'envId is required and must be a string',
      });
    }

    // TODO: 从请求中获取用户 ID（目前用固定值）
    const userId = 'default-user';

    // 保存环境偏好
    userPreferenceStore.setEnv(userId, envId);

    console.log(`[User] 用户 ${userId} 切换环境: ${envId}`);

    res.json({
      success: true,
      message: '环境已保存',
      envId,
    });
  } catch (error: any) {
    console.error('[User] Save env error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/user/env
 * 
 * 获取用户当前选择的环境
 */
userRouter.get('/env', (req, res) => {
  try {
    // TODO: 从请求中获取用户 ID（目前用固定值）
    const userId = 'default-user';

    // 获取环境偏好
    const envId = userPreferenceStore.getEnv(userId);

    if (!envId) {
      return res.status(404).json({
        error: 'Not Found',
        message: '未找到用户环境设置',
      });
    }

    res.json({
      success: true,
      envId,
    });
  } catch (error: any) {
    console.error('[User] Get env error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/user/env
 * 
 * 清除用户环境设置 应该不需要，可以删掉
 */
userRouter.delete('/env', (req, res) => {
  try {
    const userId = 'default-user';
    userPreferenceStore.clearEnv(userId);

    res.json({
      success: true,
      message: '环境设置已清除',
    });
  } catch (error: any) {
    console.error('[User] Clear env error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/user/env-list
 * 
 * 获取用户的环境列表（通过后端 CAPI 调用）
 */
userRouter.get('/env-list', async (req, res) => {
  try {
    const capiClient = getCapiClient();

    console.log('[User] 开始获取环境列表');

    // 调用腾讯云 API 获取环境列表
    const result = await capiClient.request({
      serviceType: 'tcb',
      action: 'DescribeEnvs',
      data: {
        EnvTypes: ['weda', 'baas'],
        IsVisible: false,
        Channels: ['dcloud', 'iotenable', 'tem', 'scene_module'],
      },
      region: 'ap-shanghai',
    });

    console.log('[User] 获取环境列表成功:', {
      total: result.EnvList?.length || 0,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[User] Get env list error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});
