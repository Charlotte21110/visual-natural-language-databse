/**
 * Natural Language DB Backend
 * 基于 LangChain.js + CloudBase 的数据库自然语言交互服务
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Natural Language DB Backend 启动中...');

// 中间件
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== 路由 ====================

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 登录接口
app.post('/api/auth/login', (req, res) => {
  try {
    const { cookie, envId } = req.body;

    if (!cookie) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'cookie is required',
      });
    }

    // TODO: 存储到内存/Redis
    console.log('[Auth] Cookie 已保存');

    res.json({
      success: true,
      message: '登录态已保存',
      envId: envId || process.env.TCB_ENV_ID,
    });
  } catch (error: any) {
    console.error('[Auth] 登录错误:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// 查询接口
app.post('/api/chat/query', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'message field is required and must be a string',
      });
    }

    console.log('\n========================================');
    console.log('[Chat Query] 收到请求');
    console.log('  用户输入:', message);
    console.log('  上下文:', context || '无');
    console.log('========================================\n');

    // 动态导入（懒加载）
    const { handleChatQuery } = await import('./controllers/chat-controller.js');
    
    // 使用完整的处理逻辑
    await handleChatQuery(req, res);
    
  } catch (error: any) {
    console.error('[Chat Error]', error);
    res.status(500).json({
      type: 'error',
      message: '处理请求时出错，请稍后重试',
      error: error.message,
    });
  }
});

// 错误处理
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`\n✅ 服务启动成功！`);
  console.log(`🚀 Natural Language DB Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`\n💡 可用功能:`);
  console.log(`  - 登录: POST /api/auth/login`);
  console.log(`  - 查询: POST /api/chat/query`);
  console.log(`\n🔧 使用懒加载，首次调用时会初始化 LLM 和 CloudBase\n`);
});
