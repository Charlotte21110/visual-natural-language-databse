/**
 * Database Tools
 * LangChain Tool 定义 - 数据库操作工具集
 *
 * 🔥 LangChain v1 新写法：使用 tool() + Zod Schema
 * - 自动类型推断
 * - 运行时参数校验
 * - 更好的 IDE 提示
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCloudBaseClient } from '../clients/cloudbase-client.js';

// ==================== Zod Schemas ====================

/** 查询集合输入 Schema */
const QueryCollectionSchema = z.object({
  envId: z.string().describe('CloudBase 环境 ID'),
  collection: z.string().describe('集合/表名称'),
  where: z.record(z.any()).optional().describe('查询条件，MongoDB 语法'),
  limit: z.number().optional().default(100).describe('返回数量'),
  skip: z.number().optional().default(0).describe('跳过数量'),
  orderBy: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  }).optional().describe('排序'),
});

/** 插入文档输入 Schema */
const InsertDocumentSchema = z.object({
  envId: z.string().describe('CloudBase 环境 ID'),
  collection: z.string().describe('集合/表名称'),
  data: z.record(z.any()).describe('要插入的文档数据'),
});

/** 更新文档输入 Schema */
const UpdateDocumentsSchema = z.object({
  envId: z.string().describe('CloudBase 环境 ID'),
  collection: z.string().describe('集合/表名称'),
  where: z.record(z.any()).describe('更新条件'),
  data: z.record(z.any()).describe('要更新的字段和值'),
});

/** 统计数量输入 Schema */
const CountDocumentsSchema = z.object({
  envId: z.string().describe('CloudBase 环境 ID'),
  collection: z.string().describe('集合/表名称'),
  where: z.record(z.any()).optional().describe('统计条件'),
});

// ==================== Tools ====================

/**
 * 查询集合工具
 * 🔥 新写法：参数自动有类型！
 */
export const queryCollectionTool = tool(
  async ({ envId, collection, where, limit = 100, skip = 0, orderBy }) => {
    try {
      const cloudbase = getCloudBaseClient();
      console.log('[Tool: query_collection] 执行查询:', { envId, collection, where });

      const data = await cloudbase.queryCollection(collection, {
        envId,
        where,
        limit,
        skip,
        orderBy,
      });

      return JSON.stringify({
        success: true,
        collection,
        count: data.length,
        data,
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: 'query_collection',
    description: '查询 FlexDB 数据库集合。支持条件筛选、排序、分页。',
    schema: QueryCollectionSchema,
  }
);

/**
 * 插入文档工具
 */
export const insertDocumentTool = tool(
  async ({ envId, collection, data }) => {
    try {
      const cloudbase = getCloudBaseClient();
      console.log('[Tool: insert_document] 插入文档:', { envId, collection, data });

      const result = await cloudbase.insertDocument(envId, collection, data);

      return JSON.stringify({
        success: true,
        collection,
        insertedId: result.id,
        data,
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: 'insert_document',
    description: '向 FlexDB 集合中插入一条新文档。',
    schema: InsertDocumentSchema,
  }
);

/**
 * 更新文档工具
 */
export const updateDocumentsTool = tool(
  async ({ envId, collection, where, data }) => {
    try {
      const cloudbase = getCloudBaseClient();
      console.log('[Tool: update_documents] 更新文档:', { envId, collection, where, data });

      const result = await cloudbase.updateDocuments(envId, collection, where, data);

      return JSON.stringify({
        success: true,
        collection,
        updatedCount: result.updated,
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: 'update_documents',
    description: '更新 FlexDB 集合中的文档，支持批量更新。',
    schema: UpdateDocumentsSchema,
  }
);

/**
 * 统计数量工具
 */
export const countDocumentsTool = tool(
  async ({ envId, collection, where }) => {
    try {
      const cloudbase = getCloudBaseClient();
      console.log('[Tool: count_documents] 统计数量:', { envId, collection, where });

      const count = await cloudbase.count(collection, where);

      return JSON.stringify({
        success: true,
        collection,
        count,
      });
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: 'count_documents',
    description: '统计 FlexDB 集合中的文档数量。',
    schema: CountDocumentsSchema,
  }
);

/**
 * 导出所有数据库工具
 */
export const databaseTools = [
  queryCollectionTool,
  insertDocumentTool,
  updateDocumentsTool,
  countDocumentsTool,
];

