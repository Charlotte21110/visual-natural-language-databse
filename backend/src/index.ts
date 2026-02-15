/**
 * Natural Language DB Backend
 * 基于 LangChain.js + CloudBase 的数据库自然语言交互服务
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';
import { wedaProxyRouter } from './routes/weda-proxy.js';
import { authRouter } from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // 允许前端地址
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);
app.use('/api/weda', wedaProxyRouter);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  console.log(`🚀 Natural Language DB Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
