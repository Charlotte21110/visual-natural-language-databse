import { useState } from 'react';
import { Button, Input } from 'tea-component';
import '../styles/tea-theme.less';

const MainLayout = () => {
  const [inputValue, setInputValue] = useState('');
  const [activeMenu, setActiveMenu] = useState('home');
  const [tableTab, setTableTab] = useState('table');

  // 模拟数据
  const mockData = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', created: '2024-01-15' },
    { id: 2, name: '李四', email: 'lisi@example.com', created: '2024-02-20' },
    { id: 3, name: '王五', email: 'wangwu@example.com', created: '2024-03-10' },
    { id: 4, name: '赵六', email: 'zhaoliu@example.com', created: '2024-04-05' },
    { id: 5, name: '钱七', email: 'qianqi@example.com', created: '2024-05-18' }
  ];

  const menuItems = [
    { id: 'home', label: '首页', icon: '🏠' },
    { id: 'query', label: '查询', icon: '🔍' },
    { id: 'model', label: '模型', icon: '📊' },
    { id: 'setting', label: '设置', icon: '⚙️' }
  ];

  const headerTabs = ['首页', '查询', '模型', '设置'];
  const [activeHeaderTab, setActiveHeaderTab] = useState(0);

  return (
    <div className="main-layout">
      {/* 侧边栏 */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">📊</div>
            <span>QueryFlow</span>
          </div>
        </div>
        
        <div className="menu">
          {menuItems.map(item => (
            <div 
              key={item.id}
              className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.id)}
            >
              <span style={{ marginRight: '12px' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>
      
      <div className="main-content">
        {/* 头部 */}
        <div className="header">
          <div className="header-left">
            <div className="header-tabs">
              {headerTabs.map((tab, index) => (
                <div 
                  key={index}
                  className={`tab ${activeHeaderTab === index ? 'active' : 'default'}`}
                  onClick={() => setActiveHeaderTab(index)}
                >
                  {tab}
                </div>
              ))}
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span>ecommerce.users</span>
              <div className="user-avatar">U</div>
            </div>
          </div>
        </div>
        
        <div className="content">
          {/* 聊天区域 */}
          <div className="chat-area">
            <div className="chat-messages">
              {/* 数据库卡片 */}
              <div className="card">
                <div className="card-header">
                  <span style={{ marginRight: '8px' }}>📊</span> 生产环境 MySQL
                </div>
                <div className="card-content">
                  <div className="database-tree">
                    <div style={{ padding: '8px 0' }}>📁 ecommerce</div>
                    <div style={{ padding: '8px 0 8px 20px' }}>📁 users</div>
                    <div style={{ padding: '8px 0 8px 20px' }}>📁 orders</div>
                    <div style={{ padding: '8px 0 8px 20px' }}>📁 products</div>
                    <div style={{ padding: '8px 0' }}>📁 analytics</div>
                  </div>
                </div>
              </div>
              
              {/* 欢迎消息 */}
              <div className="card">
                <div className="card-content">
                  <p>你好！我是 QueryFlow 助手，请用自然语言描述你想要查询的数据，例如："查找最近注册的用户" 或 "统计每月订单量"。</p>
                </div>
              </div>
              
              {/* 回复消息 */}
              <div className="card">
                <div className="card-content">
                  <p>我已经为你查询了数据，请看右侧面板中的结果。</p>
                  <Button type="primary">查找一下</Button>
                </div>
              </div>
            </div>
            
            <div className="chat-input">
              <div className="input-container">
                <Input
                  value={inputValue}
                  onChange={(value) => setInputValue(value)}
                  placeholder="输入自然语言查询，如：查找最近注册的用户..."
                  style={{ flex: 1 }}
                />
                <Button 
                  type="primary"
                  style={{ marginLeft: '12px' }}
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
          
          {/* 数据面板 */}
          <div className="data-panel">
            <div className="panel-header">
              <div className="panel-title">查询结果</div>
              <div className="panel-actions">
                <Button type="weak" style={{ marginRight: '8px', padding: '4px 12px' }}>编辑</Button>
                <Button type="weak" style={{ padding: '4px 12px' }}>导出</Button>
              </div>
            </div>
            
            <div className="panel-content">
              <div className="table-header">
                <div className="table-tabs">
                  {['表格', '图形', '分析'].map((tab, index) => (
                    <div 
                      key={index}
                      className={`tab ${tableTab === ['table', 'chart', 'analysis'][index] ? 'active' : 'default'}`}
                      onClick={() => setTableTab(['table', 'chart', 'analysis'][index])}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="table-container">
                <table className="tea-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>NAME</th>
                      <th>EMAIL</th>
                      <th>CREATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.map(row => (
                      <tr key={row.id}>
                        <td>{row.id}</td>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>{row.created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;