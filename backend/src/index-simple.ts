/**
 * 简化版启动文件 - 先确保服务能跑起来 好像没用，废弃
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 启动中...');

// 中间件
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 登录接口（简化版）
app.post('/api/auth/login', (req, res) => {
  const { cookie } = req.body;
  console.log('[Auth] Cookie 已保存');
  res.json({ success: true, message: '登录成功' });
});

// 查询接口（简化版 - 返回占位数据）
app.post('/api/chat/query', async (req, res) => {
  const { message } = req.body;
  
  console.log('[Chat] 收到请求:', message);
  
  // 暂时返回模拟数据
  res.json({
    type: 'query_result',
    message: `收到你的消息: ${message}（后端暂时返回模拟数据，等服务完全启动后会调用真实的 LLM）`,
    data: [
      { id: 1, name: '测试数据1' },
      { id: 2, name: '测试数据2' },
    ],
    metadata: {
      dbType: 'flexdb',
      table: 'users',
      rowCount: 2,
    }
  });
});

// 启动服务
app.listen(PORT, () => {
  console.log(`\n✅ 服务启动成功！`);
  console.log(`🚀 后端地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`\n💡 前端现在可以登录了！\n`);
});
