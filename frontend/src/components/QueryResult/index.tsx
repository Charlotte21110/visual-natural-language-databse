import { useState } from 'react';
import { Button, Table } from 'tea-component';
import './style.less';

interface QueryResultProps {
  data?: Array<Record<string, unknown>>;
}

const QueryResult = ({ data }: QueryResultProps) => {
  const [activeTab, setActiveTab] = useState('table');

  // 模拟数据
  const mockData = data || [
    { id: 1, name: '张三', email: 'zhangsan@example.com', created: '2024-01-15' },
    { id: 2, name: '李四', email: 'lisi@example.com', created: '2024-02-20' },
    { id: 3, name: '王五', email: 'wangwu@example.com', created: '2024-03-10' },
    { id: 4, name: '赵六', email: 'zhaoliu@example.com', created: '2024-04-05' },
    { id: 5, name: '钱七', email: 'qianqi@example.com', created: '2024-05-18' }
  ];

  const tabs = [
    { key: 'table', label: '表格' },
    { key: 'chart', label: '图形' },
    { key: 'analysis', label: '分析' }
  ];

  // Table 列配置
  const columns = [
    {
      key: 'id',
      header: 'ID',
      width: 60,
    },
    {
      key: 'name',
      header: '名称',
      width: 100,
    },
    {
      key: 'email',
      header: '邮箱',
      width: 180,
    },
    {
      key: 'created',
      header: '创建时间',
      width: 120,
    },
  ];

  return (
    <div className="query-result">
      <div className="result-header">
        <div className="result-title">查询结果</div>
        <div className="result-actions">
          <Button type="weak" size="s">编辑</Button>
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
                records={mockData}
                recordKey="id"
                bordered
              />
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="chart-placeholder">
              <p>图形视图开发中...</p>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="analysis-placeholder">
              <p>分析视图开发中...</p>
            </div>
          )}
        </div>

        <div className="result-footer">
          共 {mockData.length} 条记录
        </div>
      </div>
    </div>
  );
};

export default QueryResult;

