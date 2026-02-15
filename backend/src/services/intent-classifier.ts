/**
 * Intent Classifier
 * 使用大模型进行意图分类
 */
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// 定义意图类型
export enum IntentType {
  QUERY_DATABASE = 'QUERY_DATABASE',           // 查询数据库
  MODIFY_FIELD = 'MODIFY_FIELD',               // 修改字段
  CREATE_COLLECTION = 'CREATE_COLLECTION',     // 创建集合/表
  DELETE_COLLECTION = 'DELETE_COLLECTION',     // 删除集合/表
  ANALYZE_DATA = 'ANALYZE_DATA',               // 分析数据
  DOC_QUESTION = 'DOC_QUESTION',               // 文档问答
  GENERAL_CHAT = 'GENERAL_CHAT',               // 普通对话
}

// 意图分类结果
export interface IntentResult {
  type: IntentType;
  confidence: number;
  params: {
    dbType?: 'flexdb' | 'mysql' | 'mongodb';
    table?: string;
    database?: string;
    envId?: string;
    action?: string;
    [key: string]: any;
  };
}

export class IntentClassifier {
  private llm: ChatOpenAI;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: process.env.LLM_MODEL || 'qwen-plus',
      temperature: 0.1,
      configuration: {
        baseURL: process.env.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
      },
    });
  }

  /**
   * 分类用户意图
   */
  async classify(message: string, context?: any): Promise<IntentResult> {
    const prompt = this.buildClassificationPrompt(message, context);

    try {
      const response = await this.llm.invoke(prompt);
      const result = this.parseResponse(response.content as string);
      return result;
    } catch (error) {
      console.error('[Intent Classifier Error]', error);
      // 降级：使用简单的关键词匹配
      return this.fallbackClassify(message);
    }
  }

  private buildClassificationPrompt(message: string, context?: any): string {
    return `你是一个数据库自然语言交互系统的意图分类器。

用户输入: "${message}"

${context?.lastQuery ? `上一次查询: "${context.lastQuery}"` : ''}
${context?.envId ? `当前环境ID: ${context.envId}` : ''}

请分析用户意图，并输出 JSON 格式（仅输出 JSON，不要任何其他文字）：

{
  "type": "意图类型，可选值: QUERY_DATABASE, MODIFY_FIELD, CREATE_COLLECTION, DELETE_COLLECTION, ANALYZE_DATA, DOC_QUESTION, GENERAL_CHAT",
  "confidence": 0.95,
  "params": {
    "dbType": "flexdb|mysql|mongodb",
    "table": "表名",
    "database": "数据库名",
    "action": "具体操作"
  }
}

意图识别规则：
1. QUERY_DATABASE: 查询、查找、检索、显示、列出数据
2. MODIFY_FIELD: 修改、更改、调整字段
3. CREATE_COLLECTION: 创建、新建表/集合
4. DELETE_COLLECTION: 删除、移除表/集合
5. ANALYZE_DATA: 分析、统计、对比数据
6. DOC_QUESTION: 如何使用、SDK 怎么调用、文档问题
7. GENERAL_CHAT: 打招呼、闲聊

输出 JSON:`;
  }

  private parseResponse(content: string): IntentResult {
    try {
      // 提取 JSON（防止模型输出其他文字）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type as IntentType,
        confidence: parsed.confidence || 0.8,
        params: parsed.params || {},
      };
    } catch (error) {
      console.error('[Parse Error]', error);
      return this.fallbackClassify(content);
    }
  }

  /**
   * 降级方案：简单的关键词匹配
   */
  private fallbackClassify(message: string): IntentResult {
    const msg = message.toLowerCase();

    if (/查询|查找|检索|显示|列出|查看/.test(msg)) {
      return {
        type: IntentType.QUERY_DATABASE,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (/修改|更改|调整.*字段/.test(msg)) {
      return {
        type: IntentType.MODIFY_FIELD,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (/创建|新建/.test(msg)) {
      return {
        type: IntentType.CREATE_COLLECTION,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (/删除|移除/.test(msg)) {
      return {
        type: IntentType.DELETE_COLLECTION,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (/分析|统计|对比/.test(msg)) {
      return {
        type: IntentType.ANALYZE_DATA,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (/如何|怎么|文档|SDK/.test(msg)) {
      return {
        type: IntentType.DOC_QUESTION,
        confidence: 0.7,
        params: { question: message },
      };
    }

    return {
      type: IntentType.GENERAL_CHAT,
      confidence: 0.5,
      params: {},
    };
  }

  /**
   * 提取参数（简单版）
   */
  private extractParams(message: string): Record<string, any> {
    const params: Record<string, any> = {};

    // 提取数据库类型
    if (/flexdb/i.test(message)) {
      params.dbType = 'flexdb';
    } else if (/mysql/i.test(message)) {
      params.dbType = 'mysql';
    } else if (/mongo/i.test(message)) {
      params.dbType = 'mongodb';
    }

    // 提取表名（简单正则）
    const tableMatch = message.match(/表\s*[：:"]?\s*(\w+)|(\w+)\s*表/);
    if (tableMatch) {
      params.table = tableMatch[1] || tableMatch[2];
    }

    return params;
  }
}
