import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* --- session helpers (JWT-based) --- */
function readAuth() {
  try {
    const raw = localStorage.getItem('app.auth');
    return raw ? JSON.parse(raw) : null; // { token, user:{email, role} }
  } catch {
    return null;
  }
}
function writeAuth(auth) {
  try {
    if (auth) {
      localStorage.setItem('app.auth', JSON.stringify(auth));
      // legacy mirror for any existing code that still reads it
      if (auth.user) localStorage.setItem('app.user', JSON.stringify(auth.user));
    } else {
      localStorage.removeItem('app.auth');
      localStorage.removeItem('app.user');
    }
  } catch {}
}

export default function App({ children }) {
  const navigate = useNavigate();

  // auth = { token, user:{email, role} } | null
  const [auth, setAuth] = useState(() => readAuth());
  const user = auth?.user || null;

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'app.auth' || e.key === 'app.user') {
        setAuth(readAuth());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isCreator = useMemo(() => (user?.role || '').toLowerCase() === 'creator', [user]);
  const isConsumer = useMemo(() => (user?.role || '').toLowerCase() === 'consumer', [user]);

  function handleLogout() {
    writeAuth(null);
    setAuth(null);
    try {
      localStorage.removeItem('dev.userEmail'); // legacy cleanup
    } catch {}
    navigate('/login', { replace: true });
  }

  return (
    <div>
      <nav
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link to="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: 'none', color: '#333' }}>
            🎬 VideoShare
          </Link>

          <Link to="/" style={{ textDecoration: 'none', color: '#444' }}>
            Home
          </Link>

          {isCreator && (
            <Link to="/creator" style={{ textDecoration: 'none', color: '#444' }}>
              Creator
            </Link>
          )}
          {isConsumer && (
            <Link to="/consumer" style={{ textDecoration: 'none', color: '#444' }}>
              Consumer
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: '#555' }}>
                {user.email} · {user.role}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  background: '#f5f5f5',
                  cursor: 'pointer',
                  transition: '0.2s',
                  color: 'black',
                }}
                onMouseOver={(e) => (e.target.style.background = '#ff0000ff')}
                onMouseOut={(e) => (e.target.style.background = '#f5f5f5')}
              >
                Logout
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#007bff' }}>
                Login
              </Link>
              <Link to="/signup" style={{ textDecoration: 'none', color: '#007bff' }}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: 16 }}>{children}</div>
    </div>
  );
}