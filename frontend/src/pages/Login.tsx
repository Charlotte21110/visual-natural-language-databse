import { useState } from 'react';
import { Button, Input, Modal } from 'tea-component';
import { useAuth } from '../hooks/useAuth';
import '../styles/tea-theme.less';

const Login = () => {
  const [cookieValue, setCookieValue] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const { login } = useAuth();

  const handleLogin = () => {
    if (!cookieValue.trim()) {
      alert('请输入 Cookie');
      return;
    }
    
    try {
      // 尝试解析 cookie JSON
      const cookieArray = JSON.parse(cookieValue);
      if (Array.isArray(cookieArray)) {
        // 保存到 localStorage 或调用 login
        localStorage.setItem('cookieData', cookieValue);
        login('authenticated');
      } else {
        alert('Cookie 格式错误，请输入 JSON 数组格式');
      }
    } catch (e) {
      alert('Cookie 格式错误，请输入正确的 JSON 格式');
    }
  };

  const helpContent = `
1. 打开浏览器，登录腾讯云控制台 (https://console.cloud.tencent.com)

2. 按 F12 打开开发者工具，切换到 Console（控制台）标签页

3. 复制并执行以下脚本：

   copy(document.cookie.split('; ').map(c => {
     const [name, value] = c.split('=');
     return { name, value };
   }))

4. 脚本执行后，Cookie 已自动复制到剪贴板

5. 回到本页面，粘贴到输入框中，点击登录即可
  `;

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-left">
          <div className="logo">
            <div className="logo-icon">📊</div>
            <span>QueryFlow</span>
          </div>
          <h1>用自然语言</h1>
          <h2>查询你的数据库</h2>
          <p>
            无需编写 SQL，只需描述你想要的数据。支持 MySQL、MongoDB 等多种数据库，
            智能分析并可视化你的查询结果。
          </p>
          <div className="database-buttons">
            <div className="db-btn">MySQL</div>
            <div className="db-btn">MongoDB</div>
            <div className="db-btn">PostgreSQL</div>
          </div>
        </div>
        
        <div className="login-right">
          <div className="login-form">
            <div className="login-header">
              <h3 style={{ textAlign: 'center', marginBottom: '24px', color: '#1e293b' }}>登录 QueryFlow</h3>
              <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
                使用腾讯云 Console Cookie 登录
              </p>
            </div>
            
            <div className="form-group">
              <div className="form-item">
                <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Cookie JSON</span>
                  <Button 
                    type="link" 
                    onClick={() => setShowHelp(true)}
                    style={{ fontSize: '13px', padding: 0 }}
                  >
                    如何获取？
                  </Button>
                </div>
                <Input.TextArea
                  value={cookieValue}
                  onChange={(value) => setCookieValue(value)}
                  placeholder='[{"name":"key1","value":"val1"},{"name":"key2","value":"val2"}]'
                  rows={6}
                  style={{ fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>
              
              <div className="form-item">
                <Button 
                  type="primary"
                  style={{ width: '100%' }}
                  onClick={handleLogin}
                >
                  登录
                </Button>
              </div>
              
              <div className="form-item" style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  登录即表示您同意我们的服务条款
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 帮助弹窗 */}
      <Modal
        visible={showHelp}
        caption="如何获取 Cookie"
        onClose={() => setShowHelp(false)}
      >
        <Modal.Body>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            fontSize: '13px', 
            lineHeight: '1.8',
            backgroundColor: '#f8fafc',
            padding: '16px',
            borderRadius: '8px',
            color: '#1e293b'
          }}>
            {helpContent}
          </pre>
        </Modal.Body>
        <Modal.Footer>
          <Button type="primary" onClick={() => setShowHelp(false)}>
            我知道了
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Login;