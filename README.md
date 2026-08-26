# Natural Language DB

用自然语言操作数据库。说人话，出数据。

支持 CloudBase FlexDB 和 MySQL，输入"查 users 表"就能拿到结果，不用写 SQL。

## 这个项目是干嘛的

一个 NL2DB（自然语言转数据库操作）系统。用户在聊天框里用中文描述需求，后端通过大模型理解意图、自动选择工具、执行查询，把结果返回给前端展示。

核心链路：

```
用户说"查一下 users 表有多少人"
  → 意图分类（LLM 判断这是一个查询请求）
  → Agent 路由（分发给对应的数据库 Agent）
  → Function Calling（大模型自动选工具、生成参数）
  → 执行查询，返回数据
```

## 技术亮点

- **Function Calling 自动工具选择**：不是 if-else 硬编码路由，是大模型自己决定调哪个工具、传什么参数。用的是 LangGraph 的 `createReactAgent`，支持多步推理
- **多数据库支持**：FlexDB（文档型）和 MySQL（关系型）走不同的 Agent，各自有专用的 tool 集合
- **RAG 降级**：当预定义工具搞不定时，自动降级到 RAG 检索文档 → 生成代码 → 执行的链路
- **上下文对话**：说完"查 users 表"，再说"筛选年龄大于 18 的"，能识别出指的是同一张表

## 技术栈

| 层 | 用了什么 |
|---|---|
| 前端 | React 18 + TypeScript + Vite |
| 后端 | Node.js + Express + TypeScript |
| AI | LangChain.js + LangGraph（ReAct Agent） |
| 大模型 | 千问（OpenAI 兼容协议），可切换 DeepSeek 等 |
| 数据库 | CloudBase FlexDB / MySQL |
| 向量检索 | ChromaDB |

## 快速开始

见 [QUICKSTART.md](./QUICKSTART.md)

## 架构

见 [ARCHITECTURE.md](./ARCHITECTURE.md)

## 项目结构

```
backend/src/
├── services/
│   ├── intent-classifier.ts    # 意图分类（LLM + 结构化输出）
│   ├── agent-router.ts         # 根据意图分发到对应 Agent
│   └── context-manager.ts      # 对话上下文管理
├── agents/
│   ├── tool-agent.ts           # FlexDB Agent（ReAct + Function Calling）
│   ├── mysql-tool-agent.ts     # MySQL Agent（ReAct + Function Calling）
│   ├── rag-code-agent.ts       # RAG 降级：检索文档 → 生成代码 → 执行
│   ├── data-explorer-agent.ts  # FlexDB 查询（参数驱动，ToolAgent 的降级方案）
│   ├── doc-assistant-agent.ts  # 文档问答
│   ├── field-mutator-agent.ts  # 字段修改
│   └── document-manager-agent.ts # 文档增删
├── tools/
│   ├── database-tools.ts       # FlexDB 工具定义（给 Function Calling 用）
│   └── mysql-tools.ts          # MySQL 工具定义
├── prompts/                    # 各环节的提示词
├── clients/                    # CloudBase SDK / MySQL 客户端封装
└── routes/                     # Express 路由

frontend/src/
├── components/
│   ├── ChatArea/               # 聊天输入区
│   ├── QueryResult/            # 查询结果展示（表格/文档视图）
│   ├── Sidebar/                # 数据库导航
│   └── EnvSelector/            # 环境切换
├── api/                        # 后端接口调用
├── request/                    # CAPI/LCAP 请求封装
└── pages/                      # 页面组件
```

## 分支说明

- `main` — 主开发分支
- `v1-langchain-react-agent` — 当前版本快照：LangChain + LangGraph ReAct Agent 实现

## 作者

marisa
