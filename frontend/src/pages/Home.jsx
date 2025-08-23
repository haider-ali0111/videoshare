import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AnimatedBackground from '@/components/AnimatedBackground.jsx';

export default function Home() {
  const [latest, setLatest] = useState([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.get('/videos');
        const list = Array.isArray(data) ? data : data?.items ?? [];
        if (!cancelled) setLatest(list);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load latest videos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSearch(e) {
    e.preventDefault();
    setSearching(true);
    setError('');
    try {
      const data = await api.get('/videos', { params: q ? { q } : undefined });
      const list = Array.isArray(data) ? data : data?.items ?? [];
      setResults(list);
    } catch (e) {
      setError(e?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  const list = results.length ? results : latest;

  return (
    <div className="home">
      {/* Aurora background (consumer palette: teal/indigo) */}
      <AnimatedBackground opacity={1} colors={{ a: '#22d3ee', b: '#6366f1', c: '#06b6d4' }} />

      <section className="home-hero">
        <div className="home-hero__inner">
          <h1 className="home-title">Browse Videos</h1>
          <p className="home-subtitle">Discover the latest uploads from creators.</p>

          <form className="home-search" onSubmit={onSearch}>
            <input
              className="home-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, publisher, or genre…"
            />
            <button className="home-btn home-btn--primary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
            {results.length > 0 && (
              <button
                type="button"
                className="home-btn"
                onClick={() => setResults([])}
                title="Clear results"
              >
                Clear
              </button>
            )}
          </form>

          {error && <div className="home-flash error">{error}</div>}
        </div>
      </section>

      <section className="home-content">
        {loading ? (
          <div className="home-muted">Loading…</div>
        ) : list.length === 0 ? (
          <div className="home-muted">{results.length ? 'No matching videos.' : 'No videos yet.'}</div>
        ) : (
          <div className="video-grid">
            {list.map((v) => (
              <Link key={v.id} to={`/video/${v.id}`} className="video-card">
                <div className="video-thumb" aria-hidden />
                <div className="video-body">
                  <div className="video-title">{v.title}</div>
                  <div className="video-meta">
                    {v.publisher} • {v.genre} • {v.ageRating}
                  </div>
                  <div className="video-date">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{css}</style>
    </div>
  );
}

const css = `
.home{
  position: relative;
  --text:#e8ecf3; --muted:#9aa4b2;
  color: var(--text);
}

/* Glassy header over aurora */
.home-hero{
  backdrop-filter: blur(6px);
  background: rgba(15, 23, 42, 0.40); /* translucent glass over aurora */
  padding: 28px 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.home-hero__inner{ max-width:1080px; margin:0 auto; }
.home-title{ margin:0; font-size:28px; letter-spacing: .2px; }
.home-subtitle{ margin:6px 0 14px; color:var(--muted); }

/* Search bar */
.home-search{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.home-input{
  flex:1 1 320px; min-width:260px;
  background:#0a101c; color:var(--text);
  border:1px solid rgba(255,255,255,.16); border-radius:10px;
  padding:10px 12px; outline:none; transition: .15s;
}
.home-input:focus{ border-color:#6aa8ff; box-shadow:0 0 0 3px rgba(106,168,255,.2); }
.home-btn{
  padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06); color:var(--text); cursor:pointer; font-weight:700;
  transition: .15s;
}
.home-btn:hover{ background:rgba(255,255,255,.12); transform: translateY(-1px); }
.home-btn--primary{ border:none; background:linear-gradient(90deg, #22d3ee, #6366f1); }
.home-btn--primary:hover{ filter:brightness(1.05); }
.home-flash.error{ margin-top:10px; background:rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.45); color:#ffb3b3; padding:8px 10px; border-radius:10px; }

/* Content area */
.home-content{ max-width:1080px; margin:16px auto; padding:0 16px; }
.home-muted{ color:#c9d3e2; }

/* Video cards */
.video-grid{
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap:16px;
}
.video-card{
  text-decoration:none; color:inherit;
  background: rgba(11, 18, 32, 0.85);
  border:1px solid rgba(255,255,255,.08);
  border-radius:14px;
  overflow:hidden;
  transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s;
  display:flex; flex-direction:column;
  backdrop-filter: blur(2px);
}
.video-card:hover{
  transform:translateY(-2px);
  border-color:rgba(255,255,255,.18);
  box-shadow:0 14px 28px rgba(0,0,0,.35);
  background: rgba(11, 18, 32, 0.92);
}
.video-thumb{
  background:
    radial-gradient(60% 80% at 20% 20%, rgba(34,211,238,.35), transparent 60%),
    radial-gradient(60% 80% at 80% 30%, rgba(99,102,241,.35), transparent 60%),
    linear-gradient(180deg, #101828, #0b1220);
  height:140px;
}
.video-body{ padding:12px; }
.video-title{ font-weight:800; color:#e9eef6; }
.video-meta{ font-size:12px; color:#a9b4c4; margin-top:2px; }
.video-date{ font-size:12px; color:#93a0b2; margin-top:6px; }
`;