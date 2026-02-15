import { useState, useEffect } from 'react';
import { Button, Table } from 'tea-component';
import DocumentView from '../DocumentView';
import './style.less';

interface QueryResultProps {
  data?: Array<Record<string, unknown>>;
  metadata?: {
    dbType?: string;
    table?: string;
    rowCount?: number;
    columns?: string[];
    displayType?: 'table' | 'document';
  };
  suggestions?: string[];
  message?: string;
  onSuggestionClick?: (suggestion: string) => void;
}

const QueryResult = ({ data, metadata, suggestions, message, onSuggestionClick }: QueryResultProps) => {
  // 根据 displayType 决定默认显示的 tab
  const defaultTab = metadata?.displayType === 'document' ? 'document' : 'table';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // 当 metadata 变化时，更新 activeTab
  useEffect(() => {
    if (metadata?.displayType) {
      setActiveTab(metadata.displayType === 'document' ? 'document' : 'table');
    }
  }, [metadata?.displayType]);

  const resultData = data || [];

  // 根据数据库类型决定显示哪些 tabs
  const tabs = metadata?.displayType === 'document' 
    ? [
        { key: 'document', label: '文档' },
        { key: 'analysis', label: '分析' }
      ]
    : [
        { key: 'table', label: '表格' },
        { key: 'analysis', label: '分析' }
      ];

  // 动态生成表格列配置
  const columns = (metadata?.columns || Object.keys(resultData[0] || {})).map(key => ({
    key,
    header: key,
    render: (record: Record<string, unknown>) => {
      const value = record[key];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value ?? '');
    }
  }));

  return (
    <div className="query-result">
      <div className="result-header">
        <div className="result-title">
          {message || '查询结果'}
        </div>
        <div className="result-actions">
          <Button type="weak" size="s">导出</Button>
        </div>
      </div>

      <div className="result-content">
        <div className="result-tabs">
          {tabs.map(tab => (
            <div
              key={tab.key}
              className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="result-body">
          {activeTab === 'table' && (
            <div className="table-wrapper">
              <Table
                columns={columns}
                records={resultData}
                recordKey="_id"
                bordered
              />
            </div>
          )}

          {activeTab === 'document' && (
            <DocumentView documents={resultData} />
          )}

          {activeTab === 'analysis' && (
            <div className="analysis-placeholder">
              <p>分析视图开发中...</p>
            </div>
          )}
        </div>

        <div className="result-footer">
          <div className="result-count">
            共 {metadata?.rowCount || resultData.length} 条记录
            {metadata?.table && <span> · 集合: {metadata.table}</span>}
            {metadata?.dbType && <span> · 类型: {metadata.dbType}</span>}
          </div>
          
          {suggestions && suggestions.length > 0 && (
            <div className="result-suggestions">
              <div className="suggestions-title">建议操作：</div>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    type="weak"
                    size="s"
                    onClick={() => onSuggestionClick?.(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QueryResult;
