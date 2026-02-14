import { cookie } from './cookie';

/**
 * 根据 session key 生成 CSRF code
 *
 * 腾讯 g_tk 加密算法
 */
export function generateAntiCsrfCode(
  sessionKey: string | undefined = cookie.get('skey') || cookie.get('p_skey'),
): string {
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
 * 从 Cookie 计算 ACSRF Token
 */
export function getACSRFToken(str: string): number {
  let hash = 5381;
  const len = str.length;
  for (let i = 0; i < len; ++i) {
    hash += (hash << 5) + str.charAt(i).charCodeAt(i);
  }
  return hash & 0x7fffffff;
}
