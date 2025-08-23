import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import AnimatedBackground from '@/components/AnimatedBackground.jsx';

const ROLES = ['consumer', 'creator'];

export default function Signup() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('consumer');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('app.auth');
      if (!raw) return;
      const session = JSON.parse(raw);
      const r = session?.user?.role;
      if (r === 'creator') navigate('/creator', { replace: true });
      else if (r === 'consumer') navigate('/consumer', { replace: true });
    } catch {}
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const e1 = email.trim().toLowerCase();

    if (!e1) return setError('Please enter a valid email.');
    if (!ROLES.includes(role)) return setError('Please choose a valid role.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return setError('Password must contain a letter and a number.');
    if (password !== confirm) return setError('Passwords do not match.');

    setBusy(true);
    try {
      const res = await fetch('/api/AuthRegister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e1, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create account.');

      const { token, user } = data;
      localStorage.setItem('app.auth', JSON.stringify({ token, user }));
      localStorage.setItem('app.user', JSON.stringify(user));

      const nextRole = String(user?.role || '').toLowerCase();
      const returnTo = location.state?.from?.pathname;
      if (nextRole === 'creator') {
        navigate(returnTo && returnTo.startsWith('/creator') ? returnTo : '/creator', { replace: true });
      } else if (nextRole === 'consumer') {
        navigate(returnTo && returnTo.startsWith('/consumer') ? returnTo : '/consumer', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Aurora background behind everything */}
      <AnimatedBackground opacity={1} colors={{ a: '#1d7afc', b: '#7c3aed', c: '#06b6d4' }} />

      <section className="auth-hero">
        <div className="auth-hero__inner">
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            Already have one? <Link to="/login" className="auth-link">Sign in</Link>.
          </p>
        </div>
      </section>

      <section className="auth-wrap">
        <form className="auth-card" onSubmit={onSubmit}>
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoFocus
            required
          />

          <div className="auth-row">
            <div className="auth-col">
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="auth-hint">At least 8 chars, with a letter and a number.</div>
            </div>
            <div className="auth-col">
              <label className="auth-label">Confirm password</label>
              <input
                className="auth-input"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <label className="auth-label">Role</label>
          <select className="auth-input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="consumer">Consumer</option>
            <option value="creator">Creator</option>
          </select>
          <div className="auth-hint">You’ll be taken to your role’s area after signup.</div>

          {error && <div className="auth-flash error">{error}</div>}

          <button className="auth-btn auth-btn--primary" type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>

          <div className="auth-actions">
            <Link to="/" className="auth-chip">Go to Home</Link>
            <Link to="/login" className="auth-chip">Sign in</Link>
          </div>
        </form>
      </section>

      <style>{authCss}</style>
    </div>
  );
}

const authCss = `
.auth-page{
  position: relative;
  --text:#e8ecf3; --muted:#9aa4b2;
  color: var(--text);
}

/* Glassy header over aurora */
.auth-hero{
  backdrop-filter: blur(6px);
  background: rgba(15, 23, 42, 0.40);
  padding: 28px 16px 20px; 
  border-bottom:1px solid rgba(255,255,255,.08);
  color: var(--text);
}
.auth-hero__inner{ max-width:960px; margin:0 auto; }
.auth-title{ margin:0; font-size:28px; letter-spacing:.2px; }
.auth-subtitle{ margin:6px 0 0; color:var(--muted); }
.auth-link{ color:#9bd1ff; }

/* Centered card */
.auth-wrap{ display:grid; place-items:center; padding:18px 16px; }
.auth-card{
  width:100%; max-width:480px;
  background: rgba(11, 18, 32, 0.85);
  color: var(--text);
  border:1px solid rgba(255,255,255,.08); 
  border-radius:16px; 
  padding:18px;
  box-shadow:0 8px 28px rgba(0,0,0,.3);
  backdrop-filter: blur(4px);
  display:grid; gap:10px;
}

/* Inputs / layout */
.auth-label{ font-size:13px; color:#c7d0de; }
.auth-input{
  width:100%;
  padding:10px 12px; border-radius:10px; 
  background:#0a101c; color:var(--text);
  border:1px solid rgba(255,255,255,.12); outline:none;
  transition: .15s;
}
.auth-input:focus{ border-color:#6aa8ff; box-shadow:0 0 0 3px rgba(106,168,255,.2); }

.auth-row{ display:grid; gap:12px; }
@media (min-width:560px){ .auth-row{ grid-template-columns:1fr 1fr; } }
.auth-col{ display:grid; gap:6px; }
.auth-hint{ font-size:12px; color:#97a3b4; }

/* Buttons */
.auth-btn{ padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06); color:var(--text); font-weight:700; cursor:pointer; transition:.15s; }
.auth-btn--primary{ border:none; background:linear-gradient(90deg, #1d7afc, #7c3aed); }
.auth-btn--primary:hover{ filter:brightness(1.05); transform: translateY(-1px); }
.auth-btn[disabled]{ opacity:.6; cursor:not-allowed; }

/* Chips */
.auth-actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
.auth-chip{
  text-decoration:none; padding:6px 10px; border-radius:10px;
  border:1px solid rgba(255,255,255,.16); color:var(--text); background:rgba(255,255,255,.06);
  transition:.15s;
}
.auth-chip:hover{ background:rgba(255,255,255,.12); }

/* Errors */
.auth-flash.error{
  background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.45);
  color:#ffb3b3; border-radius:10px; padding:8px 10px; font-size:14px;
}
`;