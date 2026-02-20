/**
 * 文档问答 API 路由
 * 处理知识库问答请求（不执行数据操作）
 */
import { Router } from 'express';
import { handleDocQAQuery } from '../controllers/doc-qa-controller.js';

export const docQARouter = Router();

/**
 * POST /api/doc-qa/query
 * 
 * 请求体:
 * {
 *   "question": "如何使用 SDK 创建数据？"
 * }
 * 
 * 响应:
 * {
 *   "answer": "根据文档，您可以使用以下方式创建数据...",
 *   "sources": [...]  // 引用来源（可选）
 * }
 */
docQARouter.post('/query', handleDocQAQuery);

