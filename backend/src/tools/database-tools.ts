/**
 * Database Tools
 * LangChain Tool 定义 - 数据库操作工具集
 *
 * 用法：AI 会根据用户的自然语言自动选择合适的工具并生成参数
 *
 * 注意：为避免 TypeScript 类型推断过深导致编译内存溢出，
 * 使用 DynamicTool 而不是带复杂 Zod schema 的 tool()
 */
import { DynamicTool } from '@langchain/core/tools';
import { getCloudBaseClient } from '../clients/cloudbase-client.js';

/**
 * 查询集合工具
 *
 * 用户说 "查询 users 表中 age > 18 的数据"
 * → AI 自动生成 JSON 参数
 */
export const queryCollectionTool = new DynamicTool({
  name: 'query_collection',
  description: `查询 FlexDB 数据库集合。支持条件筛选、排序、分页。
输入必须是 JSON 字符串，格式：
{
  "envId": "CloudBase 环境 ID (必填)",
  "collection": "集合/表名称 (必填)",
  "where": { "字段": "值" 或 { "$gt": 18 } } (可选，MongoDB 查询语法),
  "limit": 100 (可选，返回数量),
  "skip": 0 (可选，跳过数量),
  "orderBy": { "field": "字段名", "direction": "asc 或 desc" } (可选)
}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const cloudbase = getCloudBaseClient();
      const { envId, collection, where, limit = 100, skip = 0, orderBy } = params;

      console.log('[Tool: query_collection] 执行查询:', params);

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
});

/**
 * 插入文档工具
 */
export const insertDocumentTool = new DynamicTool({
  name: 'insert_document',
  description: `向 FlexDB 集合中插入一条新文档。
输入必须是 JSON 字符串，格式：
{
  "envId": "CloudBase 环境 ID (必填)",
  "collection": "集合/表名称 (必填)",
  "data": { "字段1": "值1", "字段2": "值2" } (必填，要插入的文档)
}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const cloudbase = getCloudBaseClient();
      const { envId, collection, data } = params;

      console.log('[Tool: insert_document] 插入文档:', params);
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
});

/**
 * 更新文档工具
 */
export const updateDocumentsTool = new DynamicTool({
  name: 'update_documents',
  description: `更新 FlexDB 集合中的文档，支持批量更新。
输入必须是 JSON 字符串，格式：
{
  "envId": "CloudBase 环境 ID (必填)",
  "collection": "集合/表名称 (必填)",
  "where": { "_id": "xxx" } (必填，更新条件),
  "data": { "字段": "新值" } (必填，要更新的字段和值)
}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const cloudbase = getCloudBaseClient();
      const { envId, collection, where, data } = params;

      console.log('[Tool: update_documents] 更新文档:', params);
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
});

/**
 * 统计数量工具
 */
export const countDocumentsTool = new DynamicTool({
  name: 'count_documents',
  description: `统计 FlexDB 集合中的文档数量。
输入必须是 JSON 字符串，格式：
{
  "envId": "CloudBase 环境 ID (必填)",
  "collection": "集合/表名称 (必填)",
  "where": { "字段": "值" } (可选，统计条件)
}`,
  func: async (input: string) => {
    try {
      const params = JSON.parse(input);
      const cloudbase = getCloudBaseClient();
      const { collection, where } = params;

      console.log('[Tool: count_documents] 统计数量:', params);
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
});

/**
 * 导出所有数据库工具
 */
export const databaseTools = [
  queryCollectionTool,
  insertDocumentTool,
  updateDocumentsTool,
  countDocumentsTool,
];

