/**
 * LLM 统一配置中心
 *
 * 所有大模型相关的配置（地址、Key、模型名、Embedding 模型）集中在这里。
 * 业务层不要再各自读 process.env.LLM_XXX，统一通过本模块获取。
 *
 * 换模型 / 换中转站 / 换 Key 时，改这里（或 .env）一处即可全局生效。
 */
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';

export const LLM_CONFIG = {
  baseURL: process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: process.env.LLM_API_KEY || '',
  /** 对话/生成模型 */
  model: process.env.LLM_MODEL || 'qwen3-max',
  /** 向量模型（Embedding），用于 RAG 文档检索 */
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-v3',
};

export interface CreateChatModelOptions {
  /** 采样温度，默认 0.1 */
  temperature?: number;
}

/**
 * 创建一个 ChatOpenAI 实例（统一走配置中心的 baseURL / apiKey / model）
 */
export function createChatModel(options: CreateChatModelOptions = {}): ChatOpenAI {
  const { temperature = 0.1 } = options;
  return new ChatOpenAI({
    modelName: LLM_CONFIG.model,
    temperature,
    configuration: {
      baseURL: LLM_CONFIG.baseURL,
      apiKey: LLM_CONFIG.apiKey,
    },
  });
}

/**
 * 创建一个 OpenAIEmbeddings 实例（向量模型，用于 RAG）
 */
export function createEmbeddings(): OpenAIEmbeddings {
  return new OpenAIEmbeddings({
    modelName: LLM_CONFIG.embeddingModel,
    openAIApiKey: LLM_CONFIG.apiKey,
    batchSize: 10,
    configuration: {
      baseURL: LLM_CONFIG.baseURL,
    },
  });
}
