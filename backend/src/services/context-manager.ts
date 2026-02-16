/**
 * Context Manager
 * 管理会话上下文、历史记录
 */
import { createStorage, IStorageAdapter } from '../storage/storage-adapter.js';
import { UserPreferenceStore, globalUserPreferenceStore } from '../storage/user-preference-store.js';

interface ContextEntry {
  message: string;
  intent: any;
  result: any;
  timestamp: string;
}

export class ContextManager {
  private storage: IStorageAdapter;
  private userPreferenceStore: UserPreferenceStore;
  private readonly maxHistorySize = 10;

  constructor(userPreferenceStore?: UserPreferenceStore) {
    // 使用配置的存储方案
    this.storage = createStorage();
    // 使用全局的 UserPreferenceStore 实例
    this.userPreferenceStore = userPreferenceStore || globalUserPreferenceStore;
  }

  /**
   * 补充上下文信息
   */
  async enrichContext(context?: any): Promise<any> {
    const enriched = {
      ...context,
      timestamp: new Date().toISOString(),
    };

    // 补充环境 ID（优先级：context > UserPreferenceStore > 环境变量）
    if (!enriched.envId) {
      // 1. 从 UserPreferenceStore 读取用户选择的环境ID
      const userId = enriched.userId || 'default-user';
      const userEnvId = this.userPreferenceStore.getEnv(userId);
      
      // 2. 如果用户选择了环境，使用用户选择的
      // 3. 否则使用环境变量中的默认值
      enriched.envId = userEnvId || process.env.TCB_ENV_ID || '';
      
      console.log('[ContextManager] 环境ID:', {
        userId,
        userEnvId,
        fallback: process.env.TCB_ENV_ID,
        final: enriched.envId
      });
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
