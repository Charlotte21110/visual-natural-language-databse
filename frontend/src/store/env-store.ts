/**
 * 环境全局状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EnvInfo } from '../types/env';
import { fetchEnvList, saveUserEnv, getUserEnv } from '../api/env';

interface EnvState {
  // 环境列表
  envList: EnvInfo[];
  // 当前选中的环境
  currentEnv: EnvInfo | null;
  // 加载状态
  loading: boolean;
  // 错误信息
  error: string | null;

  // Actions
  /** 初始化环境列表（从后端获取 + 设置默认环境） */
  initEnvList: () => Promise<void>;
  /** 切换环境 */
  switchEnv: (envId: string) => Promise<void>;
  /** 刷新环境列表 */
  refreshEnvList: () => Promise<void>;
}

export const useEnvStore = create<EnvState>()(
  persist(
    (set, get) => ({
      envList: [],
      currentEnv: null,
      loading: false,
      error: null,

      initEnvList: async () => {
        const { envList: existingList, loading } = get();
        
        // 如果已经有数据或正在加载，跳过
        if (existingList.length > 0 || loading) {
          console.log('[EnvStore] 环境列表已存在，跳过重复加载');
          return;
        }

        set({ loading: true, error: null });
        try {
          // 1. 获取环境列表
          const result = await fetchEnvList();
          const envList = result.EnvList || [];

          if (envList.length === 0) {
            set({
              envList: [],
              currentEnv: null,
              loading: false,
              error: '未找到可用环境',
            });
            return;
          }

          // 2. 尝试从后端获取用户上次选择的环境
          const savedEnvId = await getUserEnv();

          // 3. 确定当前环境
          let currentEnv: EnvInfo | null = null;
          
          if (savedEnvId) {
            // 如果后端有保存，优先使用
            currentEnv = envList.find(env => env.EnvId === savedEnvId) || null;
          }
          
          if (!currentEnv) {
            // 否则选择默认环境或第一个
            currentEnv = envList.find(env => env.IsDefault) || envList[0];
            
            // 保存到后端
            if (currentEnv) {
              await saveUserEnv(currentEnv.EnvId);
            }
          }

          set({
            envList,
            currentEnv,
            loading: false,
            error: null,
          });
          
          console.log('[EnvStore] 环境列表初始化完成:', {
            total: envList.length,
            current: currentEnv?.Alias || currentEnv?.EnvId,
          });
        } catch (error: any) {
          console.error('[EnvStore] 初始化环境列表失败:', error);
          set({
            loading: false,
            error: error.message || '获取环境列表失败',
          });
        }
      },

      switchEnv: async (envId: string) => {
        const { envList } = get();
        const targetEnv = envList.find(env => env.EnvId === envId);
        
        if (!targetEnv) {
          console.error('[EnvStore] 环境不存在:', envId);
          return;
        }

        try {
          // 1. 保存到后端
          await saveUserEnv(envId);

          // 2. 更新本地状态
          set({ currentEnv: targetEnv });

          console.log('[EnvStore] 切换环境成功:', {
            envId,
            alias: targetEnv.Alias,
          });
        } catch (error: any) {
          console.error('[EnvStore] 切换环境失败:', error);
          set({ error: error.message || '切换环境失败' });
        }
      },

      refreshEnvList: async () => {
        await get().initEnvList();
      },
    }),
    {
      name: 'env-storage', // localStorage key
      partialize: (state) => ({
        // 只持久化 envList 和 currentEnv，不持久化 loading/error
        envList: state.envList,
        currentEnv: state.currentEnv,
      }),
    },
  ),
);
