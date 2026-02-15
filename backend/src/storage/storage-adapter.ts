/**
 * Storage Adapter
 * 提供多种存储方案的统一接口
 */

export interface IStorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

/**
 * 内存存储（默认，适合开发和小规模使用）
 */
export class MemoryStorage implements IStorageAdapter {
  private store = new Map<string, any>();

  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  getSize(): number {
    return this.store.size;
  }
}

// TODO marisa 这里没用，后面删掉

/**
 * 文件存储（适合单机部署，持久化数据）
 */
export class FileStorage implements IStorageAdapter {
  private filePath: string;
  private cache = new Map<string, any>();
  private dirty = false;

  constructor(filePath: string = './data/storage.json') {
    this.filePath = filePath;
    this.load();
  }

  private load() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 确保目录存在
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 加载文件
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(content);
        this.cache = new Map(Object.entries(data));
        console.log(`[FileStorage] Loaded ${this.cache.size} entries from ${this.filePath}`);
      }
    } catch (error) {
      console.error('[FileStorage] Load error:', error);
    }
  }

  private async save() {
    if (!this.dirty) return;

    try {
      const fs = require('fs').promises;
      const data = Object.fromEntries(this.cache);
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
      this.dirty = false;
      console.log(`[FileStorage] Saved ${this.cache.size} entries to ${this.filePath}`);
    } catch (error) {
      console.error('[FileStorage] Save error:', error);
    }
  }

  async get(key: string): Promise<any> {
    return this.cache.get(key);
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
    this.dirty = true;
    // 延迟保存，避免频繁写文件
    setTimeout(() => this.save(), 1000);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    this.dirty = true;
    setTimeout(() => this.save(), 1000);
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.dirty = true;
    await this.save();
  }
}

/**
 * Redis 存储（推荐用于生产环境）
 * 
 * 使用前需要安装: npm install redis
 * 并启动 Redis 服务
 */
export class RedisStorage implements IStorageAdapter {
  private client: any;
  private connected = false;

  constructor(url?: string) {
    try {
      // 动态导入 redis（如果安装了）
      const redis = require('redis');
      this.client = redis.createClient({
        url: url || process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.client.on('error', (err: any) => {
        console.error('[RedisStorage] Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('[RedisStorage] Connected');
        this.connected = true;
      });

      this.client.connect();
    } catch (error) {
      console.warn('[RedisStorage] Redis not available, falling back to memory storage');
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    if (!this.connected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('[RedisStorage] Get error:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.set(key, JSON.stringify(value));
    } catch (error) {
      console.error('[RedisStorage] Set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('[RedisStorage] Delete error:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.connected) return false;
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('[RedisStorage] Has error:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.flushDb();
    } catch (error) {
      console.error('[RedisStorage] Clear error:', error);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

/**
 * Storage Factory
 * 根据配置选择存储方案
 */
export function createStorage(): IStorageAdapter {
  const storageType = process.env.STORAGE_TYPE || 'memory';

  console.log(`[Storage] Using ${storageType} storage`);

  switch (storageType) {
    case 'file':
      return new FileStorage(process.env.STORAGE_FILE_PATH);
    
    case 'redis':
      try {
        return new RedisStorage(process.env.REDIS_URL);
      } catch (error) {
        console.warn('[Storage] Redis not available, falling back to memory');
        return new MemoryStorage();
      }
    
    case 'memory':
    default:
      return new MemoryStorage();
  }
}
