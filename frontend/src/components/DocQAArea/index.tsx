import { useState } from 'react';
import { Button, Input } from 'tea-component';
import './style.less';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
}

const DocQAArea = () => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, type: 'ai', content: '你好！我是文档问答助手。请输入您的问题，我将基于知识库为您解答。' },
  ]);

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
    setInputValue('');
    
    // 添加加载提示
    const loadingMsg: ChatMessage = {
      id: messages.length + 2,
      type: 'ai',
      content: '正在查询知识库...',
    };
    setMessages(prev => [...prev, loadingMsg]);
    
    try {
      // 调用文档问答 Agent API（不同于数据处理的接口）
      const response = await fetch('http://localhost:3001/api/doc-qa/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userInput,
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
          content: result.answer || result.message || '抱歉，暂时无法回答这个问题。',
        };
        return [...filtered, aiMsg];
      });
      
    } catch (error: any) {
      console.error('[Doc QA API Error]', error);
      
      // 移除加载消息，显示错误
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== loadingMsg.id);
        const errorMsg: ChatMessage = {
          id: Date.now(),
          type: 'ai',
          content: `抱歉，查询知识库时出错了：${error.message}`,
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
    <div className="doc-qa-page">
      <div className="doc-qa-content">
        <div className="doc-qa-header">
          <h2>文档问答机</h2>
          <p>连接知识库的智能解答</p>
        </div>

        <div className="doc-qa-area">
          <div className="qa-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`qa-bubble ${msg.type}`}>
                <div className="bubble-content">
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="qa-input">
            <div className="input-container">
              <Input
                value={inputValue}
                onChange={(value) => setInputValue(value)}
                onKeyDown={handleKeyPress}
                placeholder="输入您的问题..."
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
      </div>
    </div>
  );
};

export default DocQAArea;

