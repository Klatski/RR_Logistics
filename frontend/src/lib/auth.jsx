import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getStoredUser, getToken, setStoredUser, setToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    api.me()
      .then((r) => {
        if (!cancelled) {
          setUser(r.user);
          setStoredUser(r.user);
        }
      })
      .catch((e) => {
        if (e.status === 401) {
          setToken(null);
          setStoredUser(null);
          setUser(null);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (loginValue, password) => {
    setLoading(true);
    try {
      const res = await api.login(loginValue, password);
      setToken(res.token);
      setStoredUser(res.user);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser(updated);
    setStoredUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
