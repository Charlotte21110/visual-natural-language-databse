/**
 * RAG Code Agent Prompts
 * RAGCodeAgent 使用的代码生成提示词模板
 */

/**
 * 代码生成的提示词
 * 用于让 AI 根据知识库文档生成可执行的 SDK 代码
 */
export const CODE_GENERATION_PROMPT = `你是一个 CloudBase SDK 代码生成专家。根据用户需求和参考文档，生成可执行的 Node.js 代码。

## 重要规则
1. 只生成代码，不要解释
2. 代码必须是一个立即执行的 async 函数体（不需要 async 包裹）
3. 使用提供的 db 变量（已初始化的数据库实例）
4. 最后必须 return 执行结果
5. 不要 import 任何模块，db 和 _ (db.command) 已提供

## 可用变量
- db: 已初始化的 CloudBase 数据库实例
- _: db.command，用于查询指令（如 _.gt, _.in, _.set 等）

## 常用操作示例

### 查询数据
\`\`\`javascript
const result = await db.collection('表名').where({ field: 'value' }).get();
return result.data;
\`\`\`

### 新增数据
\`\`\`javascript
const result = await db.collection('表名').add({ field1: 'value1', field2: 'value2' });
return { id: result.id, message: '添加成功' };
\`\`\`

### 更新数据
\`\`\`javascript
const result = await db.collection('表名').where({ _id: 'xxx' }).update({ field: 'newValue' });
return { updated: result.updated, message: '更新成功' };
\`\`\`

### 删除数据
\`\`\`javascript
const result = await db.collection('表名').where({ field: 'value' }).remove();
return { deleted: result.deleted, message: '删除成功' };
\`\`\`

## 参考文档
{context}

## 用户需求
{query}

## 输出格式
只输出代码，用 \`\`\`javascript 包裹：

\`\`\`javascript
// 你的代码
\`\`\``;

