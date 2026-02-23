/**
 * CloudBase Client
 * 封装 @cloudbase/node-sdk 调用
 * 
 * 文档参考: backend/docs/api-reference/server/node-sdk/database/fetch.md
 */
import cloudbase from '@cloudbase/node-sdk';

export class CloudBaseClient {
  private apps: Map<string, any> = new Map();
  private dbs: Map<string, any> = new Map();
  private secretId: string;
  private secretKey: string;
  private defaultEnvId: string;
  private db: any = null; // 保留默认数据库实例（兼容旧代码）

  constructor() {
    // 从环境变量获取密钥
    this.secretId = process.env.TCB_SECRET_ID || '';
    this.secretKey = process.env.TCB_SECRET_KEY || '';
    this.defaultEnvId = process.env.TCB_ENV_ID || '';

    if (!this.secretId || !this.secretKey) {
      console.warn('[CloudBase] 未配置腾讯云密钥，部分功能将不可用');
      console.warn('[CloudBase] 请在 .env 中配置 TCB_SECRET_ID 和 TCB_SECRET_KEY');
    }

    // 如果有默认环境，初始化它（兼容旧代码）
    if (this.defaultEnvId) {
      this.db = this.getDB(this.defaultEnvId);
    }
  }

  /**
   * 获取或初始化指定环境的数据库实例
   * 公开方法，供 RAGCodeAgent 动态执行代码使用
   */
  public getDB(envId: string) {
    if (!this.secretId || !this.secretKey) {
      throw new Error('CloudBase 未配置密钥，请在 .env 中配置 TCB_SECRET_ID 和 TCB_SECRET_KEY');
    }

    if (!envId) {
      throw new Error('未指定环境 ID，请传入 envId 参数');
    }

    // 如果已经初始化过这个环境，直接返回
    if (this.dbs.has(envId)) {
      return this.dbs.get(envId);
    }

    try {
      // 初始化新环境
      console.log('[CloudBase] 初始化环境:', envId);
      const app = cloudbase.init({
        env: envId,
        secretId: this.secretId,
        secretKey: this.secretKey,
      });

      const db = app.database();
      
      // 缓存实例
      this.apps.set(envId, app);
      this.dbs.set(envId, db);

      console.log('[CloudBase] 环境初始化成功:', { envId });
      return db;
    } catch (error) {
      console.error('[CloudBase] 环境初始化失败:', error);
      throw error;
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
      envId?: string;
      where?: Record<string, any>;
      limit?: number;
      skip?: number;
      orderBy?: { field: string; direction: 'asc' | 'desc' };
      field?: Record<string, boolean>;
    }
  ): Promise<any[]> {
    const { envId, where, limit = 100, skip = 0, orderBy, field } = options || {};

    if (!envId) {
      throw new Error('查询集合需要指定 envId');
    }

    // 获取对应环境的数据库实例
    const db = this.getDB(envId);

    try {
      console.log('[CloudBase] 查询集合:', {
        envId,
        collection: collectionName,
        where,
        limit,
        skip,
      });

      // 构建查询
      let query = db.collection(collectionName);

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
   * 更新数据（批量更新）
   * 
   * 文档参考: backend/docs/api-reference/server/node-sdk/database/update.md
   * 
   * @param envId 环境ID
   * @param collectionName 集合名称
   * @param where 查询条件（空对象 {} 表示匹配所有文档）
   * @param data 要更新的数据
   * 
   * @example
   * ```js
   * // 给所有文档添加新字段
   * const result = await cloudbase.updateDocuments('env-id', 'todos', {}, {
   *   newField: 'value'
   * })
   * 
   * // 更新符合条件的文档
   * const result = await cloudbase.updateDocuments('env-id', 'todos', {
   *   completed: false
   * }, {
   *   completed: true,
   *   updatedAt: new Date()
   * })
   * ```
   */
  async updateDocuments(
    envId: string,
    collectionName: string,
    where: Record<string, any>,
    data: Record<string, any>
  ): Promise<{ updated: number; stats?: any }> {
    const db = this.getDB(envId);

    try {
      console.log('[CloudBase] 批量更新:', {
        envId,
        collectionName,
        where,
        data,
      });

      const result = await db
        .collection(collectionName)
        .where(where)
        .update(data);

      console.log('[CloudBase] 更新结果:', result);

      return {
        updated: result.updated || 0,
        stats: result.stats,
      };
    } catch (error: any) {
      console.error('[CloudBase] 更新失败:', error);
      throw new Error(`更新失败: ${error.message}`);
    }
  }

  /**
   * 新增文档（单条插入）
   * 
   * 文档参考: backend/docs/api-reference/server/node-sdk/database/add.md
   * 
   * @param envId 环境ID
   * @param collectionName 集合名称
   * @param data 要插入的数据对象
   * 
   * @example
   * ```js
   * // 添加单条记录
   * const result = await cloudbase.insertDocument('env-id', 'todos', {
   *   title: '学习 CloudBase',
   *   content: '完成数据库操作教程',
   *   completed: false,
   *   createdAt: new Date()
   * })
   * 
   * console.log('新增成功，文档 ID:', result.id)
   * ```
   */
  async insertDocument(
    envId: string,
    collectionName: string,
    data: Record<string, any>
  ): Promise<{ id: string; insertedCount?: number }> {
    const db = this.getDB(envId);

    try {
      console.log('[CloudBase] 新增文档:', {
        envId,
        collectionName,
        data,
      });

      const result = await db
        .collection(collectionName)
        .add(data);

      console.log('[CloudBase] 新增结果:', result);

      return {
        id: result.id || result._id,
        insertedCount: 1,
      };
    } catch (error: any) {
      console.error('[CloudBase] 新增失败:', error);
      throw new Error(`新增文档失败: ${error.message}`);
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
