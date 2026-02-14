import { useState } from 'react';
import { tcbCapiRequest, lowcodeCapiRequest, capiRequest } from '@/request';

export default function Home() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const runRequest = async (name: string, fn: () => Promise<any>) => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      console.log(`[请求] ${name}...`);
      const res = await fn();
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
        接口调试面板 - 登录态已通过 LoginGuard 验证
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          onClick={() =>
            runRequest('TCB/DescribeEnvs', () =>
              tcbCapiRequest({ action: 'DescribeEnvs', data: {} }),
            )
          }
          disabled={loading}
          style={btnStyle('#1677ff', loading)}
        >
          TCB: DescribeEnvs
        </button>

        <button
          onClick={() =>
            runRequest('Lowcode/DescribeApplication', () =>
              lowcodeCapiRequest({ action: 'DescribeApplication', data: {} }),
            )
          }
          disabled={loading}
          style={btnStyle('#52c41a', loading)}
        >
          Lowcode: DescribeApplication
        </button>

        <button
          onClick={() =>
            runRequest('Account/DescribeCurrentUserDetails', () =>
              capiRequest({ serviceType: 'account', action: 'DescribeCurrentUserDetails', data: {} }),
            )
          }
          disabled={loading}
          style={btnStyle('#722ed1', loading)}
        >
          Account: 用户详情
        </button>

        <button
          onClick={() =>
            runRequest('TCB/DescribeEnvBacklogs', () =>
              tcbCapiRequest({
                action: 'DescribeEnvBacklogs',
                data: { EnvId: 'marisa-dev-com-6g6urdyj6abb73ce' },
                extra: { region: 'ap-shanghai' },
              }),
            )
          }
          disabled={loading}
          style={btnStyle('#fa8c16', loading)}
        >
          TCB: DescribeEnvBacklogs
        </button>
      </div>

      {loading && (
        <div
          style={{
            padding: 16,
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          请求中...
        </div>
      )}

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

function btnStyle(bg: string, loading: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
    fontSize: 14,
  };
}
