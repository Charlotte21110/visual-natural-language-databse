/**
 * CloudBase Client
 * 封装 @cloudbase/node-sdk 调用
 * 
 * 文档参考: backend/docs/api-reference/server/node-sdk/database/fetch.md
 */
import cloudbase from '@cloudbase/node-sdk';

export class CloudBaseClient {
  private app: any = null;
  private db: any = null;
  private initialized: boolean = false;

  constructor() {
    // 懒加载，不在构造函数中初始化
  }

  /**
   * 初始化 SDK
   */
  private initSDK() {
    if (this.initialized) return;
    this.initialized = true;
    const secretId = process.env.TCB_SECRET_ID;
    const secretKey = process.env.TCB_SECRET_KEY;
    // TODO 这个环境id应该从前端传过来，或者使用项目里存起来的id啊
    const envId = process.env.TCB_ENV_ID;

    if (!secretId || !secretKey) {
      console.warn('[CloudBase] 未配置腾讯云密钥，部分功能将不可用');
      console.warn('[CloudBase] 请在 .env 中配置 TCB_SECRET_ID 和 TCB_SECRET_KEY');
      return;
    }

    if (!envId) {
      console.warn('[CloudBase] 未配置默认环境 ID，请在 .env 中配置 TCB_ENV_ID');
    }

    try {
      // 初始化 CloudBase
      this.app = cloudbase.init({
        env: envId,
        secretId,
        secretKey,
      });

      this.db = this.app.database();
      console.log('[CloudBase] SDK 初始化成功', { envId });
    } catch (error) {
      console.error('[CloudBase] SDK 初始化失败', error);
    }
  }

  /**
   * 查询集合数据
   * 
   * @param collectionName 集合名称
   * @param options 查询选项
   */
  async queryCollection(
    collectionName: string,
    options?: {
      where?: Record<string, any>;
      limit?: number;
      skip?: number;
      orderBy?: { field: string; direction: 'asc' | 'desc' };
      field?: Record<string, boolean>;
    }
  ): Promise<any[]> {
    // 确保初始化
    if (!this.db) {
      this.initSDK();
    }
    
    if (!this.db) {
      throw new Error('CloudBase SDK 未初始化，请检查环境变量配置');
    }

    try {
      const { where, limit = 100, skip = 0, orderBy, field } = options || {};

      console.log('[CloudBase] 查询集合:', {
        collection: collectionName,
        where,
        limit,
        skip,
      });

      // 构建查询
      let query = this.db.collection(collectionName);

      // 添加条件
      if (where && Object.keys(where).length > 0) {
        query = query.where(where);
      }

      // 添加排序
      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      // 添加分页
      if (skip > 0) {
        query = query.skip(skip);
      }

      query = query.limit(limit);

      // 指定返回字段
      if (field) {
        query = query.field(field);
      }

      // 执行查询
      const result = await query.get();

      console.log('[CloudBase] 查询成功:', {
        collection: collectionName,
        count: result.data?.length || 0,
      });

      return result.data || [];
    } catch (error: any) {
      console.error('[CloudBase] 查询失败:', error);
      throw new Error(`查询集合失败: ${error.message}`);
    }
  }

  /**
   * 根据文档 ID 查询单条记录
   */
  async getDocById(collectionName: string, docId: string): Promise<any> {
    if (!this.db) {
      throw new Error('CloudBase SDK 未初始化');
    }

    try {
      const result = await this.db.collection(collectionName).doc(docId).get();

      if (result.data && result.data.length > 0) {
        return result.data[0];
      }

      return null;
    } catch (error: any) {
      console.error('[CloudBase] 查询单条记录失败:', error);
      throw new Error(`查询文档失败: ${error.message}`);
    }
  }

  /**
   * 复杂查询（使用查询指令）
   * 
   * 示例:
   * ```js
   * const _ = db.command;
   * queryWithCommand('users', {
   *   age: _.gt(18),
   *   tags: _.in(['技术', '学习'])
   * })
   * ```
   */
  async queryWithCommand(
    collectionName: string,
    conditions: Record<string, any>,
    options?: {
      limit?: number;
      skip?: number;
      orderBy?: { field: string; direction: 'asc' | 'desc' };
    }
  ): Promise<any[]> {
    if (!this.db) {
      throw new Error('CloudBase SDK 未初始化');
    }

    try {
      const { limit = 100, skip = 0, orderBy } = options || {};

      let query = this.db.collection(collectionName).where(conditions);

      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.direction);
      }

      if (skip > 0) {
        query = query.skip(skip);
      }

      query = query.limit(limit);

      const result = await query.get();
      return result.data || [];
    } catch (error: any) {
      console.error('[CloudBase] 复杂查询失败:', error);
      throw new Error(`查询失败: ${error.message}`);
    }
  }

  /**
   * 统计查询
   */
  async count(collectionName: string, where?: Record<string, any>): Promise<number> {
    if (!this.db) {
      throw new Error('CloudBase SDK 未初始化');
    }

    try {
      let query = this.db.collection(collectionName);

      if (where) {
        query = query.where(where);
      }

      const result = await query.count();
      return result.total || 0;
    } catch (error: any) {
      console.error('[CloudBase] 统计失败:', error);
      throw new Error(`统计失败: ${error.message}`);
    }
  }

  /**
   * 聚合查询
   */
  async aggregate(collectionName: string, pipeline: any[]): Promise<any[]> {
    if (!this.db) {
      throw new Error('CloudBase SDK 未初始化');
    }

    try {
      const result = await this.db
        .collection(collectionName)
        .aggregate()
        .pipeline(pipeline)
        .end();

      return result.list || [];
    } catch (error: any) {
      console.error('[CloudBase] 聚合查询失败:', error);
      throw new Error(`聚合查询失败: ${error.message}`);
    }
  }

  /**
   * 获取查询指令（用于复杂条件）
   * 
   * 返回 db.command，前端可以这样用：
   * ```js
   * const _ = client.getCommand();
   * client.queryWithCommand('users', {
   *   age: _.gt(18),
   *   tags: _.in(['技术', '学习'])
   * })
   * ```
   */
  getCommand() {
    if (!this.db) {
      throw new Error('CloudBase SDK 未初始化');
    }
    return this.db.command;
  }

  /**
   * 检查 SDK 是否已初始化
   */
  isInitialized(): boolean {
    return this.db !== null;
  }
}

// 全局单例
let cloudbaseClient: CloudBaseClient | null = null;

export function getCloudBaseClient(): CloudBaseClient {
  if (!cloudbaseClient) {
    cloudbaseClient = new CloudBaseClient();
  }
  return cloudbaseClient;
}
