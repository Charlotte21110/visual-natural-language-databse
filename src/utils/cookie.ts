/**
 * Cookie 工具函数
 */
export const cookie = {
  get(name: string): string {
    const match = document.cookie.match(new RegExp(`(?:^|;+|\\s+)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : '';
  },

  set(name: string, value: string, expires = 31536000, domain = document.domain) {
    const expiresStr = new Date(Date.now() + expires * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expiresStr};path=/;domain=${domain};`;
  },

  remove(name: string, domain = document.domain) {
    document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/;domain=${domain};`;
  },
};
