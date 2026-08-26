# 架构

## 整体结构

```
浏览器 (React)
  │
  │ POST /api/chat/query
  │
Express 后端
  │
  ├─ IntentClassifier ── LLM 判断用户想干嘛，输出结构化意图
  │
  ├─ AgentRouter ─────── 根据意图类型把请求扔给对应的 Agent
  │
  ├─ Agents
  │   ├─ ToolAgent ────── FlexDB 操作（ReAct + Function Calling）
  │   ├─ MySQLToolAgent ─ MySQL 操作（ReAct + Function Calling）
  │   ├─ RAGCodeAgent ─── 降级方案：RAG 检索文档 → 生成代码 → 执行
  │   ├─ DataExplorerAgent  FlexDB 查询（参数驱动，不走 Function Calling）
  │   ├─ DocAssistantAgent  文档问答
  │   ├─ FieldMutatorAgent  字段修改
  │   └─ DocumentManagerAgent 文档增删
  │
  └─ Clients
      ├─ CloudBase SDK ── 操作 FlexDB
      ├─ MySQL Client ─── 操作 MySQL（通过腾讯云 CAPI）
      └─ ChromaDB ─────── 向量检索（RAG 用）
```

## 请求怎么走的

以"查一下 users 表"为例：

```
1. 前端发 POST /api/chat/query
   body: { message: "查一下 users 表", context: { envId: "xxx" } }

2. ChatController 收到请求
   → ContextManager 补全上下文（上次查的表、数据库类型等）
   → IntentClassifier 分析意图

3. IntentClassifier（LLM + Zod Schema 结构化输出）
   输入: "查一下 users 表"
   输出: { type: "QUERY_DATABASE", confidence: 0.95, params: { table: "users", dbType: "flexdb" } }

4. AgentRouter 根据 type 路由
   QUERY_DATABASE + flexdb → ToolAgent
   QUERY_DATABASE + mysql  → MySQLToolAgent
   DOC_QUESTION            → DocAssistantAgent
   GENERAL_CHAT            → 直接调 LLM 回复

5. ToolAgent 执行（核心链路）
   → createReactAgent 启动 ReAct 循环
   → LLM 看到可用工具列表，决定调 query_collection
   → 自动生成参数 { collection: "users", limit: 20 }
   → 执行工具，拿到数据
   → LLM 看到数据，生成最终回复
   → 如果没找到合适工具，降级到 RAGCodeAgent

6. 返回给前端
   { type: "query_result", message: "查到 20 条数据", data: [...], metadata: { ... } }
```

## 关键组件

### IntentClassifier

用 LLM 把自然语言转成结构化意图。用了 LangChain 的 `withStructuredOutput`，绑定 Zod Schema，模型直接输出类型安全的 JSON，不用手动解析。

降级方案：LLM 挂了就走关键词正则匹配（`fallbackClassify`）。

### ToolAgent / MySQLToolAgent

核心的 Function Calling Agent。用 LangGraph 的 `createReactAgent`，把一组 tool 交给 LLM，LLM 自己决定：
- 调哪个工具
- 传什么参数
- 要不要连续调多个工具

这和手写 if-else 路由的区别是：加新功能只要加一个 tool 定义，不用改任何路由逻辑。

### RAGCodeAgent

当 ToolAgent 找不到合适工具时的降级方案。流程：
1. 用 ChromaDB 检索和用户问题相关的 API 文档
2. 把文档片段 + 用户问题交给 LLM 生成 SDK 调用代码
3. 执行生成的代码，返回结果

### AgentRouter

一个 switch-case，根据意图类型分发请求。同时管两个开关：
- `USE_TOOL_AGENT`：是否启用 Function Calling（关掉后 FlexDB 走参数驱动的 DataExplorerAgent）
- `USE_MYSQL_AGENT`：是否启用 MySQL Agent

### ContextManager

记住对话历史，支持"刚才那个表"这种指代。把上次操作的表名、数据库类型注入到当前请求的上下文里。

## 工具定义（Function Calling 用的）

### FlexDB 工具（database-tools.ts）

给 ToolAgent 用的，大模型从这里面选：

- `query_collection` — 查询集合数据
- `list_collections` — 列出所有集合
- `insert_document` — 插入文档
- `update_document` — 更新文档
- `get_collection_schema` — 获取集合结构

### MySQL 工具（mysql-tools.ts）

给 MySQLToolAgent 用的：

- `list_tables` — 列出所有表
- `run_sql` — 执行 SQL 语句
- `describe_table` — 查看表结构

## 前端怎么接的

前端通过 `POST /api/chat/query` 和后端通信。根据返回的 `type` 字段决定怎么展示：

- `query_result` → 表格视图（MySQL）或文档视图（FlexDB）
- `doc_answer` → Markdown 渲染 + 引用来源
- `error` → 错误提示
- `general_chat` → 普通对话气泡

## .env 配置

```env
# 大模型（OpenAI 兼容协议，千问/DeepSeek 都能用）
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-xxx
LLM_MODEL=qwen-max

# ChromaDB（RAG 用）
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Agent 开关
USE_TOOL_AGENT=true     # true=Function Calling, false=参数驱动
USE_MYSQL_AGENT=true
```
