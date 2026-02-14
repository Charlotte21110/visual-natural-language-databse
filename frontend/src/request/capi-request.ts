/**
 * CAPI 底层请求方法
 *
 * 对应 dev-platform: src/framework/request/capi/call-capi/call-capi.ts
 *
 * 核心逻辑：
 * 1. Cookie 由 Vite 代理服务器注入（从 .env.local 中读取）
 * 2. 前端带上 X-Qcloud-Token（从响应头缓存）
 * 3. 前端带上 X-CsrfCode（从 .env.local Cookie 中解析 skey 计算）
 * 4. 前端带上 X-Req-Id（请求追踪）
 */
import { randomUUID } from '../utils/uuid';
import { generateAntiCsrfCode } from '../utils/csrf';

// ==================== 类型定义 ====================

export interface ICallCapiParams {
  serviceType: string;
  actionName: string;
  actionParam?: Record<string, any>;
  region?: string;
  signVersion?: string;
}

export interface ICapiRequestParams {
  /** 服务类型 */
  serviceType: string;
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

export function setQcloudToken(token: string) {
  cachedQcloudToken = token;
}

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

/** 默认地域 */
const DEFAULT_REGION = 'ap-shanghai';

/** 成功响应码 */
const SUCCESS_CODE = 'NORMAL';

function isFailureResult(result: ICallCapiResult): boolean {
  return result.code !== SUCCESS_CODE && result.code !== 0 && result.code !== '0';
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
 *
 * 注意：Cookie 不由前端 fetch 携带，而是由 Vite 代理注入。
 * 前端只负责带 X-Qcloud-Token / X-CsrfCode / X-Req-Id 等自定义头。
 */
async function callCapi(
  endpoint: string,
  params: ICallCapiParams,
  opts?: { signal?: AbortSignal },
): Promise<any> {
  const apiIdentifier = [params.serviceType, params.actionName].join('/');
  const csrfCode = generateAntiCsrfCode();

  console.log('[CAPI DEBUG] 请求:', {
    endpoint,
    action: params.actionName,
    csrfCode: csrfCode ? `${csrfCode.substring(0, 6)}...` : 'empty!',
    token: cachedQcloudToken ? `${cachedQcloudToken.substring(0, 10)}...` : 'empty',
  });

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

  // 从响应头缓存 token
  const newToken = response.headers.get(X_QCLOUD_TOKEN) || response.headers.get('x-qcloud-token');
  if (newToken) {
    cachedQcloudToken = newToken;
  }

  const callResult = (await response.json()) as ICallCapiResult;

  console.log('[CAPI DEBUG] 响应:', {
    code: callResult.code,
    msg: callResult.msg?.substring(0, 100),
    hasToken: !!response.headers.get(X_QCLOUD_TOKEN),
  });

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
 * @example
 * ```ts
 * const result = await capiRequest({
 *   serviceType: 'tcb',
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
    region: DEFAULT_REGION,
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
        console.error(
          '[CAPI] 登录态失效！请按以下步骤操作：\n' +
          '1. 浏览器访问 https://tcb.cloud.tencent.com/login 登录\n' +
          '2. 登录后 F12 -> Application -> Cookies -> cloud.tencent.com\n' +
          '3. 复制完整 Cookie 到 .env.local 的 VITE_TCLOUD_COOKIE 中\n' +
          '4. 重启 dev server (npm run dev)',
        );
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
