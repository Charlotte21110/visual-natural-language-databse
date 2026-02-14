/**
 * 腾讯云认证配置
 *
 * 本地开发时，需要先在浏览器登录腾讯云控制台，
 * 然后从浏览器开发者工具中复制 Cookie 到这里。
 *
 * 步骤：
 * 1. 浏览器访问 https://tcb.cloud.tencent.com/login 并登录
 * 2. 登录成功后打开开发者工具 -> Application -> Cookies
 * 3. 找到 cloud.tencent.com 域名下的 Cookie
 * 4. 在 .env.local 文件中填入以下值
 *
 * 注意：.env.local 不会被 git 追踪，可以安全存放敏感信息
 */

// 从环境变量读取
export const AUTH_CONFIG = {
  /**
   * 从浏览器复制完整的 Cookie 字符串
   * 需要包含 skey, p_skey, uin, p_uin 等字段
   */
  get cookie(): string {
    return import.meta.env.VITE_TCLOUD_COOKIE || '';
  },

  /** 登录页 URL（中国站） */
  loginUrl: 'https://tcb.cloud.tencent.com/login',

  /** 退出登录 URL */
  logoutUrl: 'https://cloud.tencent.com/login/quit',
} as const;
