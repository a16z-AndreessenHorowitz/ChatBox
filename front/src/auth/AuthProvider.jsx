import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { refreshAccessToken } from '../services/api/request';

const AuthContext = createContext({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const hasStoredSession =
        localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (!hasStoredSession) {
        setLoading(false);
        return;
      }

      try {
        const data = await refreshAccessToken();
        if (!active) return;
        const email = data.email || localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || '';
        const account = { id: data.user_id, email, role: data.role,
          name: email ? email.split('@')[0] : 'Người dùng', initials: 'TS' };
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('userRole', data.role);
        setUser(account);
      } catch {
        if (active) {
          setUser(null);
          for (const storage of [localStorage, sessionStorage]) {
            storage.removeItem('userEmail');
            storage.removeItem('userId');
            storage.removeItem('userRole');
          }
        }
      } finally { if (active) setLoading(false); }
    };
    restore();
    const onLogin = (event) => setUser(event.detail);
    const onLogout = () => setUser(null);
    window.addEventListener('auth:login', onLogin);
    window.addEventListener('auth:logout', onLogout);
    return () => {
      active = false;
      window.removeEventListener('auth:login', onLogin);
      window.removeEventListener('auth:logout', onLogout);
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
