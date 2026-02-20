import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bubble, Sender, CodeHighlighter } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
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

// 消息角色定义
type MessageRole = 'user' | 'ai';

interface ChatMessage {
  key: string;
  role: MessageRole;
  content: string;
  loading?: boolean;
}

const DocQAArea = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { key: 'welcome', role: 'ai', content: '你好！我是文档问答助手。请输入您的问题，我将基于知识库为您解答。' },
  ]);
  const [loading, setLoading] = useState(false);

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
      const response = await fetch('http://localhost:3001/api/doc-qa/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: value }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // 更新 AI 消息
      setMessages(prev => prev.map(msg =>
        msg.key === aiMsgKey
          ? { ...msg, content: result.answer || result.message || '抱歉，暂时无法回答这个问题。', loading: false }
          : msg
      ));

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[Doc QA API Error]', error);
      setMessages(prev => prev.map(msg =>
        msg.key === aiMsgKey
          ? { ...msg, content: `抱歉，查询知识库时出错了：${errorMessage}`, loading: false }
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
      </div>
    ),
  }));

  return (
    <div className="doc-qa-page">
      <div className="doc-qa-content">
        <div className="doc-qa-header">
          <h2>文档问答机</h2>
          <p>连接知识库的智能解答</p>
        </div>

        <div className="doc-qa-area">
          <div className="qa-messages">
            <Bubble.List
              items={bubbleItems}
              role={roleConfig}
              autoScroll
              style={{ height: '100%' }}
            />
          </div>

          <div className="qa-input">
            <Sender
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleSend}
              loading={loading}
              placeholder="输入您的问题..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocQAArea;

