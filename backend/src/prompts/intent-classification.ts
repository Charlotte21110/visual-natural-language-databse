/**
 * Intent Classification Prompts
 * 意图分类提示词配置
 * 
 * 所有意图分类相关的提示词统一在这里管理
 */

import { IntentType } from '../types/intent.js';

/**
 * 意图类型的详细说明
 */
export const INTENT_DESCRIPTIONS = {
  [IntentType.QUERY_DATABASE]: {
    name: '数据查询',
    keywords: ['查询', '查找', '检索', '显示', '列出', '查看', '获取'],
    description: '用户想要查询、查找、检索、显示、列出数据库中的数据',
  },
  [IntentType.INSERT_DOCUMENT]: {
    name: '新增文档',
    keywords: ['新增文档', '添加文档', '插入文档', '加一条', '新增一条', '插入一条', '添加一条记录', '新增记录', '插入数据'],
    description: '用户想要往表里添加一条新记录（INSERT操作），注意：这是添加新的一行数据，不是给现有数据加字段！',
  },
  [IntentType.MODIFY_FIELD]: {
    name: '字段修改',
    keywords: ['加字段', '添加字段', '新增字段', '删除字段', '改名', '重命名', '改类型', '修改字段'],
    description: '用户想要修改表结构：给所有记录新增/删除/重命名字段，或修改字段类型（UPDATE操作）',
  },
  [IntentType.CREATE_COLLECTION]: {
    name: '创建表/集合',
    keywords: ['创建', '新建', '建表', '建集合'],
    description: '用户想要创建新的表或集合',
  },
  [IntentType.DELETE_COLLECTION]: {
    name: '删除表/集合',
    keywords: ['删除', '移除', '删表', '删集合'],
    description: '用户想要删除表或集合',
  },
  [IntentType.ANALYZE_DATA]: {
    name: '数据分析',
    keywords: ['分析', '统计', '对比', '汇总', '聚合'],
    description: '用户想要分析、统计、对比数据',
  },
  [IntentType.DOC_QUESTION]: {
    name: '文档问答',
    keywords: ['如何', '怎么', '文档', 'SDK', '怎样', '教程'],
    description: '用户想要了解如何使用 SDK、查看文档、学习教程',
  },
  [IntentType.GENERAL_CHAT]: {
    name: '普通对话',
    keywords: ['你好', '谢谢', '再见', '帮助'],
    description: '打招呼、闲聊、礼貌用语',
  },
};

/**
 * 参数提取规则
 */
export const PARAM_EXTRACTION_RULES = {
  // 通用参数
  common: `
通用参数提取：
- table: 表/集合名称
  * 从 "查询 XXX 表"、"XXX 集合"、"XXX 的数据"、"表 XXX"、"给 XXX 表" 中提取
  * 注意：表名通常是英文或拼音，如 users, test, orders
  
- dbType: 数据库类型
  * 提到 "flexdb" 或 "mongodb" → "flexdb"
  * 提到 "mysql" → "mysql"
  * 未提及则默认 "flexdb"
  
- envId: 环境ID
  * 从 "环境ID是 XXX"、"envId 是 XXX"、"env-id: XXX" 中提取
  
- 上下文指代：
  * "再查一下"、"刚才那个表" → 使用 context.lastTable
  * "同样的操作" → 复用上次的参数
`,

  // QUERY_DATABASE 专用参数
  [IntentType.QUERY_DATABASE]: `
查询参数提取：
- table: 必填，表名
- limit: 查询条数（如果用户说"前10条"、"100条"）
- filter: 筛选条件（如果用户说"查询 age > 18 的用户"）

示例：
输入: "查询 users 表"
→ {"table": "users", "dbType": "flexdb"}

输入: "查询 flexdb 的 orders 集合前 20 条"
→ {"table": "orders", "dbType": "flexdb", "limit": 20}
`,

  // MODIFY_FIELD 专用参数
  [IntentType.MODIFY_FIELD]: `
字段修改参数提取：
- table: 必填，表名
- field: 字段名（要操作的字段）
- action: 操作类型
  * "add_field": 如果用户说 "加字段"、"新增字段"、"添加字段"、"加上一个"
  * "rename": 如果用户说 "改名"、"重命名字段"、"字段改成"
  * "change_type": 如果用户说 "改类型"、"修改类型"、"字段类型改为"
  * "delete_field": 如果用户说 "删除字段"、"移除字段"
  
- newName: 新字段名（action=rename 时必填）
- newType: 新类型（action=change_type 时必填）
- defaultValue: 默认值（action=add_field 时可选）
- fieldType: 字段类型（action=add_field 时可选，如 string, number, boolean）

重点：识别 "字段名: 值" 这种模式！
- "加上一个 test3: test66" → field="test3", defaultValue="test66"
- "添加字段 age: 18" → field="age", defaultValue=18
- "新增 status: active" → field="status", defaultValue="active"

示例：
输入: "给 test 表加上一个 test3: test66"
→ {
  "table": "test",
  "field": "test3",
  "action": "add_field",
  "defaultValue": "test66",
  "dbType": "flexdb"
}

输入: "把 users 表的 age 字段改成 bigint"
→ {
  "table": "users",
  "field": "age",
  "action": "change_type",
  "newType": "bigint",
  "dbType": "flexdb"
}

输入: "重命名 users 表的 name 字段为 username"
→ {
  "table": "users",
  "field": "name",
  "action": "rename",
  "newName": "username",
  "dbType": "flexdb"
}

输入: "删除 test 表的 oldField 字段"
→ {
  "table": "test",
  "field": "oldField",
  "action": "delete_field",
  "dbType": "flexdb"
}
`,

  // INSERT_DOCUMENT 专用参数
  [IntentType.INSERT_DOCUMENT]: `
新增文档参数提取：
- table: 必填，表名
- data: 必填，要插入的数据对象（JSON格式）

⚠️ 关键区别（必须理解）：
- "加上一个文档" → INSERT_DOCUMENT（添加新记录）
  示例："给 test 表加上一个文档，内容是 test22:test22，test33:test33"
  
- "加上一个字段" → MODIFY_FIELD（修改表结构）
  示例："给 test 表加上一个字段 test22"

识别规则：
1. 如果用户明确说"文档"、"记录"、"一条数据" → INSERT_DOCUMENT
2. 如果用户说"字段" → MODIFY_FIELD
3. 如果用户说"加上一个 X:Y, Z:W"（多个键值对） → INSERT_DOCUMENT
4. 如果用户说"加上一个 X:Y"（单个键值对且没说"字段"） → INSERT_DOCUMENT

data 提取方法：
- 从 "内容是 test22:test22，test33:test33" 中提取
- 从 "数据是 {name: '张三', age: 25}" 中提取
- 从 "test22:test22, test33:test33" 中提取
- 格式：{"test22": "test22", "test33": "test33"}

示例：

输入: "给 test 表加上一个文档，内容是 test22:test22，test33:test33"
→ {
  "table": "test",
  "data": {"test22": "test22", "test33": "test33"},
  "dbType": "flexdb"
}

输入: "往 users 表插入一条记录：name: 张三, age: 25"
→ {
  "table": "users",
  "data": {"name": "张三", "age": 25},
  "dbType": "flexdb"
}

输入: "新增一个文档到 orders 表，订单号是 12345"
→ {
  "table": "orders",
  "data": {"订单号": "12345"},
  "dbType": "flexdb"
}
`,

  // CREATE_COLLECTION 专用参数
  [IntentType.CREATE_COLLECTION]: `
创建表参数提取：
- table: 必填，新表名
- schema: 表结构定义（可选）

示例：
输入: "创建一个 users 表"
→ {"table": "users", "dbType": "flexdb"}
`,

  // DELETE_COLLECTION 专用参数
  [IntentType.DELETE_COLLECTION]: `
删除表参数提取：
- table: 必填，要删除的表名

示例：
输入: "删除 temp 表"
→ {"table": "temp", "dbType": "flexdb"}
`,

  // ANALYZE_DATA 专用参数
  [IntentType.ANALYZE_DATA]: `
数据分析参数提取：
- table: 必填，要分析的表名
- analysisType: 分析类型（如 "count", "avg", "sum", "group_by"）

示例：
输入: "分析 orders 表的销售额"
→ {"table": "orders", "analysisType": "sum", "field": "amount"}
`,

  // DOC_QUESTION 专用参数
  [IntentType.DOC_QUESTION]: `
文档问答参数提取：
- question: 用户的问题（保留原文）
- category: 问题分类（如 "sdk_usage", "error_handling", "best_practice"）

示例：
输入: "如何连接 MongoDB？"
→ {"question": "如何连接 MongoDB？", "category": "sdk_usage"}
`,
};

