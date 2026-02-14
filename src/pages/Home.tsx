import { useState } from 'react';
import { tcbCapiRequest, lowcodeCapiRequest } from '@/request';

/**
 * 首页 - 接口测试面板
 */
export default function Home() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 示例：调用 TCB 服务的 DescribeEnvs
  const testTcbApi = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await tcbCapiRequest({
        action: 'DescribeEnvs',
        data: {},
      });
      setResult(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  // 示例：调用 lowcode 服务
  const testLowcodeApi = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await lowcodeCapiRequest({
        action: 'DescribeApplication',
        data: {},
      });
      setResult(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setError(err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Natural Language DB</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        接口调试面板 - 请确保已在浏览器登录过{' '}
        <a href="https://weda-api.cloud.tencent.com" target="_blank" rel="noreferrer">
          微搭控制台
        </a>
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          onClick={testTcbApi}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#1677ff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '请求中...' : '测试 TCB: DescribeEnvs'}
        </button>

        <button
          onClick={testLowcodeApi}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#52c41a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '请求中...' : '测试 Lowcode: DescribeApplication'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 6,
            marginBottom: 16,
            color: '#ff4d4f',
          }}
        >
          <strong>错误：</strong>
          <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error}
          </pre>
        </div>
      )}

      {result && (
        <div
          style={{
            padding: 16,
            background: '#f6ffed',
            border: '1px solid #b7eb8f',
            borderRadius: 6,
          }}
        >
          <strong>返回结果：</strong>
          <pre
            style={{
              margin: '8px 0 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 500,
              overflow: 'auto',
            }}
          >
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
