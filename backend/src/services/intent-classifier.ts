/**
 * Intent Classifier
 * 使用 LangChain v1 的 withStructuredOutput 进行意图分类
 */
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { buildIntentClassificationPrompt, FALLBACK_RULES } from '../prompts/intent-classification.js';
import { IntentType, IntentResult } from '../types/intent.js';

// 重新导出类型，方便其他模块使用
export { IntentType, IntentResult };

// 定义意图分类的 Zod Schema (用于 Structured Output)
const IntentClassificationSchema = z.object({
  type: z.enum([
    'QUERY_DATABASE',
    'MODIFY_FIELD',
    'CREATE_COLLECTION',
    'DELETE_COLLECTION',
    'INSERT_DOCUMENT',
    'DELETE_DOCUMENT',
    'ANALYZE_DATA',
    'DOC_QUESTION',
    'GENERAL_CHAT',
  ]).describe('意图类型'),
  confidence: z.number().min(0).max(1).describe('置信度 0-1'),
  params: z.record(z.any()).describe('提取的参数'),
});

// 从 Zod Schema 推断类型
type IntentClassificationOutput = z.infer<typeof IntentClassificationSchema>;

export class IntentClassifier {
  private llm: ChatOpenAI | null = null;
  private structuredLLM: ReturnType<ChatOpenAI['withStructuredOutput']> | null = null;

  constructor() {
    // 懒加载，只在第一次使用时初始化
  }

  private getStructuredLLM() {
    if (!this.structuredLLM) {
      // 创建 LLM
      this.llm = new ChatOpenAI({
        modelName: process.env.LLM_MODEL || 'qwen-plus',
        temperature: 0.1,
        configuration: {
          baseURL: process.env.LLM_BASE_URL,
          apiKey: process.env.LLM_API_KEY,
        },
      });

      // 🔥 LangChain v1 新特性：withStructuredOutput
      // 绑定 Zod Schema，LLM 返回值自动是强类型
      this.structuredLLM = this.llm.withStructuredOutput(IntentClassificationSchema);
    }
    return this.structuredLLM;
  }

  /**
   * 分类用户意图 - 使用 LangChain 的 withStructuredOutput
   */
  async classify(message: string, context?: any): Promise<IntentResult> {
    const promptText = buildIntentClassificationPrompt(message, context);

    console.log('[IntentClassifier] 开始分析:', { message, hasContext: !!context });

    try {
      const structuredLLM = this.getStructuredLLM();

      // 🔥 直接调用，返回值自动是结构化的！
      const output = await structuredLLM.invoke(promptText) as IntentClassificationOutput;

      const classificationResult: IntentResult = {
        type: output.type as IntentType,
        confidence: output.confidence,
        params: output.params,
      };

      console.log('[IntentClassifier] 识别成功:', {
        type: classificationResult.type,
        params: classificationResult.params,
        confidence: classificationResult.confidence,
      });

      return classificationResult;
    } catch (error: any) {
      console.error('[IntentClassifier] LLM 调用失败，使用降级方案:', error.message);
      // 降级：使用简单的关键词匹配
      return this.fallbackClassify(message);
    }
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

    if (FALLBACK_RULES.queryPatterns.test(msg)) {
      return {
        type: IntentType.QUERY_DATABASE,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (FALLBACK_RULES.modifyPatterns.test(msg)) {
      return {
        type: IntentType.MODIFY_FIELD,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (FALLBACK_RULES.createPatterns.test(msg)) {
      return {
        type: IntentType.CREATE_COLLECTION,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (FALLBACK_RULES.deletePatterns.test(msg)) {
      return {
        type: IntentType.DELETE_COLLECTION,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (FALLBACK_RULES.analyzePatterns.test(msg)) {
      return {
        type: IntentType.ANALYZE_DATA,
        confidence: 0.7,
        params: this.extractParams(message),
      };
    }

    if (FALLBACK_RULES.docPatterns.test(msg)) {
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
   * 提取参数（增强版）
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
    } else {
      params.dbType = 'flexdb'; // 默认
    }

    // 提取表名（增强正则，支持更多模式）
    const tableMatch = message.match(
      /给\s*([\w-]+)\s*表|表\s*[：:"]?\s*([\w-]+)|([\w-]+)\s*表|表的内容\s*([\w-]+)|查询\s*([\w-]+)|集合\s*([\w-]+)|([\w-]+)\s*集合/
    );
    if (tableMatch) {
      params.table = tableMatch[1] || tableMatch[2] || tableMatch[3] || tableMatch[4] || tableMatch[5] || tableMatch[6] || tableMatch[7];
    }

    // 提取环境ID
    const envIdMatch = message.match(/环境\s*ID\s*[是为:]?\s*([\w-]+)|envId\s*[是为:]?\s*([\w-]+)|env-id\s*[：:]\s*([\w-]+)/i);
    if (envIdMatch) {
      params.envId = envIdMatch[1] || envIdMatch[2] || envIdMatch[3];
    }

    // 🔥 关键：提取数据参数
    // 优先识别多键值对（用于 INSERT_DOCUMENT）
    const multiFieldMatch = message.match(/(?:内容是|数据是)?\s*([\w-]+)\s*[：:]\s*([^\s,，]+)(?:\s*[,，]\s*([\w-]+)\s*[：:]\s*([^\s,，]+))+/);
    if (multiFieldMatch) {
      // 多个键值对 → INSERT_DOCUMENT
      const dataObj: Record<string, any> = {};
      // 提取所有 key:value 对
      const pairs = message.match(/([\w-]+)\s*[：:]\s*([^\s,，]+)/g);
      if (pairs) {
        pairs.forEach(pair => {
          const [key, value] = pair.split(/[：:]/);
          dataObj[key.trim()] = value.trim();
        });
        params.data = dataObj;
      }
    } else {
      // 单个键值对 → MODIFY_FIELD 或 INSERT_DOCUMENT（根据意图判断）
      const fieldValueMatch = message.match(/([\w-]+)\s*[：:]\s*([^\s,，]+)/);
      if (fieldValueMatch) {
        // 如果用户明确说"文档"或"记录"，提取为 data
        if (/文档|记录|一条/i.test(message)) {
          params.data = {
            [fieldValueMatch[1]]: fieldValueMatch[2]
          };
        } else {
          // 否则提取为 field/defaultValue（用于 MODIFY_FIELD）
          params.field = fieldValueMatch[1];
          params.defaultValue = fieldValueMatch[2];
          
          // 判断操作类型
          if (/加字段|新增字段|添加字段/i.test(message)) {
            params.action = 'add_field';
          }
        }
      }
    }

    // 识别重命名操作
    const renameMatch = message.match(/([\w-]+)\s*字段\s*(?:改名|重命名|改为|改成)\s*([\w-]+)/);
    if (renameMatch) {
      params.field = renameMatch[1];
      params.newName = renameMatch[2];
      params.action = 'rename';
    }

    // 识别类型修改
    const typeChangeMatch = message.match(/([\w-]+)\s*字段\s*(?:改成|改为|修改为|类型改为)\s*([\w-]+)/);
    if (typeChangeMatch) {
      params.field = typeChangeMatch[1];
      params.newType = typeChangeMatch[2];
      params.action = 'change_type';
    }

    return params;
  }
}
