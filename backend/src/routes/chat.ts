/**
 * Chat API 路由
 * 处理自然语言查询请求
 */
import { Router } from 'express';
import { handleChatQuery } from '../controllers/chat-controller.js';

export const chatRouter = Router();

/**
 * POST /api/chat/query
 * 
 * 请求体:
 * {
 *   "message": "查询 flexdb 的 users 表",
 *   "context": {
 *     "envId": "xxx",
 *     "history": [...]
 *   }
 * }
 * 
 * 响应:
 * {
 *   "type": "query_result",
 *   "message": "已为您查询 users 表，共 120 条数据",
 *   "data": [...],
 *   "metadata": { ... },
 *   "suggestions": ["查看字段详情", "筛选数据"]
 * }
 */
chatRouter.post('/query', handleChatQuery);
