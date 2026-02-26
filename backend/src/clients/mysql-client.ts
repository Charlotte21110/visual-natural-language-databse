/**
 * MySQL Client
 * 封装腾讯云 MySQL (RunSql) 接口调用
 * 
 * 接口: https://weda-api.cloud.tencent.com/qcloud-weida/v1/capi?i=tcb/RunSql
 */
import { extractSkeyFromCookie, generateAntiCsrfCode } from '../utils/csrf.js';
import { randomUUID } from '../utils/uuid.js';

/** MySQL 数据库实例配置 */
export interface MySqlDbInstance {
  EnvId: string;
  InstanceId: string;
  Schema: string;
}

/** RunSql 请求参数 */
export interface RunSqlParams {
  envId: string;
  sql: string;
  dbInstance?: Partial<MySqlDbInstance>;
}

/** 字段信息 */
export interface MySqlColumnInfo {
  name: string;
  databaseType: string;
  length: number;
  nullable: boolean;
  precision: number;
  scale: number;
}

/** RunSql 响应结果 */
export interface RunSqlResult {
  columns?: MySqlColumnInfo[];
  columnNames?: string[];
  rows?: any[][];
  affectedRows?: number;
  insertId?: number;
  message?: string;
  requestId?: string;
}

/** API 响应类型 */
interface MySqlApiResponse {
  code: string | number;
  msg?: string;
  result?: any;
}

/** 错误类型 */
export class MySqlClientError extends Error {
  code: string | number;
  
  constructor(code: string | number, message: string) {
    super(message);
    this.name = 'MySqlClientError';
    this.code = code;
  }
}

export class MySqlClient {
  private baseURL: string;
  private defaultRegion: string;
  private cookie: string;
  private token: string;

  constructor() {
    this.baseURL = process.env.CAPI_BASE_URL || 'https://weda-api.cloud.tencent.com';
    this.defaultRegion = process.env.DEFAULT_REGION || 'ap-shanghai';
    this.cookie = process.env.TCLOUD_COOKIE || '';
    this.token = '';
  }

  /** 设置认证信息 */
  setCookie(cookie: string) {
    this.cookie = cookie;
  }

  setToken(token: string) {
    this.token = token;
  }

  /**
   * 执行 SQL 语句
   */
  async runSql(params: RunSqlParams, options?: { cookie?: string; token?: string }): Promise<RunSqlResult> {
    const { envId, sql, dbInstance } = params;
    const cookie = options?.cookie || this.cookie;
    const token = options?.token || this.token;

    if (!cookie) {
      throw new MySqlClientError('AUTH_REQUIRED', 'MySQL 操作需要 Cookie，请先登录或配置环境变量');
    }

    const endpoint = `${this.baseURL}/qcloud-weida/v1/capi?i=tcb/RunSql`;

    // 构建数据库实例配置
    const dbInstanceConfig: MySqlDbInstance = {
      EnvId: envId,
      InstanceId: dbInstance?.InstanceId || 'default',
      Schema: dbInstance?.Schema || envId,
    };

    const requestBody = {
      raw: true,
      serviceType: 'tcb',
      actionName: 'RunSql',
      actionParam: {
        EnvId: envId,
        Sql: sql,
        DbInstance: dbInstanceConfig,
      },
      region: this.defaultRegion,
      signVersion: 'v3',
    };

    console.log('[MySqlClient] 执行 SQL:', { envId, sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : '') });

    // 生成 CSRF 校验码
    const skey = extractSkeyFromCookie(cookie);
    const csrfCode = generateAntiCsrfCode(skey);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cookie': cookie,
          'X-Qcloud-Token': token,
          'X-Req-Id': randomUUID(),
          'X-Tcb-Source': 'naturalLanguageDb/mysql-client',
          'X-CsrfCode': csrfCode,
          'X-TC-Language': 'zh-CN',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new MySqlClientError('HTTP_ERROR', `HTTP ${response.status}: ${response.statusText}`);
      }

      // 更新 token
      const newToken = response.headers.get('X-Qcloud-Token');
      if (newToken) {
        this.token = newToken;
      }

      const result = await response.json() as MySqlApiResponse;
      console.log('[MySqlClient] 响应:', { code: result.code, hasResult: !!result.result });

      // 错误处理
      if (result.code !== 'NORMAL' && result.code !== 0 && result.code !== '0') {
        throw new MySqlClientError(result.code, result.msg || 'SQL 执行失败');
      }

      return this.parseResult(result.result);
    } catch (error: any) {
      if (error instanceof MySqlClientError) {
        throw error;
      }
      console.error('[MySqlClient] 执行错误:', error);
      throw new MySqlClientError('UNKNOWN_ERROR', error.message);
    }
  }

  /** 解析 SQL 执行结果 */
  private parseResult(result: any): RunSqlResult {
    if (!result) return { message: 'SQL 执行成功' };

    const requestId = result.RequestId;

    // 解析字段信息 (Infos 是 JSON 字符串数组)
    let columns: MySqlColumnInfo[] = [];
    let columnNames: string[] = [];

    if (result.Infos && Array.isArray(result.Infos)) {
      columns = result.Infos.map((infoStr: string) => {
        try {
          return JSON.parse(infoStr) as MySqlColumnInfo;
        } catch {
          return { name: 'unknown', databaseType: 'VARCHAR', length: 0, nullable: true, precision: 0, scale: 0 };
        }
      });
      columnNames = columns.map(col => col.name);
    }

    // 解析数据行 (Items)
    const rows = result.Items || [];

    // 如果有数据，返回查询结果
    if (columns.length > 0 || rows.length > 0) {
      return {
        columns,
        columnNames,
        rows,
        affectedRows: result.RowsAffected,
        requestId,
      };
    }

    // INSERT/UPDATE/DELETE 返回影响行数
    return {
      affectedRows: result.RowsAffected,
      message: result.RowsAffected !== undefined
        ? `操作成功，影响了 ${result.RowsAffected} 行`
        : 'SQL 执行成功',
      requestId,
    };
  }

  /** 获取所有表名 */
  async listTables(envId: string, options?: { cookie?: string; token?: string }): Promise<string[]> {
    const sql = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${envId}' AND TABLE_TYPE='BASE TABLE'`;
    const result = await this.runSql({ envId, sql }, options);
    return (result.rows || []).map(row => row[0]);
  }

  /** 获取表结构 */
  async describeTable(envId: string, tableName: string, options?: { cookie?: string; token?: string }): Promise<RunSqlResult> {
    const sql = `DESCRIBE \`${tableName}\``;
    return this.runSql({ envId, sql }, options);
  }
}

// 全局单例
let mysqlClient: MySqlClient | null = null;

export function getMySqlClient(): MySqlClient {
  if (!mysqlClient) {
    mysqlClient = new MySqlClient();
  }
  return mysqlClient;
}

