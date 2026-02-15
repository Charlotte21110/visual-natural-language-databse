/**
 * CloudBase Client
 * 封装 CloudBase SDK 调用
 */
import Manager from '@tcb-manager/node';

export class CloudBaseClient {
  private manager: Manager | null = null;

  constructor() {
    this.initManager();
  }

  /**
   * 初始化 Manager
   */
  private initManager() {
    const secretId = process.env.TCB_SECRET_ID;
    const secretKey = process.env.TCB_SECRET_KEY;

    if (!secretId || !secretKey) {
      console.warn('[CloudBase] 未配置腾讯云密钥，部分功能将不可用');
      return;
    }

    try {
      this.manager = new Manager({
        secretId,
        secretKey,
        envId: process.env.TCB_ENV_ID,
      });
      console.log('[CloudBase] Manager 初始化成功');
    } catch (error) {
      console.error('[CloudBase] Manager 初始化失败', error);
    }
  }

  /**
   * 查询 FlexDB 集合
   */
  async queryCollection(
    envId: string,
    collectionName: string,
    options?: {
      query?: Record<string, any>;
      limit?: number;
      offset?: number;
      projection?: Record<string, any>;
    }
  ): Promise<any[]> {
    if (!this.manager) {
      throw new Error('CloudBase Manager 未初始化');
    }

    try {
      const { query = {}, limit = 100, offset = 0, projection } = options || {};

      const result = await this.manager.database.queryDocuments({
        envId,
        collectionName,
        query: JSON.stringify(query),
        limit,
        offset,
        projection: projection ? JSON.stringify(projection) : undefined,
      });

      console.log('[CloudBase] Query result:', {
        collection: collectionName,
        count: result?.data?.length || 0,
      });

      return result?.data || [];
    } catch (error: any) {
      console.error('[CloudBase] Query error:', error);
      throw new Error(`查询集合失败: ${error.message}`);
    }
  }

  /**
   * 执行 SQL 查询（MySQL）
   */
  async executeSQL(
    envId: string,
    database: string,
    sql: string
  ): Promise<any[]> {
    if (!this.manager) {
      throw new Error('CloudBase Manager 未初始化');
    }

    try {
      // TODO: 调用 MySQL 查询接口
      // 注意：@tcb-manager/node 可能没有直接的 MySQL 接口
      // 需要通过 CAPI 或其他方式调用

      console.warn('[CloudBase] MySQL 查询暂未实现');
      return [];
    } catch (error: any) {
      console.error('[CloudBase] SQL error:', error);
      throw new Error(`SQL 执行失败: ${error.message}`);
    }
  }

  /**
   * 获取集合列表
   */
  async listCollections(envId: string): Promise<string[]> {
    if (!this.manager) {
      throw new Error('CloudBase Manager 未初始化');
    }

    try {
      const result = await this.manager.database.listCollections({ envId });
      return result?.collections?.map((c: any) => c.name) || [];
    } catch (error: any) {
      console.error('[CloudBase] List collections error:', error);
      throw new Error(`获取集合列表失败: ${error.message}`);
    }
  }

  /**
   * 检查集合是否存在
   */
  async collectionExists(envId: string, collectionName: string): Promise<boolean> {
    try {
      const collections = await this.listCollections(envId);
      return collections.includes(collectionName);
    } catch (error) {
      return false;
    }
  }
}
