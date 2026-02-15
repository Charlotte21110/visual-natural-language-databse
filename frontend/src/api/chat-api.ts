/**
 * Chat API
 * 调用后端自然语言处理接口
 */

export interface ChatQueryRequest {
  message: string;
  context?: {
    envId?: string;
    sessionId?: string;
    lastQuery?: string;
    history?: any[];
    [key: string]: any;
  };
}

export interface ChatQueryResponse {
  type: string;
  message: string;
  data?: any;
  metadata?: {
    dbType?: string;
    table?: string;
    database?: string;
    rowCount?: number;
    columns?: string[];
    displayType?: 'table' | 'document';
    [key: string]: any;
  };
  suggestions?: string[];
}

/**
 * 调用后端聊天查询接口
 */
export async function queryChatAPI(
  request: ChatQueryRequest
): Promise<ChatQueryResponse> {
  // 在开发环境，使用绝对 URL
  // 在生产环境，可以配置 Vite 代理，直接使用 /api
  const baseURL = import.meta.env.DEV
    ? 'http://localhost:3001'
    : '';

  const response = await fetch(`${baseURL}/api/chat/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
