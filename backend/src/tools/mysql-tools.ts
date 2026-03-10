/**
 * MySQL Tools
 * LangChain Tool 定义 - MySQL 数据库操作工具集
 *
 * 🔥 简化设计：大模型只负责生成 SQL 语句，envId 和 cookie 由代码自动注入
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMySqlClient } from '../clients/mysql-client.js';

// 传给大模型的预览数量
const PREVIEW_COUNT = 3;

// 当前环境配置（由 Agent 在执行前设置）
let currentEnvId: string = '';
let currentCookie: string = '';
let currentToken: string = '';

/** 设置当前环境 ID */
export function setMySqlEnvId(envId: string) {
  currentEnvId = envId;
}

/** 设置当前 Cookie 和 Token（用于接口调用） */
export function setMySqlAuth(cookie: string, token?: string) {
  currentCookie = cookie;
  currentToken = token || '';
}

// 缓存最后一次查询的完整数据
let lastMySqlQueryResult: {
  sql: string;
  columns: string[];
  fullData: any[][];
  timestamp: number;
} | null = null;

/** 获取最后一次 MySQL 查询结果 */
export function getLastMySqlQueryResult() {
  return lastMySqlQueryResult;
}

/** 清除 MySQL 查询缓存 */
export function clearLastMySqlQueryResult() {
  lastMySqlQueryResult = null;
}

// 🔥 Zod Schema 定义工具输入
const RunSqlInputSchema = z.object({
  sql: z.string().describe('要执行的 SQL 语句'),
});

/**
 * 执行 SQL 工具
 * 🔥 LangChain v1 新写法：tool() + Zod Schema
 */
export const runSqlTool = tool(
  async ({ sql }) => {
    try {
      // sql 已经是字符串类型，Zod 自动校验过了
      const cleanSql = sql.trim();

      if (!currentEnvId) {
        return JSON.stringify({ success: false, error: '环境 ID 未设置' });
      }

      if (!currentCookie) {
        return JSON.stringify({ success: false, error: 'Cookie 未设置' });
      }

      console.log('[Tool: run_sql] 执行 SQL:', { envId: currentEnvId, sql: cleanSql });
      const mysqlClient = getMySqlClient();
      const result = await mysqlClient.runSql(
        { envId: currentEnvId, sql: cleanSql },
        { cookie: currentCookie, token: currentToken }
      );

      // 判断是否是查询操作
      const isQuery = cleanSql.toUpperCase().startsWith('SELECT');

      if (isQuery) {
        const columnNames = result.columnNames || [];
        const rows = result.rows || [];

        // 缓存完整数据
        lastMySqlQueryResult = {
          sql: cleanSql,
          columns: columnNames,
          fullData: rows,
          timestamp: Date.now(),
        };

        // 只传前 N 条给大模型
        const previewRows = rows.slice(0, PREVIEW_COUNT);

        return JSON.stringify({
          success: true,
          type: 'query',
          totalCount: rows.length,
          columns: columnNames,
          preview: previewRows,
          hint: rows.length > PREVIEW_COUNT
            ? `共 ${rows.length} 条数据，已展示前 ${PREVIEW_COUNT} 条`
            : undefined,
        });
      } else {
        return JSON.stringify({
          success: true,
          type: 'execute',
          affectedRows: result.affectedRows,
          message: result.message || 'SQL 执行成功',
        });
      }
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  },
  {
    name: 'run_sql',
    description: `执行 MySQL SQL 语句。支持所有 SQL 操作：SELECT / CREATE TABLE / INSERT / UPDATE / DELETE / ALTER 等。
示例：
- SELECT * FROM users WHERE age > 20
- CREATE TABLE users (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100))
- INSERT INTO users (name, age) VALUES ('张三', 25)`,
    schema: RunSqlInputSchema,
  }
);

/** 导出所有 MySQL 工具 */
export const mysqlTools = [
  runSqlTool,  // 唯一的工具：执行任意 SQL
];

