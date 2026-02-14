/**
 * LCAP 请求封装
 *
 * 对应 dev-platform: src/framework/request/node/index.ts
 *
 * Cookie 由 Vite 代理注入，前端只带自定义 Header
 */
import { randomUUID } from '../utils/uuid';
import { generateAntiCsrfCode } from '../utils/csrf';

export type IMethod = 'get' | 'post' | 'put' | 'delete';

export interface ILcapRequestOpts {
  tipErr?: boolean;
}

/**
 * LCAP 请求
 *
 * @example
 * ```ts
 * const data = await lcapRequest('/api/v1/envs', 'get', { limit: 10 });
 * ```
 */
export async function lcapRequest<T = any>(
  path: string,
  method: IMethod,
  param?: any,
  _opts?: ILcapRequestOpts,
): Promise<T> {
  let requestUrl = `/lcap-api${path}`;

  if (method === 'get' && param) {
    const searchParams = new URLSearchParams();
    Object.keys(param).forEach((key) => {
      if (param[key] !== undefined && param[key] !== null) {
        searchParams.append(key, String(param[key]));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      requestUrl += (path.includes('?') ? '&' : '?') + queryString;
    }
  }

  const response = await fetch(requestUrl, {
    method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept-Language': 'zh-CN',
      'X-SeqId': randomUUID(),
      'X-Tcb-Source': 'naturalLanguageDb/dev',
      'X-Referer': location.href,
      'X-CsrfCode': generateAntiCsrfCode(),
    },
    body: method === 'get' ? undefined : JSON.stringify(param),
  });

  if (!response.ok) {
    throw new Error('内部服务错误，请稍后重试。');
  }

  const { errcode, msg, errmsg, data } = await response.json();

  if (errcode === 0 || errcode === '0') {
    return data as T;
  }

  const isLoginFailed = [1003, 'VERIFY_LOGIN_FAILED', 'VERIFY_USER_FAILED'].includes(errcode);
  if (isLoginFailed) {
    console.error('[LCAP] 登录态失效，请更新 .env.local 中的 Cookie');
  }

  throw {
    code: errcode,
    message: (errmsg || msg) ?? '错误：未知',
  };
}
