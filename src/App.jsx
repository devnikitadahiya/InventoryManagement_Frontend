import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import './App.css';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { TOKEN_KEY } from './config';
import { apiRequest, UNAUTHORIZED_EVENT } from './api';

function App() {
  const savedToken = localStorage.getItem(TOKEN_KEY);
  const [session, setSession] = useState({
    token: savedToken || '',
    user: null,
  });
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(savedToken));

  useEffect(() => {
    const resolveUserSession = async () => {
      if (!session.token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const payload = await apiRequest(session.token, '/auth/me');
        setSession((prev) => ({
          ...prev,
          user: payload?.user || prev.user,
        }));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setSession({ token: '', user: null });
      } finally {
        setIsCheckingSession(false);
      }
    };

    resolveUserSession();
  }, [session.token]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_KEY);
      setSession({ token: '', user: null });
      setIsCheckingSession(false);
    };

    globalThis.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      globalThis.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = ({ token, user }) => {
    setSession({ token, user });
    setIsCheckingSession(false);
  };

  const handleLogout = () => {
    setSession({ token: '', user: null });
    setIsCheckingSession(false);
  };

  if (isCheckingSession) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <h1>Smart Inventory</h1>
          <p className="sub-text">Restoring your session...</p>
        </div>
      </div>
    );
  };

  return (
    <BrowserRouter>
      {session.token ? (
        <Dashboard
          token={session.token}
          user={session.user}
          onLogout={handleLogout}
        />
      ) : (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </BrowserRouter>
  );
}

export default App;
