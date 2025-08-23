import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from 'react-router-dom';

import App from './App.jsx';
import Home from './pages/Home.jsx';
import Upload from './pages/Upload.jsx';
import VideoDetail from './pages/VideoDetail.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import './index.css';

/* ---------- Auth helpers ---------- */
function readAuth() {
  try {
    const raw = localStorage.getItem('app.auth');
    return raw ? JSON.parse(raw) : null; // { token, user:{email, role} }
  } catch {
    return null;
  }
}

/** Protect routes by requiring auth; optionally a role. */
function ProtectedRoute({ children, requireRole }) {
  const auth = readAuth();
  const user = auth?.user || null;
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (requireRole && String(user.role || '').toLowerCase() !== String(requireRole).toLowerCase()) {
    // Hard-separate creator/consumer areas
    return <Navigate to={user.role === 'creator' ? '/creator' : '/consumer'} replace />;
  }
  return children;
}

/** Redirect `/` to the correct landing based on role. */
function RoleLanding() {
  const auth = readAuth();
  const role = String(auth?.user?.role || '').toLowerCase();
  if (role === 'creator') return <Navigate to="/creator" replace />;
  if (role === 'consumer') return <Navigate to="/consumer" replace />;
  return <Navigate to="/login" replace />;
}

/* ---------- UX helpers ---------- */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

/* ---------- Router Bootstrap ---------- */
const basename =
  (typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_BASEPATH) ||
  '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <App>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Role-based landings */}
          <Route path="/" element={<RoleLanding />} />

          {/* Consumer area */}
          <Route
            path="/consumer"
            element={
              <ProtectedRoute requireRole="consumer">
                <Home />
              </ProtectedRoute>
            }
          />

          {/* Creator area */}
          <Route
            path="/creator"
            element={
              <ProtectedRoute requireRole="creator">
                <Upload />
              </ProtectedRoute>
            }
          />

          {/* Shared (both roles) */}
          <Route
            path="/video/:id"
            element={
              <ProtectedRoute>
                <VideoDetail />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </App>
    </BrowserRouter>
  </React.StrictMode>
);