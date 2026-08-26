/**
 * MySQL Tool Agent
 * 使用 LangGraph createReactAgent 的 MySQL 操作 Agent
 *
 * 核心功能：
 * 1. AI 将自然语言转换为 SQL 语句
 * 2. 自动选择合适的 MySQL 工具执行
 * 3. 支持查询、插入、更新等操作
 * 4. 找不到工具时降级到 RAG 代码生成
 */
import { ChatOpenAI } from '@langchain/openai';
import { createChatModel } from '../config/llm.js';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { mysqlTools, getLastMySqlQueryResult, clearLastMySqlQueryResult, setMySqlEnvId, setMySqlAuth } from '../tools/mysql-tools.js';
import { AgentResponse } from '../services/agent-router.js';
import { getCapiClient } from '../clients/capi-client.js';
import { MYSQL_REACT_SYSTEM_PROMPT } from '../prompts/mysql-agent.js';

// LangGraph createReactAgent 返回的类型
type ReactAgentGraph = Awaited<ReturnType<typeof createReactAgent>>;

export class MySQLToolAgent {
  private llm: ChatOpenAI | null = null;
  private agent: ReactAgentGraph | null = null;
  private initialized = false;

  /**
   * 初始化 Agent
   */
  private async initialize() {
    if (this.initialized) return;

    this.llm = createChatModel({ temperature: 0.1 });

    // 使用新版 LangGraph createReactAgent（直接返回可调用的 graph）
    this.agent = createReactAgent({
      llm: this.llm,
      tools: mysqlTools,
      // prompt 可以是 string（作为 system message）
      prompt: MYSQL_REACT_SYSTEM_PROMPT,
    });

    this.initialized = true;
    console.log('[MySQLToolAgent] 初始化完成，已加载工具:', mysqlTools.map(t => t.name));
  }

  /**
   * 执行用户请求
   */
  async execute(message: string, context: any): Promise<AgentResponse> {
    try {
      await this.initialize();

      if (!this.agent) {
        throw new Error('Agent 初始化失败');
      }

      // 🔥 设置当前环境ID，工具执行时自动使用
      const envId = context.envId || process.env.TCB_ENV_ID || '';

      // 🔥 从 capiClient 单例获取 cookie（登录时已保存）
      const capiClient = getCapiClient();
      const cookie = capiClient.getCookie();
      const token = capiClient.getToken();

      setMySqlEnvId(envId);
      setMySqlAuth(cookie, token);

      console.log('[MySQLToolAgent] 执行请求:', { message, envId, hasCookie: !!cookie });

      // 🔥 构建包含上下文的消息
      const messageWithContext = this.buildMessageWithContext(message, context);

      // 使用新版 LangGraph API 调用 Agent
      const result = await this.agent.invoke({
        messages: [new HumanMessage(messageWithContext)],
      });

      console.log('[MySQLToolAgent] 执行结果:', JSON.stringify(result, null, 2));

      // 从 LangGraph 结果中提取信息
      const parsedResult = this.parseGraphResult(result);

      return this.formatResponse(parsedResult, context);
    } catch (error: any) {
      console.error('[MySQLToolAgent Error]', error);
      return {
        type: 'error',
        message: `MySQL 操作失败: ${error.message}`,
        suggestions: ['检查 SQL 语法', '查看表结构', '检查权限'],
      };
    }
  }

  /**
   * 解析 LangGraph 返回的结果
   * 将 messages 数组转换为旧版 intermediateSteps + output 格式
   */
  private parseGraphResult(result: any): { intermediateSteps: any[]; output: string } {
    const messages = result.messages || [];
    const intermediateSteps: any[] = [];
    let output = '';

    for (const msg of messages) {
      // AIMessage with tool_calls -> 记录 tool 调用
      if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
        for (const toolCall of msg.tool_calls) {
          intermediateSteps.push({
            action: { tool: toolCall.name, toolInput: toolCall.args },
            observation: null, // 将在 ToolMessage 中填充
          });
        }
      }
      // ToolMessage -> 记录 tool 返回结果
      if (msg instanceof ToolMessage) {
        // 找到对应的 step 并填充 observation
        const lastStep = intermediateSteps[intermediateSteps.length - 1];
        if (lastStep && lastStep.observation === null) {
          lastStep.observation = msg.content;
        }
      }
      // 最后一个 AIMessage（没有 tool_calls）-> 作为最终输出
      if (msg instanceof AIMessage && (!msg.tool_calls || msg.tool_calls.length === 0)) {
        output = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      }
    }

