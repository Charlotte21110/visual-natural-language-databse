/**
 * Data Explorer Agent
 * 负责查询和展示数据库数据
 */
import { AgentResponse } from '../services/agent-router.js';
import { CloudBaseClient } from '../clients/cloudbase-client.js';

export class DataExplorerAgent {
  private cloudbase: CloudBaseClient;

  constructor() {
    this.cloudbase = new CloudBaseClient();
  }

  async execute(
    message: string,
    params: Record<string, any>,
    context: any
  ): Promise<AgentResponse> {
    try {
      console.log('[DataExplorerAgent] Executing with params:', params);

      // 1. 参数补全和验证
      const { dbType, table, database, envId } = this.normalizeParams(params, context);

      if (!envId) {
        return {
          type: 'missing_params',
          message: '请先配置环境 ID (envId)，或者在 .env 中设置 TCB_ENV_ID',
          suggestions: ['配置环境 ID', '查看文档'],
        };
      }

      if (!table) {
        return {
          type: 'missing_params',
          message: '请告诉我要查询哪个表？例如："查询 users 表"',
          suggestions: ['查询 users 表', '查询 orders 表'],
        };
      }

      // 2. 根据数据库类型调用不同的查询方法
      let result: any;

      if (dbType === 'flexdb' || dbType === 'mongodb') {
        result = await this.queryFlexDB(envId, table, context);
      } else if (dbType === 'mysql') {
        result = await this.queryMySQL(envId, database || 'main', table, context);
      } else {
        // 默认尝试 FlexDB
        result = await this.queryFlexDB(envId, table, context);
      }

      // 3. 格式化响应
      return this.formatResponse(result, { dbType, table, database });
    } catch (error: any) {
      console.error('[DataExplorerAgent Error]', error);
      return {
        type: 'error',
        message: `查询失败: ${error.message}`,
        suggestions: ['检查表名是否正确', '查看文档'],
        metadata: { error: error.stack },
      };
    }
  }

  /**
   * 参数标准化
   */
  private normalizeParams(params: Record<string, any>, context: any) {
    return {
      dbType: params.dbType || context.lastDbType || 'flexdb',
      table: params.table || context.lastTable,
      database: params.database,
      envId: params.envId || context.envId || process.env.TCB_ENV_ID,
    };
  }

  /**
   * 查询 FlexDB (MongoDB)
   */
  private async queryFlexDB(envId: string, collectionName: string, context: any) {
    console.log(`[DataExplorerAgent] Querying FlexDB: ${collectionName}`);

    // 获取数据（默认限制 100 条）
    const limit = context.limit || 100;
    const data = await this.cloudbase.queryCollection(envId, collectionName, {
      limit,
    });

    return {
      dbType: 'flexdb',
      collection: collectionName,
      data,
      count: data.length,
    };
  }

  /**
   * 查询 MySQL
   */
  private async queryMySQL(
    envId: string,
    database: string,
    table: string,
    context: any
  ) {
    console.log(`[DataExplorerAgent] Querying MySQL: ${database}.${table}`);

    // 构建 SQL（默认查询前 100 条）
    const limit = context.limit || 100;
    const sql = `SELECT * FROM \`${table}\` LIMIT ${limit}`;

    const data = await this.cloudbase.executeSQL(envId, database, sql);

    return {
      dbType: 'mysql',
      database,
      table,
      data,
      count: data.length,
    };
  }

  /**
   * 格式化响应
   */
  private formatResponse(result: any, queryInfo: any): AgentResponse {
    const { dbType, table, database } = queryInfo;
    const count = result.count || 0;

    let message = '';
    if (dbType === 'mysql') {
      message = `已为您查询 MySQL 数据库 ${database} 的 ${table} 表，共 ${count} 条数据`;
    } else {
      message = `已为您查询 FlexDB 的 ${table} 集合，共 ${count} 条数据`;
    }

    // 提取列名
    let columns: string[] = [];
    if (result.data && result.data.length > 0) {
      columns = Object.keys(result.data[0]);
    }

    return {
      type: 'query_result',
      message,
      data: result.data,
      metadata: {
        dbType,
        table,
        database,
        rowCount: count,
        columns,
        displayType: dbType === 'mongodb' || dbType === 'flexdb' ? 'document' : 'table',
      },
      suggestions: [
        '筛选数据',
        '分析这些数据',
        '导出为 Excel',
      ],
    };
  }
}
