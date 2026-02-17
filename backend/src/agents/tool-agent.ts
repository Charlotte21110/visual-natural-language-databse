/**
 * Tool-based Agent
 * 使用 LangChain Tool Calling 的智能 Agent
 *
 * 核心优势：
 * 1. AI 自动选择合适的工具
 * 2. AI 自动生成结构化参数（不用手写正则提取）
 * 3. 支持链式调用多个工具
 * 4. 新增功能只需添加 Tool，不用改路由逻辑
 */
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { PromptTemplate } from '@langchain/core/prompts';
import { databaseTools } from '../tools/database-tools.js';
import { AgentResponse } from '../services/agent-router.js';

// ReAct Agent 的提示词模板
const REACT_PROMPT = `你是一个数据库操作助手。你可以使用提供的工具来操作 CloudBase FlexDB 数据库。

当前上下文：
- 环境 ID：{envId}
- 上一次查询的表：{lastTable}

重要规则：
1. 用户说的"表"就是"集合"（collection）
2. 调用工具时，输入必须是有效的 JSON 字符串
3. 查询条件使用 MongoDB 语法：
   - 等于：{{"field": "value"}}
   - 大于：{{"field": {{"$gt": 18}}}}
   - 包含：{{"field": {{"$in": ["a", "b"]}}}}
4. 如果用户没指定 envId，使用上下文中的 envId

你可以使用以下工具：
{tools}

工具名称列表: {tool_names}

使用以下格式回答：

Question: 用户的输入问题
Thought: 思考下一步应该做什么
Action: 要使用的工具名称（必须是上面列表中的一个）
Action Input: 工具的输入（必须是 JSON 字符串）
Observation: 工具返回的结果
... (这个 Thought/Action/Action Input/Observation 可以重复多次)
Thought: 我现在知道最终答案了
Final Answer: 给用户的最终回复

开始！

Question: {input}
Thought: {agent_scratchpad}`;

export class ToolAgent {
  private llm: ChatOpenAI | null = null;
  private agentExecutor: AgentExecutor | null = null;
  private initialized = false;

  constructor() {
    // 懒加载
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

      // 解析工具调用结果
      return this.formatResponse(result, context);
    } catch (error: any) {
      console.error('[ToolAgent Error]', error);
      return {
        type: 'error',
        message: `执行失败: ${error.message}`,
        suggestions: ['检查参数是否正确', '查看文档'],
      };
    }
  }

  /**
   * 格式化响应
   */
  private formatResponse(result: any, _context: any): AgentResponse {
    // 提取工具调用的数据
    const intermediateSteps = result.intermediateSteps || [];
    let data: any = null;
    let toolUsed = '';
    let collection = '';
    let count = 0;

    // 解析中间步骤，提取实际数据
    for (const step of intermediateSteps) {
      const toolName = step.action?.tool;
      const toolOutput = step.observation;

      if (toolOutput) {
        try {
          const parsed = JSON.parse(toolOutput);
          if (parsed.success) {
            toolUsed = toolName;
            collection = parsed.collection || '';

            if (parsed.data) {
              data = parsed.data;
              count = parsed.count || data.length;
            } else if (parsed.count !== undefined) {
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