/**
 * 构建意图分类提示词
 */
export function buildIntentClassificationPrompt(
  message: string,
  context?: any
): string {
  // 构建上下文信息
  const contextInfo = [];
  if (context?.lastQuery) {
    contextInfo.push(`上一次查询: "${context.lastQuery}"`);
  }
  if (context?.lastTable) {
    contextInfo.push(`上一次操作的表: "${context.lastTable}"`);
  }
  if (context?.envId) {
    contextInfo.push(`当前环境ID: ${context.envId}`);
  }

  // 构建意图类型说明
  const intentList = Object.entries(INTENT_DESCRIPTIONS)
    .map(([type, desc], index) => {
      return `${index + 1}. ${type}: ${desc.description}\n   关键词: ${desc.keywords.join('、')}`;
    })
    .join('\n');

  return `你是一个数据库自然语言交互系统的意图分类器。

用户输入: "${message}"

${contextInfo.length > 0 ? contextInfo.join('\n') + '\n' : ''}

请分析用户意图，提取关键参数，并输出 JSON 格式（仅输出 JSON，不要任何其他文字）。

## 意图类型说明
${intentList}

## 参数提取规则

${PARAM_EXTRACTION_RULES.common}

${PARAM_EXTRACTION_RULES[IntentType.INSERT_DOCUMENT]}

${PARAM_EXTRACTION_RULES[IntentType.MODIFY_FIELD]}

${PARAM_EXTRACTION_RULES[IntentType.QUERY_DATABASE]}

## 输出格式

{
  "type": "意图类型（必须是上述类型之一）",
  "confidence": 0.95,
  "params": {
    "dbType": "flexdb",
    "table": "表名",
    ... // 其他参数根据意图类型添加
  }
}

## 重要提示
1. 仔细识别 "字段名: 值" 这种模式
2. 区分 "查询" 和 "修改" 的意图
3. 如果用户说"加字段"、"添加字段"，action 必须是 "add_field"
4. 提取的参数必须完整，不要遗漏关键信息

现在分析用户输入并输出 JSON:`;
}

/**
 * 降级提示词（当 LLM 不可用时使用简单规则）
 */
export const FALLBACK_RULES = {
  queryPatterns: /查询|查找|检索|显示|列出|查看/,
  modifyPatterns: /修改|更改|调整|加字段|添加字段|新增字段|改名|重命名|改类型/,
  createPatterns: /创建|新建/,
  deletePatterns: /删除|移除/,
  analyzePatterns: /分析|统计|对比/,
  docPatterns: /如何|怎么|文档|SDK/,
};
