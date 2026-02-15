import { useState } from 'react';
import { Button, Input, message, notification } from 'tea-component';
import { useAuth } from '../../hooks/useAuth';
import './style.less';

const Login = () => {
  const [cookieValue, setCookieValue] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!cookieValue.trim()) {
      message.error({ content: '请输入 Cookie' });
      return;
    }

    try {
      // 解析 Cookie JSON
      const cookieArray = JSON.parse(cookieValue);
      if (!Array.isArray(cookieArray)) {
        message.error({ content: 'Cookie 格式错误，请输入 JSON 数组格式' });
        return;
      }

      // 转换成 Cookie 字符串格式 (name=value; name2=value2)
      const cookieString = cookieArray
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

      // 发送给后端保存
      // TODO marisa 封装下本地的后端接口啊
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cookie: cookieString,
          envId: '' // 可选，如果后端 .env 没配置可以从这里传
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        message.success({ content: '登录成功！Cookie 已保存' });
        // 保存到本地（用于显示登录状态）
        localStorage.setItem('cookieData', cookieValue);
        login('authenticated');
      } else {
        message.error({ content: result.message || '登录失败' });
      }
    } catch (e: any) {
      console.error('登录失败:', e);
      message.error({ content: `登录失败: ${e.message}` });
    }
  };

  const steps = [
    { num: 1, title: '登录腾讯云', desc: '打开腾讯云控制台并登录账号' },
    { num: 2, title: '获取 Cookie', desc: '按 F12 打开控制台执行脚本' },
    { num: 3, title: '粘贴登录', desc: '将 Cookie 粘贴到下方输入框' },
  ];

  const scriptCode = `copy(JSON.stringify(
  document.cookie.split('; ').map(c => {
    const [name, ...v] = c.split('=');
    return {
      name,
      value: v.join('='),
      domain: '.cloud.tencent.com',
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    };
  }),
  null,
  2
));

console.log('已复制到剪贴板！直接粘贴即可');
console.log('共导出 ' + document.cookie.split('; ').length + ' 个 cookies');`;

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-left">
          <div className="logo">
            <div className="logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <span>QueryFlow</span>
          </div>
          <h1>用自然语言</h1>
          <h2 className="highlight">查询你的数据库</h2>
          <p>
            无需编写 SQL，只需描述你想要的数据。支持
            MySQL、MongoDB 等多种数据库，智能分析并可视化
            你的查询结果。
          </p>
          <div className="database-buttons">
            <div className="db-btn">MySQL</div>
            <div className="db-btn">MongoDB</div>
            <div className="db-btn">PostgreSQL</div>
          </div>
        </div>

        <div className="login-right">
          <div className="login-form">
            {/* 步骤指示器 */}
            <div className="steps-indicator">
              {steps.map((step, index) => (
                <div
                  key={step.num}
                  className={`step-item ${currentStep >= step.num ? 'active' : ''}`}
                  onClick={() => setCurrentStep(step.num)}
                >
                  <div className="step-num">{step.num}</div>
                  <div className="step-info">
                    <div className="step-title">{step.title}</div>
                    <div className="step-desc">{step.desc}</div>
                  </div>
                  {index < steps.length - 1 && <div className="step-line" />}
                </div>
              ))}
            </div>

            {/* 步骤内容 */}
            <div className="step-content">
              {currentStep === 1 && (
                <div className="step-panel">
                  <p>请先登录腾讯云控制台：</p>
                  <Button
                    type="primary"
                    className="query-btn"
                    onClick={() => {
                      window.open('https://console.cloud.tencent.com', '_blank');
                      setCurrentStep(2);
                    }}
                  >
                    打开腾讯云控制台 →
                  </Button>
                </div>
              )}

              {currentStep === 2 && (
                <div className="step-panel">
                  <p>在腾讯云控制台按 <strong>F12</strong> 打开开发者工具，切换到 <strong>Console</strong> 标签，执行以下脚本：</p>
                  <div className="code-block">
                    <code>{scriptCode}</code>
                    <Button
                      type="link"
                      onClick={() => {
                        navigator.clipboard.writeText(scriptCode);
                        notification.success({ content: '脚本已复制到剪贴板' });
                      }}
                    >
                      复制脚本
                    </Button>
                  </div>
                  <p className="tip">执行后 Cookie 会自动复制到剪贴板</p>
                  <Button type="primary" className="query-btn" onClick={() => setCurrentStep(3)}>
                    下一步 →
                  </Button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="step-panel">
                  <p>将复制的 Cookie 粘贴到下方：</p>
                  <Input.TextArea
                    value={cookieValue}
                    onChange={(value) => setCookieValue(value)}
                    placeholder='粘贴从腾讯云控制台复制的 Cookie JSON...'
                    rows={5}
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  <Button
                    type="primary"
                    className="query-btn"
                    style={{ width: '100%', marginTop: '16px' }}
                    onClick={handleLogin}
                  >
                    登录 →
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

