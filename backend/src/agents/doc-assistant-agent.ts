/**
 * Doc Assistant Agent
 * 基于 RAG 的文档问答 Agent
 */
import { AgentResponse } from '../services/agent-router.js';
// import { RAGService } from '../services/rag-service.js';

export class DocAssistantAgent {
  // private rag: RAGService;

  constructor() {
    // TODO: 初始化 RAG 服务
    // this.rag = new RAGService();
  }

  async execute(
    message: string,
    params: Record<string, any>,
    _context: any
  ): Promise<AgentResponse> {
    console.log('[DocAssistantAgent] Question:', message);

    // TODO: 实现完整的 RAG 流程
    // 1. 向量检索
    // 2. 召回相关文档片段
    // 3. 生成回答

    // 暂时返回占位响应
    return {
      type: 'doc_answer',
      message: '文档问答功能正在开发中。你可以先访问 CloudBase 官方文档查看详细信息。',
      metadata: {
        question: message,
        sources: [
          { title: 'CloudBase 文档', url: 'https://cloud.tencent.com/document/product/876' },
        ],
      },
      suggestions: [
        '查询数据表',
        '创建数据模型',
      ],
    };
  }
}
