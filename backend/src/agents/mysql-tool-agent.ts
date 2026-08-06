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
import { generateText } from '../services/codebuddy-llm.js';
import { mysqlTools, getLastMySqlQueryResult, clearLastMySqlQueryResult, setMySqlEnvId, setMySqlAuth } from '../tools/mysql-tools.js';
import { AgentResponse } from '../services/agent-router.js';
import { getCapiClient } from '../clients/capi-client.js';
import { MYSQL_REACT_SYSTEM_PROMPT } from '../prompts/mysql-agent.js';

export class MySQLToolAgent {
  constructor() {
    console.log('[MySQLToolAgent] 初始化完成（CodeBuddy LLM 模式）');
  }

  /**
   * 执行用户请求
   */
  async execute(message: string, context: any): Promise<AgentResponse> {
    try {
      const envId = context.envId || process.env.TCB_ENV_ID || '';

      const capiClient = getCapiClient();
      const cookie = capiClient.getCookie();
      const token = capiClient.getToken();

      setMySqlEnvId(envId);
      setMySqlAuth(cookie, token);

      console.log('[MySQLToolAgent] 执行请求:', { message, envId, hasCookie: !!cookie });

      const messageWithContext = this.buildMessageWithContext(message, context);

      // 使用 CodeBuddy LLM 生成 SQL 建议
      const response = await generateText(
        `${MYSQL_REACT_SYSTEM_PROMPT}\n\n用户请求：${messageWithContext}\n\n请分析用户需求并给出SQL建议和执行方案。`
      );

      return {
        type: 'tool_response',
        message: response,
        suggestions: ['继续查询', '查看表结构', '导出数据'],
      };
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

