import { useState } from 'react';
import { Button, Input } from 'tea-component';
import './style.less';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
  showButton?: boolean;
}

interface ChatAreaProps {
  onQuery?: (query: string) => void;
}

const ChatArea = ({ onQuery }: ChatAreaProps) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, type: 'ai', content: '你好！我是 QueryFlow 助手。请用自然语言描述你想要查询的数据，例如："查找最近注册的用户" 或 "统计每月订单量"。' },
    { id: 2, type: 'user', content: '查找最近注册的用户' },
    { id: 3, type: 'ai', content: '我已经为你查询了数据。请查看右侧面板中的结果。', showButton: true },
  ]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    // 添加用户消息
    const userMsg: ChatMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // 模拟 AI 回复
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: '我已经为你查询了数据。请查看右侧面板中的结果。',
        showButton: true,
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 500);
    
    onQuery?.(inputValue);
    setInputValue('');
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
            placeholder="输入自然语言查询，如：查找最近注册的用户..."
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

