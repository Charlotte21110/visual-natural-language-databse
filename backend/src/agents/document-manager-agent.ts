/**
 * Document Manager Agent
 * 负责处理文档（记录）的增删改操作
 */

import { CloudBaseClient } from '../clients/cloudbase-client.js';

export interface AgentResponse {
  type: string;
  message: string;
  data?: any;
  suggestions?: string[];
}

export interface DocumentInsertParams {
  envId?: string;
  table?: string;
  dbType?: 'flexdb' | 'mysql' | 'mongodb';
  data?: Record<string, any>;  // 要插入的数据对象
  [key: string]: any;
}

export class DocumentManagerAgent {
  private cloudbase: CloudBaseClient;

  constructor() {
    this.cloudbase = new CloudBaseClient();
  }

  /**
   * 执行文档操作
   */
  async execute(
    message: string,
    params: DocumentInsertParams,
    context?: any
  ): Promise<AgentResponse> {
    console.log('[Document Manager Agent] 执行参数:', params);

    // 参数校验
    const validation = this.validateParams(params);
    if (!validation.valid) {
      return {
        type: 'error',
        message: validation.message!,
        suggestions: [
          '查询 test 表',
          '查看文档',
        ],
      };
    }

    // 执行新增文档操作
    return await this.insertDocument(params);
  }

  /**
   * 验证参数
   */
  private validateParams(params: DocumentInsertParams): { valid: boolean; message?: string } {
    if (!params.envId) {
      return {
        valid: false,
        message: '❌ 请先配置环境 ID (envId)',
      };
    }

    if (!params.table) {
      return {
        valid: false,
        message: '❌ 请告诉我要操作哪个表？例如："给 users 表新增一个文档"',
      };
    }

    if (!params.data || Object.keys(params.data).length === 0) {
      return {
        valid: false,
        message: `❌ 请告诉我要插入什么数据？例如："给 ${params.table} 表新增一个文档，内容是 name: 张三, age: 25"`,
      };
    }

    return { valid: true };
  }

  /**
   * 新增文档
   */
  private async insertDocument(params: DocumentInsertParams): Promise<AgentResponse> {
    try {
      // 类型安全检查
      if (!params.envId || !params.table || !params.data) {
        throw new Error('缺少必要参数');
      }

      console.log('[Document Manager Agent] 开始新增文档:', {
        table: params.table,
        data: params.data,
      });

      // 调用 CloudBase SDK 新增文档
      // 注意：CloudBase 的 FlexDB 使用 add() 方法
      const result = await this.cloudbase.insertDocument(
        params.envId,
        params.table,
        params.data
      );

      console.log('[Document Manager Agent] 新增成功:', result);

      // 格式化要显示的数据
      const dataStr = Object.entries(params.data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return {
        type: 'success',
        message: `✅ 成功往 ${params.table} 表添加了一条新记录！\n\n📄 插入的数据：\n${dataStr}\n\n文档 ID: ${result.id || '(自动生成)'}`,
        data: {
          id: result.id,
          insertedData: params.data,
        },
        suggestions: [
          `查询 ${params.table} 表`,
          `再插入一条数据`,
          '查看文档',
        ],
      };
    } catch (error: any) {
      console.error('[Document Manager Agent] 新增文档失败:', error);

      return {
        type: 'error',
        message: `❌ 新增文档失败：${error.message}\n\n请检查：\n1. 表名是否正确\n2. 数据格式是否合法\n3. 是否有权限操作`,
        suggestions: [
          '查看文档',
          params.table ? `查询 ${params.table} 表` : '查询数据',
        ],
      };
    }
  }
}
