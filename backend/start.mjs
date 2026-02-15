/**
 * 超简单启动文件 - 纯 JS
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
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 登录接口
app.post('/api/auth/login', (req, res) => {
  const { cookie } = req.body;
  console.log('[Auth] 收到 Cookie');
  res.json({ success: true, message: '登录成功' });
});

// 查询接口
app.post('/api/chat/query', async (req, res) => {
  const { message } = req.body;
  
  console.log('[Chat] 收到请求:', message);
  
  res.json({
    type: 'query_result',
    message: `收到: ${message}（后端正常，暂时返回模拟数据）`,
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

// 启动
app.listen(PORT, () => {
  console.log(`\n✅ 后端启动成功！`);
  console.log(`🚀 地址: http://localhost:${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health\n`);
});
