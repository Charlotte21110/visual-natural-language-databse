/**
 * CodeBuddy LLM Adapter
 * 使用 @tencent-ai/agent-sdk 的 query() 来实现 LLM 文本生成
 * 
 * 将 Agent SDK 包装为简单的 chat 接口，替代 LangChain ChatOpenAI
 */
import { query } from '@tencent-ai/agent-sdk';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
}

/**
 * 使用 CodeBuddy Agent SDK 进行文本生成
 */
export async function generateText(
  prompt: string,
  options: LLMOptions = {}
): Promise<string> {
  const model = options.model || process.env.LLM_MODEL || 'kimi-k2.5';

  const env: Record<string, string | undefined> = {
    ...process.env,
    CODEBUDDY_API_KEY: process.env.LLM_API_KEY,
    CODEBUDDY_INTERNET_ENVIRONMENT: process.env.CODEBUDDY_INTERNET_ENVIRONMENT || 'internal',
  };

  try {
    const q = query({
      prompt,
      options: {
        model,
        env,
        maxTurns: 3,
        permissionMode: 'bypassPermissions',
        allowedTools: [],
        cwd: process.cwd(),
      },
    });

    let result = '';
    for await (const message of q) {
      if (message.type === 'result') {
        const msg = message as any;
        if (msg.result) {
          result = msg.result;
        }
      }
    }

    return result || '';
  } catch (error: any) {
    console.error('[CodeBuddyLLM] Error:', error.message);
    throw error;
  }
}

/**
 * 基于消息列表进行对话
 */
export async function chat(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<string> {
  // 将消息列表转为单个 prompt
  let prompt = '';
  for (const msg of messages) {
    if (msg.role === 'system') {
      prompt += `[系统指令]\n${msg.content}\n\n`;
    } else if (msg.role === 'user') {
      prompt += `[用户消息]\n${msg.content}\n\n`;
    } else if (msg.role === 'assistant') {
      prompt += `[助手回复]\n${msg.content}\n\n`;
    }
  }
  prompt += '\n请直接回复文本内容，不要使用任何工具，不要读写任何文件。';

  return generateText(prompt, options);
}
