/**
 * Agent Router
 * 根据意图路由到对应的 Agent
 *
 * 🔥 新增：Tool-based Agent 模式
 * - 数据库操作使用 ToolAgent（AI 自动选择工具和生成参数）
 * - MySQL 操作使用 MySQLToolAgent
 * - 其他操作保持原有方式
 */
import { IntentType, IntentResult } from '../types/intent.js';
import { DataExplorerAgent } from '../agents/data-explorer-agent.js';
import { DocAssistantAgent } from '../agents/doc-assistant-agent.js';
import { FieldMutatorAgent } from '../agents/field-mutator-agent.js';
import { DocumentManagerAgent } from '../agents/document-manager-agent.js';
import { ToolAgent } from '../agents/tool-agent.js';
import { MySQLToolAgent } from '../agents/mysql-tool-agent.js';
import { ChatOpenAI } from '@langchain/openai';
import { buildGeneralChatPrompt, generateContextualSuggestions } from '../prompts/general-chat.js';

// 是否启用 Tool Agent 模式（可通过环境变量控制）
const USE_TOOL_AGENT = process.env.USE_TOOL_AGENT !== 'false';
// 是否启用 MySQL Tool Agent（可通过环境变量控制）
const USE_MYSQL_AGENT = process.env.USE_MYSQL_AGENT !== 'false';

export interface AgentResponse {
  type: string;
  message: string;
  data?: any;
  metadata?: Record<string, any>;
  suggestions?: string[];
}

export class AgentRouter {
  private dataExplorerAgent: DataExplorerAgent;
  private docAssistantAgent: DocAssistantAgent;
  private fieldMutatorAgent: FieldMutatorAgent;
  private documentManagerAgent: DocumentManagerAgent;
  private toolAgent: ToolAgent;
  private mysqlToolAgent: MySQLToolAgent;  // 🔥 MySQL Agent
  private llm: ChatOpenAI | null = null;

  constructor() {
    this.dataExplorerAgent = new DataExplorerAgent();
    this.docAssistantAgent = new DocAssistantAgent();
    this.fieldMutatorAgent = new FieldMutatorAgent();
    this.documentManagerAgent = new DocumentManagerAgent();
    this.toolAgent = new ToolAgent();
    this.mysqlToolAgent = new MySQLToolAgent();  // 🔥 MySQL Agent

    console.log('[AgentRouter] Tool Agent 模式:', USE_TOOL_AGENT ? '已启用' : '已禁用');
    console.log('[AgentRouter] MySQL Agent 模式:', USE_MYSQL_AGENT ? '已启用' : '已禁用');
  }

  private getLLM(): ChatOpenAI {
    if (!this.llm) {
      this.llm = new ChatOpenAI({
        modelName: process.env.LLM_MODEL || 'qwen3-max',
        temperature: 0.7, // 对话模式，温度稍高
        configuration: {
          baseURL: process.env.LLM_BASE_URL,
          apiKey: process.env.LLM_API_KEY,
        },
      });
    }
    return this.llm;
  }

  /**
   * 处理普通对话（使用 LLM 生成回复，支持上下文）
   */
  private async handleGeneralChat(message: string, context: any): Promise<AgentResponse> {
    try {
      // 使用统一的提示词配置
      const prompt = buildGeneralChatPrompt(message, context);

      const llm = this.getLLM();
      const response = await llm.invoke(prompt);
      
      return {
        type: 'general_chat',
        message: (response.content as string).trim(),
        suggestions: generateContextualSuggestions(context),
      };
    } catch (error: any) {
      console.error('[Agent Router] General chat error:', error);
      // 降级：返回固定回复
      return {
        type: 'general_chat',
        message: '你好！我是 Natural Language DB 助手。我可以帮你查询数据库、分析数据、回答文档问题。请告诉我你想做什么？',
        suggestions: generateContextualSuggestions(context),
      };
    }
  }

  /**
   * 路由到对应的 Agent
   */
  async route(
    intent: IntentResult,
    message: string,
    context: any
  ): Promise<AgentResponse> {
    console.log(`[Agent Router] Routing to ${intent.type}`);

    if (!intent.params.envId && context.envId) {
      intent.params.envId = context.envId;
      console.log('[Agent Router] 注入 envId:', context.envId);
    }

    try {
      // 🔥 数据库相关操作：根据 dbType 选择对应的 Agent
      const dbOperations = [
        IntentType.QUERY_DATABASE,
        IntentType.INSERT_DOCUMENT,
        IntentType.MODIFY_FIELD,
        IntentType.ANALYZE_DATA,
        IntentType.CREATE_COLLECTION,  // 🔥 新增：创建表
        IntentType.DELETE_COLLECTION,  // 🔥 新增：删除表
      ];

      if (dbOperations.includes(intent.type)) {
        const dbType = intent.params.dbType || context.dbType || 'flexdb';

        // 🔥 MySQL 操作：使用 MySQLToolAgent
        if (USE_MYSQL_AGENT && dbType === 'mysql') {
          console.log('[AgentRouter] 使用 MySQLToolAgent 处理 MySQL 操作');
          return await this.mysqlToolAgent.execute(message, context);
        }

        // FlexDB/MongoDB 操作：使用 ToolAgent
        if (USE_TOOL_AGENT) {
          console.log('[AgentRouter] 使用 ToolAgent 处理 FlexDB 操作');
          return await this.toolAgent.execute(message, context);
        }
      }

      // 降级到原有 Agent 或处理其他意图
      switch (intent.type) {
        case IntentType.QUERY_DATABASE:
          // 仅当 USE_TOOL_AGENT=false 时走这里
          return await this.dataExplorerAgent.execute(message, intent.params, context);

        case IntentType.INSERT_DOCUMENT:
          return await this.documentManagerAgent.execute(message, intent.params, context);

        case IntentType.MODIFY_FIELD:
          return await this.fieldMutatorAgent.execute(message, intent.params, context);

        case IntentType.CREATE_COLLECTION:
          // TODO: 实现 SchemaDesignerAgent
          return {
            type: 'not_implemented',
            message: '创建表功能正在开发中，敬请期待！',
            suggestions: ['查询数据', '文档问答'],
          };

        case IntentType.DELETE_COLLECTION:
          // TODO: 实现 SchemaDesignerAgent
          return {
            type: 'not_implemented',
            message: '删除表功能需要谨慎操作，暂未开放',
            suggestions: ['查询数据', '查看表结构'],
          };

        case IntentType.ANALYZE_DATA:
          // 仅当 USE_TOOL_AGENT=false 时走这里
          return {
            type: 'not_implemented',
            message: '数据分析功能正在开发中，敬请期待！',
            suggestions: ['先查询数据', '查看表内容'],
          };

        case IntentType.DOC_QUESTION:
          return await this.docAssistantAgent.execute(message, intent.params, context);

        case IntentType.GENERAL_CHAT:
          // 🔥 使用 LLM 生成灵活的回复（支持上下文）
          return await this.handleGeneralChat(message, context);

        default:
          return {
            type: 'unknown',
            message: '抱歉，我不太理解你的意图。可以换个方式描述吗？',
            suggestions: ['查询数据表', '文档问答', '数据分析'],
          };
      }
    } catch (error: any) {
      console.error('[Agent Router Error]', error);
      return {
        type: 'error',
        message: `执行失败: ${error.message}`,
        metadata: { error: error.stack },
      };
    }
  }
}
