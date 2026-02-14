/**
 * CAPI 底层请求方法
 *
 * 对应 dev-platform: src/framework/request/capi/call-capi/call-capi.ts
 *
 * 核心逻辑：
 * 1. 通过 credentials: 'include' 携带 Cookie（鉴权依赖）
 * 2. 请求头带上 X-Qcloud-Token（从响应头缓存）
 * 3. 请求头带上 X-CsrfCode（CSRF 防护）
 * 4. 请求头带上 X-Req-Id（请求追踪）
 */
import { randomUUID } from '../utils/uuid';
import { generateAntiCsrfCode } from '../utils/csrf';
import type { ECapiServiceType } from '../constants';

// ==================== 类型定义 ====================

export interface ICallCapiParams {
  serviceType: ECapiServiceType | string;
  actionName: string;
  actionParam?: Record<string, any>;
  region?: string;
  signVersion?: string;
}

export interface ICapiRequestParams {
  /** 服务类型 */
  serviceType: ECapiServiceType | string;
  /** 接口名称 */
  action: string;
  /** 接口入参 */
  data?: Record<string, any>;
  /** 额外信息（region 等） */
  extra?: {
    region?: string;
    signVersion?: string;
    [key: string]: any;
  };
}

export interface ICapiRequestOpts {
  /** 是否显示错误提示 */
  showTipsError?: boolean;
  /** AbortSignal */
  signal?: AbortSignal;
}

interface ICallCapiResult {
  code: number | string;
  msg?: string;
  reqId?: string;
  result?: any;
}

// ==================== Token 缓存 ====================

let cachedQcloudToken = '';

/**
 * 手动设置 qcloud token（如果需要从外部注入）
 */
export function setQcloudToken(token: string) {
  cachedQcloudToken = token;
}

/**
 * 获取当前缓存的 qcloud token
 */
export function getQcloudToken(): string {
  return cachedQcloudToken;
}

// ==================== 请求头常量 ====================

const X_QCLOUD_TOKEN = 'X-Qcloud-Token';
const X_REQUEST_ID = 'X-Req-Id';
const X_TCB_SOURCE = 'X-Tcb-Source';
const X_CSRF_CODE = 'X-CsrfCode';
const X_TC_LANGUAGE = 'X-TC-Language';

const TCB_SOURCE = 'naturalLanguageDb/dev';

// ==================== 判断请求结果 ====================

function isFailureResult(result: ICallCapiResult): boolean {
  return result.code !== 0 && result.code !== '0';
}

// ==================== 错误类 ====================

export class ApiCallError extends Error {
  code: string;
  apiIdentifier: string;
  reqId: string;
  reason?: string;

  constructor(
    message: string,
    opts: { code: string; apiIdentifier?: string; reqId?: string; reason?: string },
  ) {
    super(message);
    this.name = 'ApiCallError';
    this.code = opts.code;
    this.apiIdentifier = opts.apiIdentifier || '';
    this.reqId = opts.reqId || '';
    this.reason = opts.reason;
  }
}

// ==================== 底层请求 ====================

/**
 * CAPI 底层 fetch 请求
 *
 * 对应 dev-platform 的 callCapi 函数
 */
