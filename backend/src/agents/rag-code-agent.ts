/**
 * RAG Code Agent
 * 根据知识库文档动态生成 SDK 代码并执行
 *
 * 使用场景：当 ToolAgent 找不到合适的工具时，降级到这里
 * 流程：RAG 检索文档 → LLM 生成代码 → 安全执行
 */
import { ChatOpenAI } from '@langchain/openai';
import { getRAGService } from '../services/rag-service.js';
import { getCloudBaseClient } from '../clients/cloudbase-client.js';
import { AgentResponse } from '../services/agent-router.js';
import { CODE_GENERATION_PROMPT } from '../prompts/rag-code-agent.js';

export class RAGCodeAgent {
  private llm: ChatOpenAI | null = null;

  private getLLM(): ChatOpenAI {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: process.env.LLM_MODEL || 'qwen-plus',
        temperature: 0.1, // 低温度，生成更确定的代码
        configuration: {
          baseURL: process.env.LLM_BASE_URL,
          apiKey: process.env.LLM_API_KEY,
        },
      });
    }
    return this.llm;
  }

  /**
   * 执行用户请求
   */
  async execute(message: string, context: any): Promise<AgentResponse> {
    console.log('[RAGCodeAgent] 开始处理:', message);

    try {
      // 1. RAG 检索相关文档
      const ragService = getRAGService();
      const docs = await ragService.retrieve(message, 5);
      
      if (docs.length === 0) {
        return {
          type: 'error',
          message: '抱歉，没有找到相关的 API 文档，无法生成代码。',
          suggestions: ['查看文档', '尝试其他操作'],
        };
      }

      console.log('[RAGCodeAgent] 检索到', docs.length, '个相关文档');

      // 2. 构建上下文
      const docContext = docs.map((d, i) => 
        `[文档${i + 1}] ${d.source}\n${d.content}`
      ).join('\n\n---\n\n');

      // 3. 生成代码
      const prompt = CODE_GENERATION_PROMPT
        .replace('{context}', docContext)
        .replace('{query}', message);

      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      const generatedCode = this.extractCode(response.content as string);

      if (!generatedCode) {
        return {
          type: 'error',
          message: '代码生成失败，请尝试更明确地描述您的需求。',
          suggestions: ['查询 test 表', '添加一条数据'],
        };
      }

      console.log('[RAGCodeAgent] 生成的代码:\n', generatedCode);

      // 4. 执行代码
      const result = await this.executeCode(generatedCode, context);

      return {
        type: 'rag_code_result',
        message: `✅ 操作成功！\n\n**生成的代码：**\n\`\`\`javascript\n${generatedCode}\n\`\`\``,
        data: result.data,
        metadata: {
          generatedCode,
          sources: docs.slice(0, 3).map(d => d.source),
        },
        suggestions: ['继续操作', '查询数据'],
      };
    } catch (error: any) {
      console.error('[RAGCodeAgent] 执行失败:', error);
      return {
        type: 'error',
        message: `执行失败: ${error.message}`,
        suggestions: ['检查参数', '查看文档'],
      };
    }
  }

  /**
   * 从 LLM 响应中提取代码
   */
  private extractCode(content: string): string | null {
    const match = content.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  /**
   * 安全执行生成的代码
   */
  private async executeCode(
    code: string,
    context: any
  ): Promise<{ data: any }> {
    const envId = context.envId || process.env.TCB_ENV_ID;
    if (!envId) {
      throw new Error('未配置环境 ID');
    }

    // 获取数据库实例
    const cloudbase = getCloudBaseClient();
    const db = cloudbase.getDB(envId);
    const _ = db.command;

    // 包装成 async 函数执行
    const wrappedCode = `
      return (async () => {
        ${code}
      })();
    `;

    // 使用 Function 构造器执行（比 eval 稍安全）
    const fn = new Function('db', '_', wrappedCode);
    const result = await fn(db, _);

    return { data: result };
  }
}

