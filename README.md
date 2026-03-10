# 🤖 Natural Language DB

**基于 RAG 与多智能体的数据库自然语言交互平台**

通过自然语言查询、修改、分析数据库，支持 CloudBase FlexDB 和 MySQL。

---

## ✨ 功能特性

### 🎯 核心功能（MVP）

- [x] **自然语言查询**: "查询 flexdb 的 users 表" → 自动识别意图并执行
- [x] **智能意图分类**: 基于 LLM 的意图识别（LangChain.js）
- [x] **多数据库支持**: FlexDB (MongoDB) / MySQL
- [x] **Agent 架构**: 模块化的 Agent 系统（查询、文档问答等）
- [ ] **RAG 文档问答**: 基于 ChromaDB 的向量检索（开发中）
- [ ] **数据可视化**: 表格/文档/图表展示

### 🚀 高级功能（规划中）

- [ ] **字段修改**: "把 age 字段改成 bigint"
- [ ] **数据分析**: "统计每月订单量"，AI 自动总结
- [ ] **多表查询**: JOIN、聚合、对比
- [ ] **智能索引推荐**: 根据查询模式推荐索引
- [ ] **操作审计**: 变更记录、回滚
- [ ] **SQL 安全**: 白名单验证、注入防护

---

## 🏗️ 技术架构

```
Frontend (React + Vite)
    ↓ HTTP
Backend (Node.js + Express)
    ├─ IntentClassifier (LangChain.js + LLM)
    ├─ AgentRouter
    └─ Agents
        ├─ DataExplorerAgent (查询数据)
        ├─ DocAssistantAgent (文档问答)
        ├─ FieldMutatorAgent (修改字段)
        └─ DataAnalyzerAgent (数据分析)
    ↓
CloudBase SDK / ChromaDB
```

**核心技术栈**:
- **前端**: React 18 + TypeScript + Vite + Tea Component
- **后端**: Node.js + Express + TypeScript
- **AI 框架**: LangChain.js
- **大模型**: 阿里百练
- **数据库**: CloudBase (@tcb-manager/node)
- **向量检索**: ChromaDB (规划中)

详细架构请查看 [`ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo>
cd naturalLanguageDb
```

### 2. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 3. 配置环境变量

```bash
# 后端配置
cd backend
cp .env.example .env
# 编辑 .env，填入：
# - LLM_API_KEY (通义千问/DeepSeek)
# - TCB_SECRET_ID / TCB_SECRET_KEY
# - TCB_ENV_ID
```

### 4. 启动服务

```bash
# 终端 1: 后端
cd backend
npm run dev
# → http://localhost:3001

# 终端 2: 前端
cd frontend
npm run dev
# → http://localhost:5173
```

### 5. 测试功能

打开浏览器访问 `http://localhost:5173`，在聊天框输入：

```
查询 flexdb 的 users 表
```

查看右侧是否显示查询结果 ✨

**详细步骤请查看**: [`QUICKSTART.md`](./QUICKSTART.md)

---

## 📁 项目结构

```
naturalLanguageDb/
├── frontend/              # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   │   ├── ChatArea/       # 聊天区域
│   │   │   ├── QueryResult/    # 结果展示
│   │   │   └── Sidebar/        # 侧边栏
│   │   ├── api/           # API 封装
│   │   │   ├── chat-api.ts     # 后端 AI 接口
│   │   │   └── ...
│   │   ├── request/       # 请求层
│   │   │   ├── capi-request.ts # CloudBase CAPI
│   │   │   └── lcap-request.ts # LCAP 接口
│   │   └── ...
│   └── package.json
│
├── backend/               # 后端 (Node.js + Express)
│   ├── src/
│   │   ├── index.ts              # 入口文件
│   │   ├── routes/               # 路由层
│   │   │   ├── chat.ts           # 聊天接口
│   │   │   └── weda-proxy.ts     # Weda 代理
│   │   ├── controllers/          # 控制器
│   │   │   └── chat-controller.ts
│   │   ├── services/             # 核心服务
│   │   │   ├── intent-classifier.ts  # 意图分类
│   │   │   ├── agent-router.ts       # Agent 路由
│   │   │   └── context-manager.ts    # 上下文管理
│   │   ├── agents/               # Agent 层
│   │   │   ├── data-explorer-agent.ts   # 数据查询
│   │   │   └── doc-assistant-agent.ts   # 文档问答
│   │   └── clients/              # 底层客户端
│   │       └── cloudbase-client.ts      # CloudBase SDK
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── ARCHITECTURE.md        # 架构设计文档
├── QUICKSTART.md          # 快速开始指南
└── README.md              # 本文件
```

---

## 🎮 使用示例

### 示例 1: 查询数据

**输入**: "查询 flexdb 的 users 表"

**输出**:
```json
{
  "type": "query_result",
  "message": "已为您查询 FlexDB 的 users 表，共 120 条数据",
  "data": [
    { "id": 1, "name": "张三", "email": "zhang@example.com" },
    { "id": 2, "name": "李四", "email": "li@example.com" }
  ],
  "metadata": {
    "dbType": "flexdb",
    "table": "users",
    "rowCount": 120,
    "displayType": "document"
  }
}
```

### 示例 2: 文档问答

**输入**: "如何连接 MongoDB"

**输出**:
```json
{
  "type": "doc_answer",
  "message": "要连接 MongoDB，需要使用 @tcb-manager/node...",
  "metadata": {
    "sources": [
      { "title": "CloudBase 文档", "url": "https://..." }
    ]
  }
}
```

### 示例 3: 上下文对话

```
用户: "查询 users 表"
AI: "已为您查询 users 表，共 120 条数据"

用户: "筛选年龄大于 18 的"
AI: "已筛选，共 80 条数据" ← 自动识别"刚才那个表"
```

---

## 📊 核心组件说明

### 1. IntentClassifier（意图分类器）

**作用**: 将用户的自然语言输入转换为结构化意图

**输入**: "查询 flexdb 的 users 表"

**输出**:
```json
{
  "type": "QUERY_DATABASE",
  "confidence": 0.95,
  "params": {
    "dbType": "flexdb",
    "table": "users"
  }
}
```

**技术**: LangChain.js + LLM (通义千问/DeepSeek)

### 2. AgentRouter（Agent 路由器）

**作用**: 根据意图类型，路由到对应的 Agent

**映射关系**:
- `QUERY_DATABASE` → DataExplorerAgent
- `DOC_QUESTION` → DocAssistantAgent
- `MODIFY_FIELD` → FieldMutatorAgent (开发中)
- `ANALYZE_DATA` → DataAnalyzerAgent (开发中)

### 3. DataExplorerAgent（数据查询 Agent）

**作用**: 执行数据库查询，格式化响应

**功能**:
- 查询 FlexDB 集合
- 查询 MySQL 表
- 参数补全（从上下文中推断）
- 数据格式化（表格/文档）

### 4. CloudBaseClient（CloudBase 客户端）

**作用**: 封装 CloudBase SDK 调用

**功能**:
- `queryCollection()`: 查询 FlexDB
- `executeSQL()`: 执行 MySQL 查询
- `listCollections()`: 获取集合列表

---

## 🔌 API 接口

### POST /api/chat/query

查询接口（主要接口）

**请求**:
```json
{
  "message": "查询 flexdb 的 users 表",
  "context": {
    "envId": "xxx",
    "sessionId": "user-123"
  }
}
```

**响应**:
```json
{
  "type": "query_result",
  "message": "已为您查询 FlexDB 的 users 表，共 120 条数据",
  "data": [...],
  "metadata": {...},
  "suggestions": ["筛选数据", "分析这些数据"]
}
```

### GET /health

健康检查接口

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2024-02-15T..."
}
```

---

## 🛠️ 开发指南

### 添加新的 Agent

1. 创建 Agent 文件:

```bash
touch backend/src/agents/my-agent.ts
```

2. 实现 Agent:

```typescript
import { AgentResponse } from '../services/agent-router.js';