async function callCapi(
  endpoint: string,
  params: ICallCapiParams,
  opts?: { signal?: AbortSignal },
): Promise<any> {
  const apiIdentifier = [params.serviceType, params.actionName].join('/');

  const response = await fetch(endpoint, {
    method: 'POST',
    signal: opts?.signal,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      [X_QCLOUD_TOKEN]: cachedQcloudToken,
      [X_REQUEST_ID]: randomUUID(),
      [X_TCB_SOURCE]: TCB_SOURCE,
      [X_CSRF_CODE]: generateAntiCsrfCode(),
      [X_TC_LANGUAGE]: 'zh-CN',
    },
    credentials: 'include',
    body: JSON.stringify({
      raw: true,
      actionParam: {},
      signVersion: 'v3',
      ...params,
    }),
  });

  // HTTP 状态码异常
  if (!response.ok) {
    const { status, statusText } = response;
    throw new ApiCallError(`[${status}] ${statusText}`, {
      apiIdentifier,
      code: String(status),
    });
  }

  // 从响应头缓存 token（后端会在响应头返回新 token）
  if (response.headers.has(X_QCLOUD_TOKEN)) {
    cachedQcloudToken = response.headers.get(X_QCLOUD_TOKEN) || '';
  }

  const callResult = (await response.json()) as ICallCapiResult;

  if (isFailureResult(callResult)) {
    const { code, reqId, msg, result } = callResult;
    const message = msg || 'Oops! Something went wrong.';
    throw new ApiCallError(`[${code}] ${message}`, {
      apiIdentifier,
      code: String(code),
      reqId: result?.RequestId || reqId || '',
      reason: result?.Error?.Message,
    });
  }

  return callResult.result;
}

// ==================== 高层封装 ====================

/**
 * 发起 CAPI 请求
 *
 * 对应 dev-platform 的 capiRequest 函数
 *
 * @example
 * ```ts
 * const result = await capiRequest({
 *   serviceType: ECapiServiceType.TCB,
 *   action: 'RunSql',
 *   data: { EnvId: 'xxx', Sql: 'SELECT 1' },
 * });
 * ```
 */
export async function capiRequest<TData = any>(
  params: ICapiRequestParams,
  opts?: ICapiRequestOpts,
): Promise<TData> {
  const { serviceType, action, data: actionParams, extra } = params;
  const apiIdentifier = `${serviceType}/${action}`;
  const endpoint = `/weda-capi/qcloud-weida/v1/capi?i=${apiIdentifier}`;

  const callCapiParams: ICallCapiParams = {
    ...extra,
    serviceType,
    actionName: action,
    actionParam: { ...actionParams },
  };

  try {
    const result = await callCapi(endpoint, callCapiParams, { signal: opts?.signal });
    return result as TData;
  } catch (err) {
    if (err instanceof ApiCallError) {
      const isLoginFailed = ['VERIFY_LOGIN_FAILED', 'VERIFY_USER_FAILED'].includes(err.code);
      if (isLoginFailed) {
        console.error('[CAPI] 登录态失效，请在浏览器重新登录 dev-platform');
      }
    }
    throw err;
  }
}

// ==================== 按服务类型快捷方法 ====================

export function tcbCapiRequest<T = any>(
  params: Omit<ICapiRequestParams, 'serviceType'>,
  opts?: ICapiRequestOpts,
) {
  return capiRequest<T>({ ...params, serviceType: 'tcb' }, opts);
}

export function lowcodeCapiRequest<T = any>(
  params: Omit<ICapiRequestParams, 'serviceType'>,
  opts?: ICapiRequestOpts,
) {
  return capiRequest<T>({ ...params, serviceType: 'lowcode' }, opts);
}

export function scfCapiRequest<T = any>(
  params: Omit<ICapiRequestParams, 'serviceType'>,
  opts?: ICapiRequestOpts,
) {
  return capiRequest<T>({ ...params, serviceType: 'scf' }, opts);
}

export function flexdbCapiRequest<T = any>(
  params: Omit<ICapiRequestParams, 'serviceType'>,
  opts?: ICapiRequestOpts,
) {
  return capiRequest<T>({ ...params, serviceType: 'flexdb' }, opts);
}

export function camCapiRequest<T = any>(
  params: Omit<ICapiRequestParams, 'serviceType'>,
  opts?: ICapiRequestOpts,
) {
  return capiRequest<T>({ ...params, serviceType: 'cam' }, opts);
}

export function accountCapiRequest<T = any>(
  params: Omit<ICapiRequestParams, 'serviceType'>,
  opts?: ICapiRequestOpts,
) {
  return capiRequest<T>({ ...params, serviceType: 'account' }, opts);
}
