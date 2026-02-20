import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bubble, Sender, CodeHighlighter } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import { Button } from 'tea-component';
import { useEnvStore } from '../../store/env-store';
import './style.less';

// 自定义代码块组件 - 带高亮和复制功能
interface CodeBlockProps {
  children?: ReactNode;
  className?: string;
  'data-lang'?: string;
  [key: string]: unknown;
}

// 将 ReactNode 转换为字符串
const getTextFromChildren = (children: ReactNode): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return getTextFromChildren((children as { props: { children?: ReactNode } }).props.children);
  }
  return '';
};

const CodeBlock = ({ children, className, 'data-lang': dataLang }: CodeBlockProps) => {
  // 从 className 或 data-lang 属性中提取语言
  const langMatch = className?.match(/language-(\w+)/);
  const lang = langMatch?.[1] || dataLang || 'text';

  // 将 ReactNode 转换为字符串
  const codeContent = getTextFromChildren(children);

  return (
    <CodeHighlighter lang={lang}>
      {codeContent}
    </CodeHighlighter>
  );
};

interface QueryResult {
  type: string;
  message: string;
  data?: Array<Record<string, unknown>>;
  metadata?: {
    dbType?: string;
    table?: string;
    rowCount?: number;
    columns?: string[];
    displayType?: 'table' | 'document';
  };
  suggestions?: string[];
}

interface ChatAreaProps {
  onQuery?: (result: QueryResult) => void;
}

// 消息角色定义
type MessageRole = 'user' | 'ai';

interface ChatMessage {
  key: string;
  role: MessageRole;
  content: string;
  showButton?: boolean;
  loading?: boolean;
}

const ChatArea = ({ onQuery }: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      key: 'welcome',
      role: 'ai',
      content: '你好！我是 QueryFlow 助手。请用自然语言描述你想要查询的数据，例如："帮我查询flexdb 的 test 表" 或 "教我如何用sdk创建数据"。'
    },
  ]);
  const [loading, setLoading] = useState(false);
  const { currentEnv } = useEnvStore();

  const handleSend = async (value: string) => {
    if (!value.trim() || loading) return;

    const userMsgKey = `user-${Date.now()}`;
    const aiMsgKey = `ai-${Date.now()}`;

    // 添加用户消息
    setMessages(prev => [...prev, { key: userMsgKey, role: 'user', content: value }]);
    setInputValue('');
    setLoading(true);

    // 添加加载中的 AI 消息
    setMessages(prev => [...prev, { key: aiMsgKey, role: 'ai', content: '', loading: true }]);

    try {
      const response = await fetch('http://localhost:3001/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: value,
          context: { envId: currentEnv?.EnvId },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // 更新 AI 消息
      setMessages(prev => prev.map(msg =>
        msg.key === aiMsgKey
          ? { ...msg, content: result.message || '已为您处理完成', loading: false, showButton: result.type === 'query_result' }
          : msg
      ));

      if (result.type === 'query_result' && result.data) {
        onQuery?.(result);
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[API Error]', error);
      setMessages(prev => prev.map(msg =>
        msg.key === aiMsgKey
          ? { ...msg, content: `抱歉，处理请求时出错了：${errorMessage}。请检查后端服务是否启动。`, loading: false }
          : msg
      ));
    } finally {
      setLoading(false);
    }
  };

  // 角色配置
  const roleConfig = {
    ai: {
      placement: 'start' as const,
      typing: { effect: 'typing' as const, step: 5, interval: 20 },
    },
    user: {
      placement: 'end' as const,
    },
  };

  // XMarkdown 组件配置 - 自定义代码块渲染
  const markdownComponents = {
    code: CodeBlock,
  };

  // 转换为 Bubble.List 的 items 格式
  const bubbleItems = messages.map((msg) => ({
    key: msg.key,
    role: msg.role,
    loading: msg.loading,
    content: msg.content,
    contentRender: (content: string) => (
      <div className="bubble-wrapper">
        <XMarkdown components={markdownComponents}>{content}</XMarkdown>
        {msg.showButton && (
          <Button type="primary" className="query-btn" style={{ marginTop: 12 }}>查找</Button>
        )}
      </div>
    ),
  }));

  return (
    <div className="chat-area">
      <div className="chat-messages">
        <Bubble.List
          items={bubbleItems}
          role={roleConfig}
          autoScroll
          style={{ height: '100%' }}
        />
      </div>

      <div className="chat-input">
        <Sender
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          loading={loading}
          placeholder="输入自然语言查询，如：查询 flexdb 的 test 表..."
        />
      </div>
    </div>
  );
};

export default ChatArea;

