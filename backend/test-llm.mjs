/**
 * 测试通义千问 API 是否配置正确
 */
import OpenAI from "openai";
import dotenv from 'dotenv';

// 加载 .env 配置
dotenv.config();

console.log('\n🧪 测试通义千问大模型连接...\n');

const apiKey = process.env.LLM_API_KEY;
const baseURL = process.env.LLM_BASE_URL;
const model = process.env.LLM_MODEL;

console.log('📋 当前配置:');
console.log(`  API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '❌ 未配置'}`);
console.log(`  Base URL: ${baseURL || '❌ 未配置'}`);
console.log(`  模型: ${model || '❌ 未配置'}`);
console.log('');

if (!apiKey || !baseURL) {
  console.error('❌ 错误: 请在 .env 文件中配置 LLM_API_KEY 和 LLM_BASE_URL');
  process.exit(1);
}

try {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL
  });

  console.log('📡 正在调用 API...\n');

  const completion = await openai.chat.completions.create({
    model: model || "qwen-plus",
    messages: [
      { role: "system", content: "你是一个数据库助手。" },
      { role: "user", content: "用一句话介绍你自己。" }
    ],
  });

  console.log('✅ API 调用成功！\n');
  console.log('🤖 AI 回复:');
  console.log(`  ${completion.choices[0].message.content}\n`);
  console.log('🎉 通义千问配置正确，可以正常使用！\n');

} catch (error) {
  console.error('\n❌ API 调用失败:\n');
  console.error(`  错误信息: ${error.message}\n`);
  
  if (error.message.includes('API key')) {
    console.log('💡 解决方案:');
    console.log('  1. 检查 .env 中的 LLM_API_KEY 是否正确');
    console.log('  2. 确认 API Key 是否有效（访问阿里云百炼控制台）');
    console.log('  3. 确认 API Key 有足够的余额');
  } else if (error.message.includes('model')) {
    console.log('💡 解决方案:');
    console.log('  1. 检查模型名称是否正确（qwen-plus / qwen-max / qwen-turbo）');
    console.log('  2. 确认该模型在你的地域可用');
  } else {
    console.log('💡 参考文档: https://help.aliyun.com/model-studio/developer-reference/error-code');
  }
  console.log('');
  process.exit(1);
}
