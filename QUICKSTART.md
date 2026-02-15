# 🚀 快速开始指南

## 一、环境准备

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖（如果还没装）
cd ../frontend
npm install
```

### 2. 配置环境变量

#### 后端配置

```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`：


## 二、启动服务

### 方式 1: 分别启动（推荐开发环境）

```bash
# 终端 1: 启动后端
cd backend
npm run dev
# ✅ 后端运行在 http://localhost:3001

# 终端 2: 启动前端
cd frontend
npm run dev
# ✅ 前端运行在 http://localhost:5173
```

### 方式 2: 使用 tmux 或 screen（一个终端）

```bash
# 安装 tmux（如果没有）
brew install tmux  # macOS
sudo apt install tmux  # Ubuntu

# 启动 tmux 会话
tmux new -s nldb

# 窗口 1: 启动后端
cd backend && npm run dev

# 新建窗口 2: Ctrl+B 然后按 C
cd frontend && npm run dev

# 切换窗口: Ctrl+B 然后按 数字键
# 退出 tmux: Ctrl+B 然后按 D
```

## 三、测试功能

### 1. 健康检查

```bash
# 测试后端是否启动
curl http://localhost:3001/health

# 预期响应
# {"status":"ok","timestamp":"2024-02-15T..."}
```

### 2. 测试意图分类

```bash
curl -X POST http://localhost:3001/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "查询 users 表",
    "context": {
      "envId": "your-env-id"
    }
  }'
```

**预期响应**:

```json
{
  "type": "query_result",
  "message": "已为您查询 FlexDB 的 users 表，共 10 条数据",
  "data": [...],
  "metadata": {
    "dbType": "flexdb",
    "table": "users",
    "rowCount": 10,
    "columns": ["id", "name", "email"],
    "displayType": "document"
  },
  "suggestions": ["筛选数据", "分析这些数据"]
}
```

### 3. 测试前端

1. 打开浏览器访问 `http://localhost:5173`
2. 在聊天框输入："查询 flexdb 的 users 表"
3. 查看右侧是否显示查询结果

## 四、常见问题

### 问题 1: 后端启动失败

**错误信息**: `Module not found` 或 `Cannot find module`

**解决方案**:

```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### 问题 2: LLM 调用失败

**错误信息**: `API Key is invalid` 或 `Request timeout`

**检查项**:

```bash
# 1. 检查 API Key 是否正确
cat backend/.env | grep LLM_API_KEY

# 2. 测试 API 连通性
curl https://dashscope.aliyuncs.com/compatible-mode/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# 3. 检查网络是否可访问
ping dashscope.aliyuncs.com
```

### 问题 3: CloudBase 查询失败

**错误信息**: `查询集合失败: Invalid credentials`

**检查项**:

```bash
# 1. 检查密钥配置
cat backend/.env | grep TCB_

# 2. 检查环境 ID 是否正确
# 访问 https://console.cloud.tencent.com/tcb/env/index
# 确认环境 ID

# 3. 检查集合是否存在
# 在控制台 -> 数据库 -> 查看集合列表
```

### 问题 4: 前端无法连接后端

**错误信息**: `Failed to fetch` 或 `CORS error`

**解决方案**:

```bash
# 1. 确认后端已启动
curl http://localhost:3001/health

# 2. 检查后端 CORS 配置
# 在 backend/src/index.ts 中，确认 cors 配置包含前端地址：
# app.use(cors({ origin: ['http://localhost:5173'] }))

# 3. 清空浏览器缓存，重新加载页面
```

### 问题 5: 意图识别不准确

**现象**: 说"查询 users 表"，但被识别成其他意图

**优化方案**:

1. **调整 Prompt**:

   编辑 `backend/src/services/intent-classifier.ts`，优化 `buildClassificationPrompt` 方法

2. **增加训练样例**:

   ```typescript
   // 在 Prompt 中增加示例
   用户说: "查询 users 表" → QUERY_DATABASE
   用户说: "修改 age 字段" → MODIFY_FIELD
   用户说: "创建 orders 表" → CREATE_COLLECTION
   ```

3. **降低 temperature**:

   ```typescript
   // 在 IntentClassifier 构造函数中
   this.llm = new ChatOpenAI({
     temperature: 0.1, // 降低随机性
   });
   ```

## 五、下一步

### 开发新功能

1. **添加新的 Agent**:

   ```bash
   # 创建新文件
   touch backend/src/agents/my-agent.ts
   
   # 在 AgentRouter 中注册
   # 编辑 backend/src/services/agent-router.ts
   ```

2. **添加新的意图类型**:

   ```typescript
   // 编辑 backend/src/services/intent-classifier.ts
   export enum IntentType {
     // ... 现有的
     MY_NEW_INTENT = 'MY_NEW_INTENT',
   }
   ```

3. **实现 RAG 文档问答**:

   ```bash
   # 安装 ChromaDB
   docker run -d -p 8000:8000 chromadb/chroma
   
   # 创建 RAG Service
   touch backend/src/services/rag-service.ts
   ```

### 部署到生产环境

参考 `ARCHITECTURE.md` 中的"部署方案"章节

### 查看完整文档

- **架构设计**: `ARCHITECTURE.md`
- **后端文档**: `backend/README.md`
- **项目方案**: 你的原始需求文档

## 六、获取帮助

### 日志查看

```bash
# 后端日志
cd backend
npm run dev
# 查看控制台输出

# 前端日志
# 打开浏览器 F12 -> Console
```

### 调试技巧

1. **开启详细日志**:

   在 `backend/src/index.ts` 中，已经有请求日志中间件

2. **单步调试**:

   ```bash
   # 使用 VS Code 调试
   # 在 .vscode/launch.json 中配置
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Backend",
     "skipFiles": ["<node_internals>/**"],
     "program": "${workspaceFolder}/backend/src/index.ts",
     "runtimeArgs": ["--loader", "tsx"]
   }
   ```

3. **测试单个 Agent**:

   ```typescript
   // backend/test.ts
   import { DataExplorerAgent } from './src/agents/data-explorer-agent.js';
   
   const agent = new DataExplorerAgent();
   const result = await agent.execute('查询 users 表', { table: 'users' }, {});
   console.log(result);
   ```

---

🎉 **恭喜！** 你已经完成了基础搭建。现在可以开始实现你的需求了！

如果遇到问题，请检查：
1. ✅ 环境变量配置是否正确
2. ✅ 依赖是否安装完整
3. ✅ 网络是否可以访问外部 API
4. ✅ CloudBase 环境是否有数据

祝你开发顺利！ 🚀
