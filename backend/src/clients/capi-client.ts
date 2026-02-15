/**
 * CAPI Client
 * 封装腾讯云 CAPI 调用（用于不支持的 SDK 操作）
 * TODO marisa 估计这里调用转发代理有问题的要细看
 * 
 * 用途：当 @tcb-manager/node 不支持某些操作时（如修改字段、创建数据模型），
 *       通过 CAPI 直接调用云 API
 */

interface CapiRequestParams {
  serviceType: string;
  action: string;
  data?: Record<string, any>;
  region?: string;
}

interface CapiRequestOptions {
  cookie?: string;
  token?: string;
}

interface CapiResponse<T = any> {
  code: string | number;
  msg?: string;
  result?: T;
}

export class CapiClient {
  private baseURL: string;
  private defaultRegion: string;
  private cookie: string;
  private token: string;

  constructor() {
    // 这里使用腾讯云 CAPI 网关地址
    // 也可以使用 Weda 的代理地址
    this.baseURL = process.env.CAPI_BASE_URL || 'https://console.cloud.tencent.com';
    this.defaultRegion = process.env.DEFAULT_REGION || 'ap-shanghai';
    
    // Cookie 和 Token 可以从环境变量或配置中读取
    this.cookie = process.env.TCLOUD_COOKIE || '';
    this.token = '';
  }

  /**
   * 设置 Cookie（从前端登录后传递）
   */
  setCookie(cookie: string) {
    this.cookie = cookie;
  }

  /**
   * 设置 Token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 调用 CAPI
   */
  async request<T = any>(
    params: CapiRequestParams,
    options?: CapiRequestOptions
  ): Promise<T> {
    const { serviceType, action, data, region } = params;
    const apiIdentifier = `${serviceType}/${action}`;
    
    // 使用提供的 cookie/token 或默认值
    const cookie = options?.cookie || this.cookie;
    const token = options?.token || this.token;

    if (!cookie) {
      throw new Error('CAPI 调用需要 Cookie，请先登录或配置环境变量');
    }

    const endpoint = `${this.baseURL}/api/capi`;
    
    console.log('[CAPI Client] Request:', {
      apiIdentifier,
      region: region || this.defaultRegion,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
          'X-Qcloud-Token': token,
          'X-Tcb-Source': 'naturalLanguageDb/backend',
        },
        body: JSON.stringify({
          serviceType,
          actionName: action,
          actionParam: data || {},
          region: region || this.defaultRegion,
          signVersion: 'v3',
          raw: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 缓存新的 Token
      const newToken = response.headers.get('X-Qcloud-Token');
      if (newToken) {
        this.token = newToken;
      }

      const result = await response.json() as CapiResponse<T>;

      console.log('[CAPI Client] Response:', {
        code: result.code,
        success: result.code === 'NORMAL' || result.code === 0,
      });

      if (result.code !== 'NORMAL' && result.code !== 0 && result.code !== '0') {
        throw new Error(`CAPI Error [${result.code}]: ${result.msg || 'Unknown error'}`);
      }

      return result.result as T;
    } catch (error: any) {
      console.error('[CAPI Client] Error:', error);
      throw error;
    }
  }

  /**
   * 更新集合配置（修改字段、索引等）
   */
  async updateCollection(params: {
    envId: string;
    collectionName: string;
    options: {
      CreateIndexes?: any[];
      DropIndexes?: any[];
    };
  }) {
    return this.request({
      serviceType: 'tcb',
      action: 'ModifyDatabaseACL', // 或其他对应的接口
      data: {
        EnvId: params.envId,
        CollectionName: params.collectionName,
        ...params.options,
      },
    });
  }

  /**
   * 创建数据模型（Mermaid 图）
   */
  async createDataModel(params: {
    envId: string;
    mermaidDiagram: string;
    publish?: boolean;
  }) {
    return this.request({
      serviceType: 'lowcode',
      action: 'CreateDataModel',
      data: {
        EnvId: params.envId,
        MermaidDiagram: params.mermaidDiagram,
        Publish: params.publish || false,
      },
    });
  }
}

// 全局单例
let capiClient: CapiClient | null = null;

export function getCapiClient(): CapiClient {
  if (!capiClient) {
    capiClient = new CapiClient();
  }
  return capiClient;
}
