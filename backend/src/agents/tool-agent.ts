/**
 * Tool-based Agent
 * 使用 LangGraph createReactAgent 的智能 Agent
 *
 * 核心优势：
 * 1. AI 自动选择合适的工具
 * 2. AI 自动生成结构化参数（不用手写正则提取）
 * 3. 支持链式调用多个工具
 * 4. 新增功能只需添加 Tool，不用改路由逻辑
 * 5. 🔥 找不到工具时降级到 RAG 代码生成
 */
import { generateText } from '../services/codebuddy-llm.js';
import { databaseTools } from '../tools/database-tools.js';
import { AgentResponse } from '../services/agent-router.js';
import { RAGCodeAgent } from './rag-code-agent.js';

export class ToolAgent {
  private ragCodeAgent: RAGCodeAgent;

  constructor() {
    this.ragCodeAgent = new RAGCodeAgent();
    console.log('[ToolAgent] 初始化完成（CodeBuddy LLM 模式），已加载工具:', databaseTools.map(t => t.name));
  }

  /**
   * 执行用户请求
   * 使用 CodeBuddy LLM + RAG 代码生成
   */
  async execute(message: string, context: any): Promise<AgentResponse> {
    console.log('[ToolAgent] 执行请求（RAG Code 模式）:', { message, envId: context.envId });

    try {
      return await this.ragCodeAgent.execute(message, context);
    } catch (error: any) {
      console.error('[ToolAgent Error]', error);
      return {
        type: 'error',
        message: `执行失败: ${error.message}`,
        suggestions: ['检查参数是否正确', '查看文档'],
      };
    }
  }

}

