declare const __TCLOUD_SKEY__: string;

/**
 * 获取 skey
 * 通过 vite.config.ts 的 define 注入，从 cookie.json 中解析
 */
function getSessionKey(): string {
  try {
    return __TCLOUD_SKEY__ || '';
  } catch {
    return '';
  }
}

/**
 * 根据 session key 生成 CSRF code
 *
 * 腾讯 g_tk 加密算法
 */
export function generateAntiCsrfCode(sessionKey?: string): string {
  const key = sessionKey ?? getSessionKey();
  if (!key) {
    return '';
  }

  let hash = 5381;

  for (let i = 0; i < key.length; i += 1) {
    hash += (hash << 5) + key.charCodeAt(i);
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
