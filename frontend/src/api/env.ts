/**
 * 环境相关 API
 */
import type { DescribeEnvsResult } from '../types/env';

/**
 * 获取环境列表（通过后端接口）
 */
export async function fetchEnvList(): Promise<DescribeEnvsResult> {
  const response = await fetch('http://localhost:3001/api/user/env-list', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('获取环境列表失败');
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || '获取环境列表失败');
  }

  return result.data;
}

/**
 * 保存用户选择的环境到后端
 */
export async function saveUserEnv(envId: string): Promise<void> {
  const response = await fetch('http://localhost:3001/api/user/env', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ envId }),
  });

  if (!response.ok) {
    throw new Error('保存环境失败');
  }
}

/**
 * 从后端获取用户当前选择的环境
 */
export async function getUserEnv(): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:3001/api/user/env', {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.envId || null;
  } catch (error) {
    console.error('[getUserEnv] 获取用户环境失败:', error);
    return null;
  }
}
