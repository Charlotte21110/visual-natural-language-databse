/**
 * Doc Assistant Agent
 * 基于 RAG 的文档问答 Agent
 */
import { AgentResponse } from '../services/agent-router.js';
import { getRAGService } from '../services/rag-service.js';

export class DocAssistantAgent {
  constructor() {
    // RAG 服务使用单例模式，无需在这里初始化
  }

  async execute(
    message: string,
    _params: Record<string, any>,
    _context: any
  ): Promise<AgentResponse> {
    console.log('[DocAssistantAgent] Question:', message);

    try {
      // 使用 RAG 服务回答问题
      const rag = getRAGService();
      const result = await rag.answer(message);

      return {
        type: 'doc_answer',
        message: result.answer,
        metadata: {
          question: message,
          sources: result.sources.map(s => ({
            title: s.title,
            content: s.content,
            score: s.score,
          })),
        },
        // TODO marisa 这个suggestions地方没反应没显示，后期优化
        suggestions: [
          '查询数据表',
          '如何创建索引',
          '数据库权限设置',
        ],
      };
    } catch (error: any) {
      console.error('[DocAssistantAgent] Error:', error);
      return {
        type: 'doc_answer',
        message: `文档查询失败: ${error.message}。你可以访问 CloudBase 官方文档获取帮助。`,
        metadata: {
          question: message,
          error: error.message,
          sources: [
            { title: 'CloudBase 文档', url: 'https://docs.cloudbase.net/' },
          ],
        },
        suggestions: [
          '查询数据表',
          '重新提问',
        ],
      };
    }
  }
}
