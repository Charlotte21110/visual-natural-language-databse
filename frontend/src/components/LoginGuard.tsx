import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Login from '../pages/Login';
import '../styles/tea-theme.less';

export const LoginGuard = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查认证状态
    const timer = setTimeout(() => {
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // 加载中
  if (loading) {
    return (
      <div className="spin-container" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div className="spin-loader"></div>
      </div>
    );
  }

  // 未登录，显示登录页面
  if (!isAuthenticated) {
    return <Login />;
  }

  // 已登录，显示主页面
  return <>{children}</>;
};