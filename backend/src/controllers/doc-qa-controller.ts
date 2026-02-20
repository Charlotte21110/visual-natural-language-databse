/**
 * 文档问答控制器
 * 连接 RAG 服务，提供知识库问答（不执行数据操作）
 */
import { Request, Response } from 'express';
import { DocAssistantAgent } from '../agents/doc-assistant-agent.js';

// 复用同一个 Agent 实例
const docAgent = new DocAssistantAgent();

/**
 * 处理文档问答请求
 */
export async function handleDocQAQuery(req: Request, res: Response) {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'question field is required and must be a string',
      });
    }

    console.log('\n========================================');
    console.log('[Doc QA] 收到问答请求');
    console.log('  问题:', question);
    console.log('========================================\n');

    // 调用文档问答 Agent（基于 RAG）
    const result = await docAgent.execute(question, {}, {});

    res.json({
      answer: result.message,
      sources: result.metadata?.sources || [],
      suggestions: result.suggestions,
    });

  } catch (error: any) {
    console.error('[Doc QA Error]', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '处理问答请求时出错，请稍后重试',
    });
  }
}

