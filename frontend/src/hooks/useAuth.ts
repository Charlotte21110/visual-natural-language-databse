import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';

export const useAuth = () => {
  const [cookies, setCookie] = useCookies(['token']);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 检查是否有有效的 token
    const checkAuth = () => {
      const token = cookies.token;
      setIsAuthenticated(!!token);
    };

    checkAuth();
  }, [cookies]);

  const login = (token: string) => {
    setCookie('token', token, { path: '/', maxAge: 3600 });
    setIsAuthenticated(true);
  };

  const logout = () => {
    setCookie('token', '', { path: '/', maxAge: -1 });
    setIsAuthenticated(false);
  };

  return { isAuthenticated, login, logout };
};