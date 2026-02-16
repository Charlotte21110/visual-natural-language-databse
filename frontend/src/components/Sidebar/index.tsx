import { useState } from 'react';
import { message } from 'tea-component';
import EnvSelector from '../EnvSelector';
import { useAuth } from '../../hooks/useAuth';
import './style.less';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  activeMenu: string;
  onMenuChange: (key: string) => void;
}

const Sidebar = ({ activeMenu, onMenuChange }: SidebarProps) => {
  const [expandedDbs, setExpandedDbs] = useState<string[]>(['mysql-prod', 'ecommerce']);
  const [selectedTable, setSelectedTable] = useState('users');
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      // 调用后端退出接口
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // 清除前端状态
      localStorage.clear();
      logout();
      
      message.success({ content: '已退出登录' });
    } catch (error) {
      console.error('退出失败:', error);
      // 即使后端失败，也清除前端状态
      localStorage.clear();
      logout();
    }
  };

  // 一级菜单
  const menus: MenuItem[] = [
    {
      key: 'home',
      label: '首页',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      key: 'model',
      label: '模型',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
        </svg>
      ),
    },
    {
      key: 'settings',
      label: '设置',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
    },
  ];

  // 数据库结构
  const databases = [
    {
      id: 'mysql-prod',
      name: '生产环境 MySQL',
      status: 'online',
      children: [
        {
          id: 'ecommerce',
          name: 'ecommerce',
          children: [
            { id: 'users', name: 'users', type: 'table' },
            { id: 'orders', name: 'orders', type: 'table' },
            { id: 'products', name: 'products', type: 'table' },
            { id: 'reviews', name: 'reviews', type: 'table' },
          ]
        },
        { id: 'analytics', name: 'analytics', children: [] }
      ]
    },
    {
      id: 'mongodb-dev',
      name: '开发环境 MongoDB',
      status: 'offline',
      children: []
    }
  ];

  const toggleExpand = (id: string) => {
    setExpandedDbs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <span>QueryFlow</span>
        </div>
      </div>

      {/* 一级菜单 */}
      <div className="menu-list">
        {menus.map(menu => (
          <div
            key={menu.key}
            className={`menu-item ${activeMenu === menu.key ? 'active' : ''}`}
            onClick={() => onMenuChange(menu.key)}
          >
            <span className="menu-icon">{menu.icon}</span>
            <span className="menu-label">{menu.label}</span>
          </div>
        ))}
      </div>

      {/* 环境选择器 - 仅在首页显示 */}
      {activeMenu === 'home' && (
        <>
          <div className="sidebar-section">
            <EnvSelector />
          </div>

          <div className="db-tree">
            {databases.map(db => (
              <div key={db.id} className="db-group">
                <div className="db-item" onClick={() => toggleExpand(db.id)}>
                  <span className="expand-icon">{expandedDbs.includes(db.id) ? '▼' : '▶'}</span>
                  <span className={`db-status ${db.status}`}></span>
                  <span className="db-name">{db.name}</span>
                </div>
                {expandedDbs.includes(db.id) && db.children.map(schema => (
                  <div key={schema.id} className="schema-group">
                    <div className="schema-item" onClick={() => toggleExpand(schema.id)}>
                      <span className="expand-icon">{expandedDbs.includes(schema.id) ? '▼' : '▶'}</span>
                      <span>{schema.name}</span>
                    </div>
                    {expandedDbs.includes(schema.id) && schema.children?.map(table => (
                      <div
                        key={table.id}
                        className={`table-item ${selectedTable === table.id ? 'active' : ''}`}
                        onClick={() => setSelectedTable(table.id)}
                      >
                        <span>{table.name}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="logout-button" onClick={handleLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>退出登录</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;

