import { useState } from 'react';
import { Button, Input } from 'tea-component';
import { useEnvStore } from '../../store/env-store';
import './style.less';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
  showButton?: boolean;
}

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

const ChatArea = ({ onQuery }: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, type: 'ai', content: '你好！我是 QueryFlow 助手。请用自然语言描述你想要查询的数据，例如："帮我查询flexdb 的 test 表" 或 "教我如何用sdk创建数据"。' },
  ]);
  
  // 获取当前选择的环境
  const { currentEnv } = useEnvStore();

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    // 添加用户消息
    const userMsg: ChatMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    const userInput = inputValue;
    setInputValue(''); // 清空输入框
    
    // 添加加载提示
    const loadingMsg: ChatMessage = {
      id: messages.length + 2,
      type: 'ai',
      content: '正在处理您的请求...',
    };
    setMessages(prev => [...prev, loadingMsg]);
    
    try {
      // 调用后端 API
      const response = await fetch('http://localhost:3001/api/chat/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          context: {
            // ✅ 传递当前选择的环境ID
            envId: currentEnv?.EnvId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // 移除加载消息，添加实际响应
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMsg.id);
        const aiMsg: ChatMessage = {
          id: Date.now(),
          type: 'ai',
          content: result.message || '已为您处理完成',
          showButton: result.type === 'query_result',
        };
        return [...filtered, aiMsg];
      });
      
      // 如果有查询结果，触发 onQuery 回调
      if (result.type === 'query_result' && result.data) {
        onQuery?.(result);
        console.log('[查询结果]', result);
      }
      
    } catch (error: any) {
      console.error('[API Error]', error);
      
      // 移除加载消息，显示错误
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMsg.id);
        const errorMsg: ChatMessage = {
          id: Date.now(),
          type: 'ai',
          content: `抱歉，处理请求时出错了：${error.message}。请检查后端服务是否启动。`,
        };
        return [...filtered, errorMsg];
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-area">
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.type}`}>
            <div className="bubble-content">
              <p>{msg.content}</p>
              {msg.showButton && (
                <Button type="primary" className="query-btn">查找</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <div className="input-container">
          <Input
            value={inputValue}
            onChange={(value) => setInputValue(value)}
            onKeyDown={handleKeyPress}
            placeholder="输入自然语言查询，如：查询 flexdb 的 test 表..."
          />
          <div className="input-actions">
            <button className="send-btn" onClick={handleSend}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;

