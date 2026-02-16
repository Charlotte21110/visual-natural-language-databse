/**
 * 用户偏好存储
 * 
 * 目前使用内存存储，可以扩展为：
 * 1. Redis 存储（推荐生产环境）
 * 2. 数据库存储
 * 3. 文件存储
 */

interface UserPreferences {
  envId?: string;
  [key: string]: any;
}

export class UserPreferenceStore {
  private store: Map<string, UserPreferences>;

  constructor() {
    this.store = new Map();
  }

  /**
   * 设置用户的环境 ID
   */
  setEnv(userId: string, envId: string): void {
    const preferences = this.store.get(userId) || {};
    preferences.envId = envId;
    this.store.set(userId, preferences);
  }

  /**
   * 获取用户的环境 ID
   */
  getEnv(userId: string): string | undefined {
    const preferences = this.store.get(userId);
    return preferences?.envId;
  }

  /**
   * 清除用户的环境设置
   */
  clearEnv(userId: string): void {
    const preferences = this.store.get(userId);
    if (preferences) {
      delete preferences.envId;
      this.store.set(userId, preferences);
    }
  }

  /**
   * 获取用户的所有偏好设置
   */
  getPreferences(userId: string): UserPreferences | undefined {
    return this.store.get(userId);
  }

  /**
   * 设置用户的偏好设置
   */
  setPreferences(userId: string, preferences: UserPreferences): void {
    this.store.set(userId, preferences);
  }

  /**
   * 清除用户的所有偏好设置
   */
  clearPreferences(userId: string): void {
    this.store.delete(userId);
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 获取存储的用户数量
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * 全局单例实例
 * 在整个应用中共享用户偏好设置
 */
export const globalUserPreferenceStore = new UserPreferenceStore();
