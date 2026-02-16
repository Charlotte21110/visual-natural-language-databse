/**
 * Agent Router
 * 根据意图路由到对应的 Agent
 */
import { IntentType, IntentResult } from '../types/intent.js';
import { DataExplorerAgent } from '../agents/data-explorer-agent.js';
import { DocAssistantAgent } from '../agents/doc-assistant-agent.js';
import { FieldMutatorAgent } from '../agents/field-mutator-agent.js';
import { ChatOpenAI } from '@langchain/openai';
import { buildGeneralChatPrompt, generateContextualSuggestions } from '../prompts/general-chat.js';

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
  private llm: ChatOpenAI | null = null;

  constructor() {
    this.dataExplorerAgent = new DataExplorerAgent();
    this.docAssistantAgent = new DocAssistantAgent();
    this.fieldMutatorAgent = new FieldMutatorAgent();
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

    try {
      switch (intent.type) {
        case IntentType.QUERY_DATABASE:
          return await this.dataExplorerAgent.execute(message, intent.params, context);

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
          // TODO: 实现 DataAnalyzerAgent
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
