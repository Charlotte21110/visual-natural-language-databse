/**
 * RAG Code Agent
 * 根据知识库文档动态生成 SDK 代码并执行
 *
 * 使用场景：当 ToolAgent 找不到合适的工具时，降级到这里
 * 流程：RAG 检索文档 → LLM 生成代码 → 安全执行
 */
import { generateText } from '../services/codebuddy-llm.js';
import { getRAGService } from '../services/rag-service.js';
import { getCloudBaseClient } from '../clients/cloudbase-client.js';
import { AgentResponse } from '../services/agent-router.js';
import { CODE_GENERATION_PROMPT } from '../prompts/rag-code-agent.js';

export class RAGCodeAgent {

  /**
   * 执行用户请求
   */
  async execute(message: string, context: any): Promise<AgentResponse> {
    console.log('[RAGCodeAgent] 开始处理:', message);

    try {
      // 尝试 RAG 检索
      let docs: any[] = [];
      try {
        const ragService = getRAGService();
        docs = await ragService.retrieve(message, 5);
      } catch (ragError: any) {
        console.log('[RAGCodeAgent] RAG 服务不可用，直接使用 LLM:', ragError.message);
      }

      if (docs.length > 0) {
        // 有 RAG 文档，走代码生成路径
        const docContext = docs.map((d, i) => 
          `[文档${i + 1}] ${d.source}\n${d.content}`
        ).join('\n\n---\n\n');

        const prompt = CODE_GENERATION_PROMPT
          .replace('{context}', docContext)
          .replace('{query}', message);

        const response = await generateText(prompt);
        const generatedCode = this.extractCode(response);

        if (generatedCode) {
          console.log('[RAGCodeAgent] 生成的代码:\n', generatedCode);
          const result = await this.executeCode(generatedCode, context);
          return {
            type: 'rag_code_result',
            message: `✅ 操作成功！\n\n**生成的代码：**\n\`\`\`javascript\n${generatedCode}\n\`\`\``,
            data: result.data,
            metadata: { generatedCode, sources: docs.slice(0, 3).map(d => d.source) },
            suggestions: ['继续操作', '查询数据'],
          };
        }
      }

      // 无 RAG 或代码生成失败，直接用 LLM 回答
      const envId = context.envId || process.env.TCB_ENV_ID || '未配置';
      const directPrompt = `你是一个数据库操作助手。用户想在 CloudBase 环境 (envId: ${envId}) 上执行以下操作：\n\n${message}\n\n请给出操作建议和可能的实现方案。`;
      const directResponse = await generateText(directPrompt);

      return {
        type: 'tool_response',
        message: directResponse,
        suggestions: ['继续操作', '查看文档'],
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

