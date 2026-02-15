/**
 * Context Manager
 * 管理会话上下文、历史记录
 */
import { createStorage, IStorageAdapter } from '../storage/storage-adapter.js';

interface ContextEntry {
  message: string;
  intent: any;
  result: any;
  timestamp: string;
}

export class ContextManager {
  private storage: IStorageAdapter;
  private readonly maxHistorySize = 10;

  constructor() {
    // 使用配置的存储方案
    this.storage = createStorage();
  }

  /**
   * 补充上下文信息
   */
  async enrichContext(context?: any): Promise<any> {
    const enriched = {
      ...context,
      timestamp: new Date().toISOString(),
    };

    // 补充默认环境 ID（如果没有提供）
    if (!enriched.envId) {
      enriched.envId = process.env.TCB_ENV_ID || '';
    }

    // 获取历史记录
    const sessionId = enriched.sessionId || 'default';
    const history = await this.getHistory(sessionId);
    enriched.history = history.slice(-5); // 只保留最近 5 条

    // 提取上一次查询信息
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      enriched.lastQuery = lastEntry.message;
      enriched.lastTable = lastEntry.intent?.params?.table;
      enriched.lastDbType = lastEntry.intent?.params?.dbType;
    }

    return enriched;
  }

  /**
   * 保存上下文
   */
  async saveContext(entry: ContextEntry): Promise<void> {
    const sessionId = 'default'; // TODO: 支持多会话
    const key = `context:${sessionId}`;
    
    const history = await this.storage.get(key) || [];
    history.push(entry);

    // 限制历史记录大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }

    await this.storage.set(key, history);
  }

  /**
   * 获取历史记录
   */
  async getHistory(sessionId: string = 'default'): Promise<ContextEntry[]> {
    const key = `context:${sessionId}`;
    return await this.storage.get(key) || [];
  }

  /**
   * 清空历史
   */
  async clearHistory(sessionId: string = 'default'): Promise<void> {
    const key = `context:${sessionId}`;
    await this.storage.delete(key);
  }
}
