import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import AnimatedBackground from '@/components/AnimatedBackground.jsx';

export default function VideoDetail() {
  const { id } = useParams();

  const [video, setVideo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(true);
  const [errVideo, setErrVideo] = useState('');

  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [errLists, setErrLists] = useState('');

  const [commentText, setCommentText] = useState('');
  const [stars, setStars] = useState(4);
  const [postingComment, setPostingComment] = useState(false);
  const [postingRating, setPostingRating] = useState(false);
  const [flash, setFlash] = useState('');

  const playUrl = useMemo(() => {
    if (!video) return '';
    return (
      video.playbackUrl ||
      video.readUrl ||
      video.playUrl ||
      video.streamingUrl ||
      video.sasUrl ||
      video.url ||
      video.blobUrl ||
      ''
    );
  }, [video]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingVideo(true);
        setErrVideo('');
        const v = await api.get(`/videos/${id}`);
        if (alive) setVideo(v);
      } catch (e) {
        if (alive) setErrVideo(e?.message || 'Failed to load video');
      } finally {
        if (alive) setLoadingVideo(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function loadLists() {
    setLoadingLists(true);
    setErrLists('');
    try {
      const [cRes, rRes] = await Promise.all([
        api.get(`/videos/${id}/comments`),
        api.get(`/videos/${id}/ratings`),
      ]);
      setComments(Array.isArray(cRes) ? cRes : cRes?.items ?? []);
      setRatings(Array.isArray(rRes) ? rRes : rRes?.items ?? []);
    } catch (e) {
      setErrLists(e?.message || 'Failed to load comments/ratings');
    } finally {
      setLoadingLists(false);
    }
  }
  useEffect(() => {
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const avg = useMemo(() => {
    if (!ratings.length) return null;
    const sum = ratings.reduce((s, x) => s + Number(x.stars || 0), 0);
    return (sum / ratings.length).toFixed(1);
  }, [ratings]);

  async function onPostComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return setFlash('Please enter a comment.');
    try {
      setPostingComment(true);
      setFlash('');
      await api.post(`/videos/${id}/comments`, { text: commentText.trim() });
      setCommentText('');
      setFlash('✅ Comment added.');
      await loadLists();
    } catch (e) {
      setFlash(`❌ ${e?.message || 'Failed to post comment.'}`);
    } finally {
      setPostingComment(false);
      clearFlashSoon();
    }
  }

  async function onPostRating(e) {
    e.preventDefault();
    try {
      setPostingRating(true);
      setFlash('');
      await api.post(`/videos/${id}/ratings`, { stars: Number(stars) });
      setFlash('✅ Rating submitted.');
      await loadLists();
    } catch (e) {
      setFlash(`❌ ${e?.message || 'Failed to submit rating.'}`);
    } finally {
      setPostingRating(false);
      clearFlashSoon();
    }
  }

  function clearFlashSoon() {
    const t = setTimeout(() => setFlash(''), 2200);
    return () => clearTimeout(t);
  }

  if (loadingVideo) return <div>Loading…</div>;
  if (errVideo) return <div className="flash error">{errVideo}</div>;
  if (!video) return <div className="flash error">Video not found.</div>;

  return (
    <div className="vd">
      {/* Aurora background (shared palette: teal/indigo) */}
      <AnimatedBackground opacity={1} colors={{ a: '#22d3ee', b: '#6366f1', c: '#06b6d4' }} />

      <div className="vd-frame">
        <header className="vd-head">
          <h2 className="vd-title">{video.title || 'Untitled'}</h2>
          <div className="vd-meta">
            {video.publisher} • {video.genre} • {video.ageRating}
          </div>
        </header>

        {/* Player */}
        <div className="vd-player">
          <div className="vd-player__inner">
            {playUrl ? (
              <video key={playUrl} src={playUrl} controls className="vd-video" />
            ) : (
              <div className="vd-player__empty">No playback URL provided.</div>
            )}
          </div>
        </div>

        {flash && (
          <div className={`flash ${flash.startsWith('✅') ? 'success' : flash.startsWith('❌') ? 'error' : ''}`} style={{ marginBottom: 12 }}>
            {flash}
          </div>
        )}

        {/* Actions */}
        <div className="vd-actions">
          <form onSubmit={onPostComment} className="vd-card">
            <h3 className="vd-card-title">Leave a Comment</h3>
            <div className="vd-row">
              <textarea
                className="vd-input vd-grow"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                disabled={postingComment}
                placeholder="Write your thoughts…"
              />
              <button className="vd-btn vd-primary" disabled={postingComment || !commentText.trim()}>
                {postingComment ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>

          <form onSubmit={onPostRating} className="vd-card vd-card--compact">
            <h3 className="vd-card-title">Rate Video</h3>
            <div className="vd-row">
              <select
                className="vd-input"
                value={String(stars)}
                onChange={(e) => setStars(Number(e.target.value))}
                disabled={postingRating}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'star' : 'stars'}
                  </option>
                ))}
              </select>
              <button className="vd-btn vd-primary" disabled={postingRating}>
                {postingRating ? 'Submitting…' : 'Submit'}
              </button>
            </div>
            {avg && (
              <div className="vd-subtle" style={{ marginTop: 8 }}>
                Avg: {avg} / 5 · {ratings.length} rating{ratings.length === 1 ? '' : 's'}
              </div>
            )}
          </form>
        </div>

        {/* Lists */}
        <section className="vd-lists">
          <h3 className="vd-sec-title">Comments</h3>
          {loadingLists ? (
            <div>Loading…</div>
          ) : errLists ? (
            <div className="flash error">{errLists}</div>
          ) : comments.length === 0 ? (
            <p className="vd-muted">No comments yet. Be the first!</p>
          ) : (
            <ul className="vd-list">
              {comments.map((c) => (
                <li key={c.id} className="vd-list-item">
                  <div className="vd-list-meta">
                    {c.userEmail} • {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                  </div>
                  <div className="vd-list-text">{c.text}</div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="vd-sec-title" style={{ marginTop: 18 }}>Ratings</h3>
          {loadingLists ? (
            <div>Loading…</div>
          ) : ratings.length === 0 ? (
            <p className="vd-muted">No ratings yet.</p>
          ) : (
            <ul className="vd-list">
              {ratings.map((r) => (
                <li key={r.id} className="vd-list-item">
                  <span className="vd-list-text">⭐ {r.stars} · {r.userEmail}</span>
                  <span className="vd-subtle"> · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <style>{vdCss}</style>
    </div>
  );
}

const vdCss = `
.vd{
  position: relative;
  --text:#e8ecf3; --muted:#a9b4c4; --line:rgba(255,255,255,.10);
  --c1:#22d3ee; --c2:#6366f1; /* teal/indigo */
  color: var(--text);
}

/* Framed center column */
.vd-frame{ max-width: 1080px; margin: 0 auto; padding: 12px 16px 20px; }

/* Glassy header over aurora */
.vd-head{
  backdrop-filter: blur(6px);
  background: rgba(15, 23, 42, 0.40);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.vd-title{ margin:0; font-size:24px; letter-spacing:.2px; }
.vd-meta{ color: var(--muted); margin-top: 4px; }

/* Player with subtle gradient border glow */
.vd-player{ margin: 10px 0 16px; }
.vd-player__inner{
  position: relative; border-radius: 14px; overflow: hidden; aspect-ratio: 16 / 9;
  background: #000; box-shadow: 0 14px 36px rgba(0,0,0,.4);
}
.vd-player__inner::before{
  content:""; position:absolute; inset:0; border-radius:14px; pointer-events:none; padding:1px;
  background: linear-gradient(120deg, color-mix(in oklab, var(--c1) 40%, transparent), color-mix(in oklab, var(--c2) 40%, transparent));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.vd-player__empty{ color:#cdd6e4; padding:12px; }
.vd-video{ width:100%; height:100%; display:block; }

/* Actions row */
.vd-actions{ display:grid; gap:16px; margin:12px 0 20px; }
@media (min-width:900px){ .vd-actions{ grid-template-columns:1fr 340px; align-items:start; } }

.vd-card{
  position: relative;
  background: rgba(11, 18, 32, 0.85);
  border:1px solid var(--line);
  border-radius:14px;
  padding:12px;
  backdrop-filter: blur(4px);
}
.vd-card::before{
  content:""; position:absolute; inset:0; border-radius:14px; pointer-events:none; padding:1px;
  background: linear-gradient(120deg, color-mix(in oklab, var(--c1) 30%, transparent), color-mix(in oklab, var(--c2) 30%, transparent));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.vd-card--compact{ padding:12px; }
.vd-card-title{ margin:0 0 8px; font-size:16px; }

.vd-row{ display:flex; gap:10px; align-items:flex-start; }
.vd-grow{ flex:1 1 auto; }

.vd-input{
  width:100%; padding:10px 12px; border:1px solid rgba(255,255,255,.12);
  border-radius:10px; background:#0a101c; color:var(--text); font-size:14px; outline:none; transition:.15s;
}
.vd-input:focus{ border-color:#6aa8ff; box-shadow:0 0 0 3px rgba(106,168,255,.2); }

.vd-btn{
  padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.06); color:var(--text); font-weight:700; cursor:pointer; transition:.15s;
}
.vd-btn:hover{ background:rgba(255,255,255,.12); transform: translateY(-1px); }
.vd-btn:disabled{ opacity:.6; cursor:not-allowed; }
.vd-primary{ border:none; background:linear-gradient(90deg, var(--c1), var(--c2)); }
.vd-primary:hover{ filter:brightness(1.05); }

/* Lists */
.vd-lists{ margin-top:10px; }
.vd-sec-title{ margin: 0 0 8px; font-size: 18px; }
.vd-muted{ color:#c9d3e2; }

.vd-list{ list-style:none; padding:0; margin:0; display:grid; gap:10px; }
.vd-list-item{
  position: relative;
  background: rgba(11, 18, 32, 0.85);
  border:1px solid var(--line);
  border-radius:12px; padding:10px 12px;
  backdrop-filter: blur(4px);
}
.vd-list-item::before{
  content:""; position:absolute; inset:0; border-radius:12px; pointer-events:none; padding:1px;
  background: linear-gradient(120deg, color-mix(in oklab, var(--c1) 18%, transparent), color-mix(in oklab, var(--c2) 18%, transparent));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.vd-list-meta{ font-size:12px; color:#93a0b2; margin-bottom:6px; }
.vd-list-text{ color:#e9eef6; }

/* Flash (reuse site styles if present) */
.flash{ margin-top:8px; padding:10px 12px; border-radius:10px; font-size:14px; }
.flash.success { background: rgba(22,163,74,.20); border:1px solid rgba(22,163,74,.5); }
.flash.error { background: rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.45); }
`;