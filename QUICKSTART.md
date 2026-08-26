# 快速开始

## 前提

- Node.js 18+
- 一个支持 OpenAI 兼容协议的 API Key（千问、DeepSeek 等）
- 一个 CloudBase 环境（用于 FlexDB 操作，没有的话也能跑，只是查不了数据库）

## 1. 装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 2. 配环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`，至少填这几个：

```env
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_API_KEY=sk-你的key
LLM_MODEL=qwen-max
```

如果要操作 MySQL，还需要在前端登录后通过浏览器传 Cookie（详见下面"MySQL 操作"部分）。

## 3. 启动

开两个终端：

```bash
# 终端 1
cd backend && npm run dev
# 跑在 http://localhost:3001

# 终端 2
cd frontend && npm run dev
# 跑在 http://localhost:5173
```

## 4. 试一下

打开 `http://localhost:5173`，在聊天框输入：

```
查询 users 表
```

如果配了 CloudBase 环境，应该能看到查询结果。没配的话会报错，但说明链路是通的。

其他可以试的：

```
帮我看看 mysql 的 orders 表
给 users 表加一个 age 字段
这个表有多少条数据
```

## 5. 验证后端

不想开前端也行，直接 curl：

```bash
# 健康检查
curl http://localhost:3001/health

# 发一条查询
curl -X POST http://localhost:3001/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{"message":"查询 users 表", "context":{"envId":"你的环境ID"}}'
```

## 换模型

项目用的是 OpenAI 兼容协议，换模型只需要改 `.env`：

```env
# 千问
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-max

# DeepSeek
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# 本地 Ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2
LLM_API_KEY=ollama
```

## MySQL 操作

MySQL 查询走的是腾讯云 CAPI，需要 Cookie 认证。流程：

1. 在前端页面登录腾讯云账号
2. 登录成功后，前端会把 Cookie 发给后端保存
3. 然后就可以用自然语言操作 MySQL 了

## 常见问题

**Q: 后端启动报 `Cannot find module`**

```bash
cd backend && rm -rf node_modules package-lock.json && npm install
```

**Q: LLM 调用超时或报 401**

检查 `.env` 里的 `LLM_API_KEY` 是否正确，试试 curl 直接调一下：

```bash
curl ${LLM_BASE_URL}/chat/completions \
  -H "Authorization: Bearer ${LLM_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen-max","messages":[{"role":"user","content":"你好"}]}'
```

**Q: 意图识别不准**

调低 temperature（当前是 0.1，已经够低了），或者去 `backend/src/prompts/intent-classification.ts` 里加 few-shot 示例。

**Q: Function Calling 不生效**

确认 `USE_TOOL_AGENT=true`（默认就是 true）。如果用的模型不支持 function calling（比如某些小模型），会失败——换一个支持 tool call 的模型。
