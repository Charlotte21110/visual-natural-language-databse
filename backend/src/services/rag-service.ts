/**
 * RAG Service - 文档检索增强生成服务
 */
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';

interface RetrievalResult {
  content: string;
  source: string;
  score: number;
}

interface RAGAnswer {
  answer: string;
  sources: Array<{ title: string; content: string; score: number }>;
}

export class RAGService {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OpenAIEmbeddings | null = null;
  private llm: ChatOpenAI | null = null;
  private initialized = false;
  private docsPath: string;

  constructor(docsPath?: string) {
    this.docsPath = docsPath || path.join(process.cwd(), 'docs');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    console.log('[RAGService] 开始初始化...');

    this.embeddings = new OpenAIEmbeddings({
      modelName: process.env.EMBEDDING_MODEL || 'text-embedding-v3',
      openAIApiKey: process.env.LLM_API_KEY,
      batchSize: 10, // 阿里百炼 API 限制每批最多 10 条
      configuration: {
        baseURL: process.env.LLM_BASE_URL,
      },
    });

    this.llm = new ChatOpenAI({
      modelName: process.env.LLM_MODEL || 'qwen-plus',
      temperature: 0.3,
      configuration: {
        baseURL: process.env.LLM_BASE_URL,
        apiKey: process.env.LLM_API_KEY,
      },
    });

    await this.loadAndIndexDocuments();
    this.initialized = true;
    console.log('[RAGService] 初始化完成');
  }

  private async loadAndIndexDocuments(): Promise<void> {
    console.log('[RAGService] 加载文档:', this.docsPath);
    const documents = await this.loadMarkdownFiles(this.docsPath);
    console.log('[RAGService] 找到', documents.length, '个文档');

    if (documents.length === 0) {
      this.vectorStore = await MemoryVectorStore.fromDocuments([], this.embeddings!);
      return;
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    const splitDocs = await splitter.splitDocuments(documents);
    console.log('[RAGService] 分割成', splitDocs.length, '个文档块');

    this.vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, this.embeddings!);
  }

  private async loadMarkdownFiles(dirPath: string): Promise<Document[]> {
    const docs: Document[] = [];
    if (!fs.existsSync(dirPath)) return docs;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        docs.push(...await this.loadMarkdownFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        docs.push(new Document({
          pageContent: content,
          metadata: { source: path.relative(this.docsPath, fullPath) },
        }));
      }
    }
    return docs;
  }

  async retrieve(query: string, topK = 3): Promise<RetrievalResult[]> {
    if (!this.vectorStore) await this.initialize();
    const results = await this.vectorStore!.similaritySearchWithScore(query, topK);
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      source: doc.metadata.source || 'unknown',
      score: 1 - score,
    }));
  }

  async answer(question: string): Promise<RAGAnswer> {
    if (!this.llm) await this.initialize();
    const docs = await this.retrieve(question, 5);

    if (docs.length === 0) {
      return { answer: '抱歉，文档中没有找到相关信息。', sources: [] };
    }

    const context = docs.map((d, i) => '[' + (i + 1) + '] ' + d.source + '\n' + d.content).join('\n---\n');
    const prompt = '根据以下文档回答问题。\n\n文档：\n' + context + '\n\n问题：' + question + '\n\n回答：';

    const response = await this.llm!.invoke(prompt);
    const answer = typeof response.content === 'string' ? response.content : String(response.content);

    return {
      answer,
      sources: docs.slice(0, 3).map(d => ({
        title: d.source,
        content: d.content.slice(0, 100) + '...',
        score: d.score,
      })),
    };
  }
}

let instance: RAGService | null = null;
export function getRAGService(): RAGService {
  if (!instance) instance = new RAGService();
  return instance;
}
