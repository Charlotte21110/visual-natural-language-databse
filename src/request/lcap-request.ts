/**
 * LCAP 请求封装
 *
 * 对应 dev-platform: src/framework/request/node/index.ts
 *
 * 用于调用 lcap.cloud.tencent.com 的接口
 */
import { randomUUID } from '../utils/uuid';
import { cookie } from '../utils/cookie';
import { getACSRFToken } from '../utils/csrf';

export type IMethod = 'get' | 'post' | 'put' | 'delete';

export interface ILcapRequestOpts {
  /** 是否提示错误 */
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
  opts?: ILcapRequestOpts,
): Promise<T> {
  try {
    let requestUrl = `/lcap-api${path}`;

    // GET 参数拼接到 URL
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

    const skey = cookie.get('skey') || cookie.get('p_skey');

    const response = await fetch(requestUrl, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept-Language': 'zh-CN',
        'X-SeqId': randomUUID(),
        'X-Tcb-Source': 'naturalLanguageDb/dev',
        'X-Referer': location.href,
        'X-CsrfCode': `${getACSRFToken(skey)}`,
      },
      body: method === 'get' ? undefined : JSON.stringify(param),
    });

    if (!response.ok) {
      throw new Error('内部服务错误，请稍后重试。');
    }

    const { errcode, msg, errmsg, data } = await response.json();

    if (errcode === 0 || errcode === '0') {
      return data as T;
    } else {
      const isLoginFailed = [1003, 'VERIFY_LOGIN_FAILED', 'VERIFY_USER_FAILED'].includes(errcode);
      if (isLoginFailed) {
        console.error('[LCAP] 登录态失效，请在浏览器重新登录 dev-platform');
      }

      throw {
        code: errcode,
        message: (errmsg || msg) ?? '错误：未知',
      };
    }
  } catch (error: any) {
    if (opts?.tipErr) {
      console.error('[LCAP Error]', error?.message || '内部服务错误');
    }
    throw error;
  }
}
