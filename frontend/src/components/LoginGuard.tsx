import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { accountCapiRequest } from '@/request';

export interface UserInfo {
  ownerUin: number;
  loginUin: number;
  appId?: number;
  userName?: string;
}

interface LoginGuardProps {
  children: ReactNode;
  /** Cookie 更新回调，用于通知父组件更新 cookie.json */
  onCookieUpdate?: () => void;
}

/**
 * 登录守卫组件
 *
 * 对应 dev-platform: src/framework/components/LoginGuard/LoginGuard.tsx
 *
 * 工作流程：
 * 1. 调用 account/DescribeCurrentUserDetails 检测登录态
 * 2. 如果成功 → 渲染 children
 * 3. 如果失败 → 显示配置指引
 */
export function LoginGuard({ children, onCookieUpdate }: LoginGuardProps) {
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string>('');
  const [pastedJson, setPastedJson] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const checkLogin = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const result = await accountCapiRequest({
        action: 'DescribeCurrentUserDetails',
        data: {},
      });
      const { uin, ownerUin, collInfo, appId } = result || {};
      const loginUin = collInfo?.uin || uin;
      const userName = collInfo?.userName || collInfo?.nickname || '';
      setUserInfo({ ownerUin, loginUin, appId: appId?.[0], userName });
      setState('success');
    } catch (err: any) {
      setState('error');
      const code = err?.code || err?.detail?.code || '';
      if (['VERIFY_LOGIN_FAILED', 'VERIFY_USER_FAILED'].includes(code)) {
        setError('登录态无效，请按照下方步骤配置 Cookie');
      } else {
        setError(err?.message || err?.reason || JSON.stringify(err));
      }
    }
  }, []);

  const handleSaveCookie = async () => {
    if (!pastedJson.trim()) return;

    setSaveStatus('saving');
    try {
      // 验证 JSON 是否有效
      const cookieArray = JSON.parse(pastedJson);
      if (!Array.isArray(cookieArray)) {
        throw new Error('请输入 JSON 数组格式');
      }

      // 调用后端 API 保存 cookie.json
      // 这里我们用 fetch 直接调用一个内部 API
      const response = await fetch('/api/save-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookieJson: pastedJson }),
      });

      if (!response.ok) {
        // 如果内部 API 不存在，尝试调用 Vite 代理
        throw new Error('需要重启开发服务器以加载新 Cookie');
      }

      setSaveStatus('success');
      onCookieUpdate?.();
      setTimeout(() => {
        checkLogin();
      }, 1000);
    } catch (e: any) {
      console.error('保存 Cookie 失败:', e);
      setSaveStatus('error');
      setError(e.message || '保存失败，请重启开发服务器后重试');
    }
  };

  useEffect(() => {
    checkLogin();
  }, [checkLogin]);

  // 加载中
  if (state === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>正在验证登录态...</div>
          <div style={{ color: '#999' }}>正在调用腾讯云接口检测认证状态</div>
        </div>
      </div>
    );
  }

  // 未登录 / 鉴权失败
  if (state === 'error') {
    return (
      <div style={{ maxWidth: 720, margin: '60px auto', padding: 24 }}>
        <h1 style={{ color: '#ff4d4f', marginBottom: 16 }}>登录态验证失败</h1>
        <div
          style={{
            padding: 16,
            background: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <strong>错误信息：</strong> {error}
        </div>

        <h2>配置步骤</h2>
        <div
          style={{
            padding: 20,
            background: '#f6f8fa',
            border: '1px solid #d0d7de',
            borderRadius: 8,
            lineHeight: 2,
          }}
        >
          <p><strong>第一步：</strong>在浏览器打开并登录</p>
          <a
            href="https://tcb.cloud.tencent.com/login"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              background: '#1677ff',
              color: '#fff',
              borderRadius: 6,
              textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            打开腾讯云登录页
          </a>

          <p><strong>第二步：</strong>登录成功后，在控制台 Console 中执行以下代码：</p>
          <pre
            style={{
              background: '#1e1e1e',
              color: '#d4d4d4',
              padding: 16,
              borderRadius: 6,
              overflow: 'auto',
              fontSize: 13,
            }}
          >
            {`copy(JSON.stringify(
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
));`}
          </pre>

          <p><strong>第三步：</strong>把复制的 JSON 粘贴到下方输入框：</p>
          <textarea
            value={pastedJson}
            onChange={(e) => setPastedJson(e.target.value)}
            placeholder='[{"name":"skey","value":"xxx"}, {"name":"uin","value":"xxx"}, ...]'
            style={{
              width: '100%',
              height: 150,
              padding: 12,
              fontSize: 13,
              fontFamily: 'monospace',
              border: '1px solid #d0d7de',
              borderRadius: 6,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />

          <button
            onClick={handleSaveCookie}
            disabled={!pastedJson.trim() || saveStatus === 'saving'}
            style={{
              padding: '10px 24px',
              background: saveStatus === 'success' ? '#52c41a' : '#1677ff',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: pastedJson.trim() && saveStatus !== 'saving' ? 'pointer' : 'not-allowed',
              fontSize: 15,
              marginRight: 12,
            }}
          >
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'success' ? '已保存 ✓' : '保存 Cookie'}
          </button>

          <span style={{ color: '#666', fontSize: 13 }}>
            保存后会自动验证登录态
          </span>

          {saveStatus === 'error' && (
            <div style={{ marginTop: 12, color: '#ff4d4f' }}>
              {error}
            </div>
          )}
        </div>

        <button
          onClick={checkLogin}
          style={{
            marginTop: 20,
            padding: '10px 24px',
            background: '#1677ff',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          重新检测登录态
        </button>
      </div>
    );
  }

  // 已登录
  return (
    <>
      {/* 顶部显示登录信息 */}
      <div
        style={{
          background: '#f0f5ff',
          borderBottom: '1px solid #d6e4ff',
          padding: '8px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 13,
          color: '#666',
        }}
      >
        <span>
          已登录 | UIN: {userInfo?.loginUin}
          {userInfo?.userName ? ` (${userInfo.userName})` : ''}
          {userInfo?.ownerUin !== userInfo?.loginUin ? ` | 主账号: ${userInfo?.ownerUin}` : ''}
        </span>
        <span style={{ color: '#52c41a' }}>认证状态: 正常</span>
      </div>
      {children}
    </>
  );
}
