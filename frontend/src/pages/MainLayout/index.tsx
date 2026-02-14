import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import ChatArea from '../../components/ChatArea';
import QueryResult from '../../components/QueryResult';
import './style.less';

const MainLayout = () => {
  const [activeMenu, setActiveMenu] = useState('home');

  const handleQuery = (query: string) => {
    console.log('Query:', query);
    // TODO: 处理查询逻辑
  };

  return (
    <div className="main-layout">
      {/* 左侧菜单 */}
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* 主内容区 */}
      <div className="main-content">
        {activeMenu === 'home' && (
          <div className="content">
            {/* 中间对话框 */}
            <ChatArea onQuery={handleQuery} />

            {/* 右侧查询结果 */}
            <QueryResult />
          </div>
        )}

        {activeMenu === 'model' && (
          <div className="page-placeholder">
            <h2>模型管理</h2>
            <p>模型配置功能开发中...</p>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div className="page-placeholder">
            <h2>设置</h2>
            <p>设置功能开发中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainLayout;

