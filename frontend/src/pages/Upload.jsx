import { useRef, useState } from 'react';
import { Api } from '../api';
import AnimatedBackground from '@/components/AnimatedBackground.jsx';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [meta, setMeta] = useState({
    title: '',
    publisher: '',
    producer: '',
    genre: '',
    ageRating: 'PG',
  });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); // 0..100
  const xhrRef = useRef(null);

  function updateMeta(key, value) {
    setMeta((m) => ({ ...m, [key]: value }));
  }

  function onFilePick(e) {
    const f = e.target.files?.[0] || null;
    if (!f) return setFile(null);
    if (!f.type?.startsWith('video/')) {
      setStatus('⚠️ Please select a video file.');
      return;
    }
    setFile(f);
    setStatus('');
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type?.startsWith('video/')) {
      setStatus('⚠️ Please drop a video file.');
      return;
    }
    setFile(f);
  }
  const onDragOver = (e) => e.preventDefault();

  function resetForm() {
    setFile(null);
    setMeta({ title: '', publisher: '', producer: '', genre: '', ageRating: 'PG' });
    setProgress(0);
  }

  async function upload(e) {
    e.preventDefault();
    setStatus('');

    if (!file) return setStatus('⚠️ Please choose a video file.');
    if (!meta.title.trim()) return setStatus('⚠️ Title is required.');
    if (!meta.publisher.trim()) return setStatus('⚠️ Publisher is required.');
    if (!meta.producer.trim()) return setStatus('⚠️ Producer is required.');
    if (!meta.genre.trim()) return setStatus('⚠️ Genre is required.');

    try {
      setBusy(true);
      setProgress(0);
      setStatus('Requesting secure upload link…');

      // 1) Get upload SAS
      const { uploadUrl, blobName } = await Api.getUploadSas();

      // 2) PUT with progress (XHR gives upload progress events)
      setStatus('Uploading video…');
      await putBlobWithProgress(uploadUrl, file, (p, xhr) => {
        setProgress(p);
        xhrRef.current = xhr; // keep ref for cancel
      });

      // 3) Create metadata
      setStatus('Saving video details…');
      await Api.createVideo({
        title: meta.title.trim(),
        publisher: meta.publisher.trim(),
        producer: meta.producer.trim(),
        genre: meta.genre.trim(),
        ageRating: meta.ageRating,
        blobName,
      });

      setStatus('✅ Upload complete!');
      resetForm();
    } catch (err) {
      let msg = err?.message || 'Upload failed.';
      if (/Failed to fetch/i.test(msg)) {
        msg += ` – check Blob CORS for ${window.location.origin}`; // why: common local issue
      }
      setStatus(`❌ ${msg}`);
    } finally {
      setBusy(false);
      xhrRef.current = null;
      setTimeout(() => setStatus(''), 3000);
    }
  }

  function cancelUpload() {
    try {
      xhrRef.current?.abort(); // cancel PUT
      setBusy(false);
      setProgress(0);
      setStatus('Upload cancelled.');
    } catch {}
  }

  return (
    <div className="up">
      {/* Aurora background (creator palette: purple/blue) */}
      <AnimatedBackground opacity={1} colors={{ a: '#7c3aed', b: '#1d7afc', c: '#22d3ee' }} />

      {/* Page-scoped styles */}
      <style>{`
        .up { 
          position: relative;
          --glass:#0b1220e6; --text:#e9eef6; --muted:#9aa6b2; --line:rgba(255,255,255,.10);
          --c1:#7c3aed; --c2:#1d7afc; --ok:#16a34a; --warn:#f59e0b; --err:#ef4444;
          color: var(--text);
        }

        /* Glassy hero over aurora */
        .up-hero {
          backdrop-filter: blur(6px);
          background: rgba(15, 23, 42, 0.40);
          padding: 28px 16px 12px;
          border-bottom: 1px solid var(--line);
        }
        .up-hero__inner { max-width: 1080px; margin: 0 auto; }
        .up-title { margin: 0; font-size: 30px; letter-spacing: .2px; }
        .up-sub { margin: 6px 0 0; color: var(--muted); }

        /* Main card */
        .up-card { 
          max-width: 1080px; margin: 16px auto; 
          background: var(--glass); color: var(--text);
          border: 1px solid var(--line); border-radius: 18px; padding: 16px;
          box-shadow: 0 14px 36px rgba(0,0,0,.40);
          backdrop-filter: blur(4px);
          position: relative;
        }
        /* subtle gradient border glow */
        .up-card::before{
          content:""; position:absolute; inset:0; border-radius:18px; pointer-events:none;
          padding:1px; background: linear-gradient(120deg, color-mix(in oklab, var(--c1) 40%, transparent), color-mix(in oklab, var(--c2) 40%, transparent));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }

        .up-grid { display: grid; gap: 18px; }
        @media (min-width: 960px){ .up-grid { grid-template-columns: 1fr 1fr; align-items: start; } }

        /* Dropzone */
        .drop { 
          border: 1.5px dashed rgba(255,255,255,.25); background: rgba(255,255,255,.03); border-radius: 14px;
          min-height: 220px; display: grid; place-items: center; padding: 18px; transition: .15s;
        }
        .drop:hover { border-color: rgba(255,255,255,.4); background: rgba(255,255,255,.06); }
        .drop--picked { place-items: start; }
        .drop__cta { text-align:center; cursor:pointer; }
        .drop__icon { font-size: 44px; margin-bottom: 6px; }
        .drop__label { font-weight: 800; }
        .drop__hint { font-size: 12px; color: var(--muted); margin-top: 4px; }

        .picked { width: 100%; }
        .picked__name { font-weight: 800; }
        .picked__meta { color: var(--muted); font-size: 12px; margin-top: 4px; }
        .picked__actions { display:flex; gap:8px; margin-top: 10px; }

        /* Progress */
        .prog { width:100%; height: 10px; background: rgba(255,255,255,.08); border-radius: 999px; overflow:hidden; margin-top: 14px; }
        .prog__bar { 
          height:100%; width:0%;
          background: linear-gradient(90deg, var(--c1), var(--c2));
          transition: width .15s ease;
        }

        /* Form */
        .form .field { display:grid; gap:6px; margin-bottom:12px; }
        .form .row { display:grid; gap:12px; }
        @media (min-width: 560px) { .form .row { grid-template-columns: 1fr 1fr; } }
        .form label { font-size: 13px; color: var(--muted); }
        .form input, .form select { 
          background:#0a101c; border:1px solid rgba(255,255,255,.14); color:var(--text);
          border-radius: 10px; padding: 10px 12px; outline:none; transition: .15s;
        }
        .form input:focus, .form select:focus { border-color:#6aa8ff; box-shadow:0 0 0 3px rgba(106,168,255,.18); }

        /* Buttons */
        .actions { margin-top: 4px; display:flex; gap:10px; }
        .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; border-radius:10px; padding:10px 14px;
          border:1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color:var(--text); font-weight:800; cursor:pointer; transition:.15s; }
        .btn:hover { background: rgba(255,255,255,.12); transform: translateY(-1px); }
        .btn[disabled]{ opacity:.6; cursor:not-allowed; }
        .btn--primary{ background: linear-gradient(90deg, var(--c1), var(--c2)); border:none; }
        .btn--primary:hover{ filter: brightness(1.06); }
        .btn--ghost{ background: transparent; border-color: rgba(255,255,255,.25); }
        .btn--danger{ background: #b91c1c; border-color: #7f1d1d; }
        .btn--danger:hover{ filter: brightness(1.05); }

        /* Flash */
        .flash{ margin-top:8px; padding:10px 12px; border-radius:10px; font-size:14px; }
        .flash.success { background: rgba(22,163,74,.20); border:1px solid rgba(22,163,74,.5); }
        .flash.warn { background: rgba(245,158,11,.15); border:1px solid rgba(245,158,11,.45); }
        .flash.error { background: rgba(239,68,68,.15); border:1px solid rgba(239,68,68,.45); }
      `}</style>

      {/* Hero */}
      <section className="up-hero">
        <div className="up-hero__inner">
          <h1 className="up-title">Upload a Video</h1>
          <p className="up-sub">Only creators can upload. Fill the details and drop your video file.</p>
        </div>
      </section>

      {/* Card */}
      <section className="up-card">
        <form className="up-grid" onSubmit={upload}>
          {/* Dropzone */}
          <div
            className={`drop ${file ? 'drop--picked' : ''}`}
            onDrop={onDrop}
            onDragOver={onDragOver}
            role="button"
            tabIndex={0}
          >
            <input
              type="file"
              accept="video/*"
              id="file"
              onChange={onFilePick}
              disabled={busy}
              style={{ display: 'none' }}
            />

            {!file ? (
              <label htmlFor="file" className="drop__cta">
                <div className="drop__icon">🎬</div>
                <div className="drop__label">Drag & drop a video here or <span style={{ textDecoration:'underline', color:'#9bd1ff' }}>browse</span></div>
                <div className="drop__hint">MP4 / MOV / WEBM</div>
              </label>
            ) : (
              <div className="picked">
                <div className="picked__name">{file.name}</div>
                <div className="picked__meta">{(file.size / (1024 * 1024)).toFixed(1)} MB · {file.type || 'video'}</div>
                <div className="picked__actions">
                  <label htmlFor="file" className="btn btn--ghost" disabled={busy}>Change</label>
                  <button type="button" className="btn btn--ghost" onClick={() => setFile(null)} disabled={busy}>Remove</button>
                </div>

                {busy && (
                  <div className="prog">
                    <div className="prog__bar" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Meta form */}
          <div className="form">
            <div className="field">
              <label>Title</label>
              <input
                placeholder="Title"
                value={meta.title}
                onChange={(e) => updateMeta('title', e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="row">
              <div className="field">
                <label>Publisher</label>
                <input
                  placeholder="Publisher"
                  value={meta.publisher}
                  onChange={(e) => updateMeta('publisher', e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="field">
                <label>Producer</label>
                <input
                  placeholder="Producer"
                  value={meta.producer}
                  onChange={(e) => updateMeta('producer', e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Genre</label>
                <input
                  placeholder="Genre"
                  value={meta.genre}
                  onChange={(e) => updateMeta('genre', e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="field">
                <label>Age Rating</label>
                <select
                  value={meta.ageRating}
                  onChange={(e) => updateMeta('ageRating', e.target.value)}
                  disabled={busy}
                >
                  <option>G</option>
                  <option>PG</option>
                  <option>+12</option>
                  <option>+15</option>
                  <option>+18</option>
                </select>
              </div>
            </div>

            <div className="actions">
              {!busy ? (
                <button className="btn btn--primary" type="submit" disabled={!file}>
                  Upload Video
                </button>
              ) : (
                <button type="button" className="btn btn--danger" onClick={cancelUpload}>
                  Cancel Upload
                </button>
              )}
            </div>

            {status && (
              <div
                className={`flash ${
                  status.startsWith('✅') ? 'success' : status.startsWith('⚠️') ? 'warn' : status.startsWith('❌') ? 'error' : ''
                }`}
              >
                {status}
              </div>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

/** PUT blob with progress using XHR (fetch has no upload progress). */
function putBlobWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob'); // required for create
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      onProgress?.(pct, xhr);
    };

    xhr.onerror = () => reject(new Error('Network error during blob upload.'));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Blob upload failed (${xhr.status}) ${xhr.statusText}`));
    };

    xhr.send(file);
  });
}