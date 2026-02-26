/**
 * Tool-based Agent
 * 使用 LangChain Tool Calling 的智能 Agent
 *
 * 核心优势：
 * 1. AI 自动选择合适的工具
 * 2. AI 自动生成结构化参数（不用手写正则提取）
 * 3. 支持链式调用多个工具
 * 4. 新增功能只需添加 Tool，不用改路由逻辑
 * 5. 🔥 找不到工具时降级到 RAG 代码生成
 */
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { PromptTemplate } from '@langchain/core/prompts';
import { databaseTools } from '../tools/database-tools.js';
import { AgentResponse } from '../services/agent-router.js';
import { RAGCodeAgent } from './rag-code-agent.js';
import { REACT_PROMPT } from '../prompts/tool-agent.js';

export class ToolAgent {
  private llm: ChatOpenAI | null = null;
  private agentExecutor: AgentExecutor | null = null;
  private initialized = false;
  private ragCodeAgent: RAGCodeAgent;  // 🔥 RAG 降级 Agent

  constructor() {
    this.ragCodeAgent = new RAGCodeAgent();
  }

  /**
   * 初始化 Agent
   */
  private async initialize() {
    if (this.initialized) return;

    // 创建 LLM
    this.llm = new ChatOpenAI({
      modelName: process.env.LLM_MODEL || 'qwen-plus',
      temperature: 0.1,
      configuration: {
        baseURL: process.env.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
      },
    });

    // 创建 ReAct Agent（适用于 DynamicTool）
    const prompt = PromptTemplate.fromTemplate(REACT_PROMPT);

    const agent = await createReactAgent({
      llm: this.llm,
      tools: databaseTools,
      prompt,
    });

    // 创建执行器
    this.agentExecutor = new AgentExecutor({
      agent,
      tools: databaseTools,
      verbose: true,  // 开启调试日志
      returnIntermediateSteps: true,
      maxIterations: 5,  // 防止无限循环
    });

    this.initialized = true;
    console.log('[ToolAgent] 初始化完成，已加载工具:', databaseTools.map(t => t.name));
  }

  /**
   * 执行用户请求
   * 优先使用 Tool，找不到合适工具时降级到 RAG 代码生成
   */
  async execute(message: string, context: any): Promise<AgentResponse> {
    try {
      await this.initialize();

      if (!this.agentExecutor) {
        throw new Error('Agent 初始化失败');
      }

      console.log('[ToolAgent] 执行请求:', { message, envId: context.envId });

      // 调用 Agent
      const result = await this.agentExecutor.invoke({
        input: message,
        envId: context.envId || process.env.TCB_ENV_ID || '未配置',
        lastTable: context.lastTable || '无',
      });

      console.log('[ToolAgent] 执行结果:', result);

      // 检查是否找到了合适的工具
      const response = this.formatResponse(result, context);

      // 🔥 如果没有调用任何工具，或者结果表明找不到合适方法，降级到 RAG
      if (this.shouldFallbackToRAG(result, response)) {
        console.log('[ToolAgent] 没有找到合适的工具，降级到 RAG Code Agent');
        return await this.ragCodeAgent.execute(message, context);
      }

      return response;
    } catch (error: any) {
      console.error('[ToolAgent Error]', error);

      // 🔥 执行出错时也尝试 RAG 降级
      console.log('[ToolAgent] 执行出错，尝试 RAG 降级');
      try {
        return await this.ragCodeAgent.execute(message, context);
      } catch (ragError: any) {
        console.error('[RAGCodeAgent Error]', ragError);
        return {
          type: 'error',
          message: `执行失败: ${error.message}`,
          suggestions: ['检查参数是否正确', '查看文档'],
        };
      }
    }
  }

  /**
   * 判断是否应该降级到 RAG
   *
   * 关键原则：
   * - 如果大模型调用了工具并给出了合理回复（即使工具执行失败），不降级
   * - 只有当大模型完全不知道该用什么工具时，才降级到 RAG
   */
  private shouldFallbackToRAG(result: any, _response: AgentResponse): boolean {
    const intermediateSteps = result.intermediateSteps || [];
    const output = (result.output || '').toLowerCase();

    // 1. 没有调用任何工具 → 降级
    if (intermediateSteps.length === 0) {
      console.log('[ToolAgent] 降级原因: 没有调用任何工具');
      return true;
    }

    // 2. 输出明确表示不知道怎么做 → 降级
    const unknownPatterns = [
      '不知道', '没有这个工具', '无法完成', '不支持这个操作',
      '没有合适的工具', '找不到对应的'
    ];
    if (unknownPatterns.some(p => output.includes(p))) {
      console.log('[ToolAgent] 降级原因: 大模型表示不知道怎么做');
      return true;
    }

    // 3. 工具执行失败但大模型给出了分析 → 不降级，用大模型的回复
    // 因为大模型已经理解了问题并给出了建议（比如配额超限的情况）

    return false;
  }

  /**
   * 格式化响应
   * 🔥 优化：从缓存获取完整数据返回给前端，大模型只看了前3条预览
   */
  private formatResponse(result: any, _context: any): AgentResponse {
    // 提取工具调用的数据
    const intermediateSteps = result.intermediateSteps || [];
    let data: any = null;
    let toolUsed = '';
    let collection = '';
    let count = 0;

    // 解析中间步骤，提取操作的数据
    for (const step of intermediateSteps) {
      const toolName = step.action?.tool;
      const toolOutput = step.observation;

      if (toolOutput) {
        try {
          const parsed = JSON.parse(toolOutput);
          if (parsed.success) {
            toolUsed = toolUsed || toolName;
            collection = collection || parsed.collection || '';

            // 提取数据
            if (parsed.data) {
              data = parsed.data;
              count = parsed.count || data.length;
            }

            if (parsed.count !== undefined) {
              count = parsed.count;
            } else if (parsed.insertedId) {
              // 插入操作
              data = parsed.data;
              count = 1;
            } else if (parsed.updatedCount !== undefined) {
              // 更新操作
              count = parsed.updatedCount;
            }
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    // 构建与原 DataExplorerAgent 兼容的 metadata
    const metadata = {
      dbType: 'flexdb',  // CloudBase FlexDB 是文档型数据库
      table: collection,
      database: _context?.envId || '',
      rowCount: count,
      columns: data && data.length > 0 ? Object.keys(data[0]) : [],
      displayType: 'document' as const,  // FlexDB 使用文档视图
      toolUsed,
    };

    return {
      type: data ? 'query_result' : 'tool_response',
      message: result.output,
      data,
      metadata,
      suggestions: ['继续查询', '筛选数据', '导出数据'],
    };
  }
}