    return { intermediateSteps, output };
  }

  /**
   * 构建包含上下文的消息
   * 将历史会话信息注入到用户消息中，帮助 AI 理解上下文
   */
  private buildMessageWithContext(message: string, context: any): string {
    const contextParts: string[] = [];

    // 添加上一次操作的表信息
    if (context.lastTable) {
      contextParts.push(`上一次操作的表: ${context.lastTable}`);
    }

    // 添加上一次查询信息
    if (context.lastQuery) {
      contextParts.push(`上一次用户查询: "${context.lastQuery}"`);
    }

    // 添加数据库类型信息
    if (context.lastDbType) {
      contextParts.push(`上一次数据库类型: ${context.lastDbType}`);
    }

    // 如果没有上下文，直接返回原消息
    if (contextParts.length === 0) {
      return message;
    }

    // 构建包含上下文的消息
    const contextInfo = contextParts.join('\n');
    return `【上下文信息】
${contextInfo}

【用户当前请求】
${message}

注意：如果用户的请求涉及到"这个表"、"刚才的表"、"表结构"等指代性表达，请使用上下文中提到的表名。`;
  }

  /**
   * 从 AI 回复中提取表名
   * AI 会在回复末尾附上 [[TABLE:表名]] 格式的标记
   */
  private extractTableNameFromResponse(output: string): { tableName: string; cleanOutput: string } {
    const match = output.match(/\[\[TABLE:(\w+)\]\]/);
    if (match) {
      return {
        tableName: match[1],
        // 移除标记，返回干净的输出给用户
        cleanOutput: output.replace(/\s*\[\[TABLE:\w+\]\]\s*/, '').trim(),
      };
    }
    return { tableName: '', cleanOutput: output };
  }

  /**
   * 格式化响应
   */
  private formatResponse(result: any, context: any): AgentResponse {
    const intermediateSteps = result.intermediateSteps || [];
    let data: any = null;
    let columns: string[] = [];
    let toolUsed = '';
    let tableName = '';
    let rowCount = 0;

    // 🔥 从 AI 回复中提取表名（AI 会在末尾附上 [[TABLE:表名]]）
    const { tableName: extractedTable, cleanOutput } = this.extractTableNameFromResponse(result.output || '');
    if (extractedTable) {
      tableName = extractedTable;
      console.log(`[MySQLToolAgent] 从 AI 回复中提取表名: ${tableName}`);
    }

    // 优先从缓存获取完整查询数据
    const cachedResult = getLastMySqlQueryResult();
    if (cachedResult) {
      columns = cachedResult.columns;
      // 转换为对象数组格式，方便前端展示
      data = cachedResult.fullData.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
      rowCount = data.length;
      toolUsed = 'run_sql';
      console.log(`[MySQLToolAgent] 从缓存获取完整数据: ${rowCount} 条`);
      clearLastMySqlQueryResult();
    }

    // 解析中间步骤（获取工具执行结果）
    for (const step of intermediateSteps) {
      const toolName = step.action?.tool;
      const toolOutput = step.observation;

      if (toolOutput) {
        try {
          const parsed = JSON.parse(toolOutput);
          if (parsed.success) {
            toolUsed = toolUsed || toolName;
            if (parsed.tableName) tableName = tableName || parsed.tableName;
            if (parsed.tables) data = parsed.tables;
            if (parsed.affectedRows !== undefined) rowCount = parsed.affectedRows;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    const metadata = {
      dbType: 'mysql',
      table: tableName || context.lastTable || '',
      database: context.envId || '',
      rowCount,
      columns,
      displayType: 'table' as const,
      toolUsed,
    };

    console.log('[MySQLToolAgent] 最终 metadata:', metadata);

    return {
      type: data ? 'query_result' : 'tool_response',
      message: cleanOutput,  // 使用清理后的输出（不含 [[TABLE:xxx]]）
      data,
      metadata,
      suggestions: ['继续查询', '查看表结构', '导出数据'],
    };
  }
}

