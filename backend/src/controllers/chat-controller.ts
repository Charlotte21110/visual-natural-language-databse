/**
 * Chat Controller
 * 处理聊天查询的控制器
 */
import { Request, Response } from 'express';
import { IntentClassifier } from '../services/intent-classifier.js';
import { AgentRouter } from '../services/agent-router.js';
import { ContextManager } from '../services/context-manager.js';

const intentClassifier = new IntentClassifier();
const agentRouter = new AgentRouter();
const contextManager = new ContextManager();

export async function handleChatQuery(req: Request, res: Response) {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'message field is required and must be a string',
      });
    }

    console.log('[Chat Query]', { message, hasContext: !!context });

    // 1. 补充上下文（历史会话、用户信息等）
    const enrichedContext = await contextManager.enrichContext(context);

    // 2. 意图分类
    const intent = await intentClassifier.classify(message, enrichedContext);
    console.log('[Intent]', intent);

    // 3. 路由到对应的 Agent
    const result = await agentRouter.route(intent, message, enrichedContext);

    // 4. 保存上下文
    await contextManager.saveContext({
      message,
      intent,
      result,
      timestamp: new Date().toISOString(),
    });

    // 5. 返回响应
    res.json(result);
  } catch (error: any) {
    console.error('[Chat Error]', error);
    res.status(500).json({
      type: 'error',
      message: '处理请求时出错，请稍后重试',
      error: error.message,
    });
  }
}
