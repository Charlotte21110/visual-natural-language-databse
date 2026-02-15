/**
 * Agent Router
 * 根据意图路由到对应的 Agent
 */
import { IntentResult, IntentType } from './intent-classifier.js';
import { DataExplorerAgent } from '../agents/data-explorer-agent.js';
import { DocAssistantAgent } from '../agents/doc-assistant-agent.js';
import { FieldMutatorAgent } from '../agents/field-mutator-agent.js';

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

  constructor() {
    this.dataExplorerAgent = new DataExplorerAgent();
    this.docAssistantAgent = new DocAssistantAgent();
    this.fieldMutatorAgent = new FieldMutatorAgent();
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
          return {
            type: 'general_chat',
            message: '你好！我是 Natural Language DB 助手。我可以帮你查询数据库、分析数据、回答文档问题。请告诉我你想做什么？',
            suggestions: [
              '查询 flexdb 的 users 表',
              '如何连接 MongoDB',
              '创建一个数据模型',
            ],
          };

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