export class MyAgent {
  async execute(message: string, params: any, context: any): Promise<AgentResponse> {
    // 实现你的逻辑
    return {
      type: 'my_result',
      message: '处理完成',
      data: {...},
    };
  }
}
```

3. 在 AgentRouter 中注册:

```typescript
// backend/src/services/agent-router.ts
import { MyAgent } from '../agents/my-agent.js';

// 在 route() 方法中添加
case IntentType.MY_INTENT:
  return await this.myAgent.execute(message, intent.params, context);
```

### 添加新的意图类型

```typescript
// backend/src/services/intent-classifier.ts
export enum IntentType {
  // ... 现有的
  MY_NEW_INTENT = 'MY_NEW_INTENT',
}
```

然后在 `buildClassificationPrompt()` 中添加识别规则。

---

## 🐛 调试技巧

### 查看日志

```bash
# 后端日志
cd backend
npm run dev
# 查看控制台输出

# 前端日志
# 浏览器 F12 -> Console
```

### 测试单个接口

```bash
# 测试意图分类
curl -X POST http://localhost:3001/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"message":"查询 users 表"}'
```

### 常见问题

参考 [`QUICKSTART.md`](./QUICKSTART.md) 的"常见问题"章节

---

## 📚 文档索引

- **[快速开始](./QUICKSTART.md)**: 5 分钟跑起来
- **[架构设计](./ARCHITECTURE.md)**: 完整的技术架构和数据流
- **[后端文档](./backend/README.md)**: 后端 API 和开发指南
- **[前端文档](./frontend/)**: 前端组件和状态管理

---

## 🚧 开发计划

### Phase 1: MVP（当前）
- [x] 基础架构搭建
- [x] 意图分类
- [x] 数据查询功能
- [ ] 前端数据展示优化

### Phase 2: 增强功能
- [ ] RAG 文档问答
- [ ] 字段修改
- [ ] 数据分析
- [ ] 多表查询

### Phase 3: 生产化
- [ ] SQL 安全验证
- [ ] 操作审计
- [ ] 性能优化
- [ ] 部署方案

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT License](./LICENSE)

---

## 👥 作者

marisa

---

## 🙏 致谢

- [LangChain.js](https://js.langchain.com/) - AI 编排框架
- [CloudBase](https://cloud.tencent.com/product/tcb) - 云开发平台
- [通义千问](https://tongyi.aliyun.com/) - 大模型支持
- [Tea Component](https://tea-design.github.io/) - UI 组件库

---

**开始使用**: 查看 [QUICKSTART.md](./QUICKSTART.md) 👈
