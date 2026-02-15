import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import ChatArea from '../../components/ChatArea';
import QueryResult from '../../components/QueryResult';
import './style.less';

interface QueryResultData {
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

const MainLayout = () => {
  const [activeMenu, setActiveMenu] = useState('home');
  const [queryResult, setQueryResult] = useState<QueryResultData | null>(null);

  const handleQuery = (result: QueryResultData) => {
    console.log('Query result received:', result);
    setQueryResult(result);
  };

  const handleSuggestionClick = (suggestion: string) => {
    console.log('Suggestion clicked:', suggestion);
    // TODO: 处理建议点击，可以自动填充到输入框
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
            <QueryResult 
              data={queryResult?.data}
              metadata={queryResult?.metadata}
              suggestions={queryResult?.suggestions}
              message={queryResult?.message}
              onSuggestionClick={handleSuggestionClick}
            />
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

