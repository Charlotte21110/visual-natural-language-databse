/**
 * CSRF 相关工具函数
 * 根据 skey 生成 CSRF code（腾讯 g_tk 算法）
 */

/**
 * 从 Cookie 字符串中提取 skey
 */
export function extractSkeyFromCookie(cookieStr: string): string {
  if (!cookieStr) return '';
  
  // 尝试匹配 skey 或 p_skey
  const skeyMatch = cookieStr.match(/(?:^|;\s*)(?:p_)?skey=([^;]+)/);
  return skeyMatch?.[1] || '';
}

/**
 * 根据 session key 生成 CSRF code（腾讯 g_tk 算法）
 */
export function generateAntiCsrfCode(sessionKey: string): string {
  if (!sessionKey) {
    return '';
  }

  let hash = 5381;

  for (let i = 0; i < sessionKey.length; i += 1) {
    hash += (hash << 5) + sessionKey.charCodeAt(i);
  }

  return String(hash & 0x7fffffff);
}

/**
 * 从 Cookie 计算 ACSRF Token（lcap 请求用的另一种算法）
 */
export function getACSRFToken(str: string): number {
  let hash = 5381;
  const len = str.length;
  for (let i = 0; i < len; ++i) {
    hash += (hash << 5) + str.charAt(i).charCodeAt(i);
  }
  return hash & 0x7fffffff;
}
