/**
 * 开发模式启动脚本
 * 先编译 TypeScript，再运行
 */
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

console.log('🚀 启动开发服务器...\n');

// 检查 dist 目录是否存在
if (!fs.existsSync('dist')) {
  console.log('📦 首次运行，正在编译 TypeScript...');
  try {
    await execAsync('npx tsc');
    console.log('✅ 编译完成\n');
  } catch (error) {
    console.error('❌ 编译失败:', error.message);
    process.exit(1);
  }
}

// 启动服务
console.log('🚀 启动服务...\n');
const server = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

server.on('error', (error) => {
  console.error('❌ 启动失败:', error.message);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ 服务异常退出，代码: ${code}`);
  }
  process.exit(code);
});

// 捕获退出信号
process.on('SIGINT', () => {
  console.log('\n👋 正在关闭服务...');
  server.kill('SIGINT');
  process.exit(0);
});
