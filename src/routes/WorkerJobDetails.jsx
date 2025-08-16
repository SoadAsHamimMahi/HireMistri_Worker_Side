import { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';

export default function WorkerJobDetails() {
  const { id } = useParams();
  const ctx = useContext(AuthContext) || {};
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

  // auth state (use context first, then fallback to Firebase directly)
  const [uid, setUid] = useState(ctx?.user?.uid || null);
  const [authReady, setAuthReady] = useState(Boolean(ctx?.user)); // toggled true when we know

  // job state
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // apply/proposal UI state
  const [applyOpen, setApplyOpen] = useState(false);
  const [proposal, setProposal] = useState('');
  const [saving, setSaving] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState('');

  // keep uid in sync with AuthContext
  useEffect(() => {
    setUid(ctx?.user?.uid || null);
    setAuthReady(true);
  }, [ctx?.user]);

  // fallback: subscribe to Firebase Auth directly (in case context isn't mounted here)
  useEffect(() => {
    let unsub = () => { };
    (async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const auth = getAuth();
        unsub = onAuthStateChanged(auth, (u) => {
          setUid(u?.uid || null);
          setAuthReady(true);
        });
      } catch {
        // firebase/auth not available; rely on context only
        if (ctx?.user === undefined) setAuthReady(true);
      }
    })();
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load job
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr('');
        const res = await fetch(`${base}/api/browse-jobs/${id}`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!ignore) setJob(data);
      } catch (e) {
        if (!ignore) setErr(e.message || 'Failed to load job');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id, base]);

  // submit proposal → POST /api/applications
  const submitProposal = async () => {
    if (!authReady) return; // wait until we know
    if (!uid) {
      alert('Please sign in first.');
      return;
    }
    const text = proposal.trim();
    if (!text) {
      alert('Please write a short proposal.');
      return;
    }
    try {
      setSaving(true);
      setAppliedMsg('');

      // 👇 derive worker info first
      const workerEmail = ctx?.user?.email?.toLowerCase() || '';
      const workerName = ctx?.user?.displayName || ctx?.profile?.name || '';
      const workerPhone = ctx?.user?.phoneNumber || ctx?.profile?.phone || '';

      // 👇 build the request body
      const body = {
        jobId: String(job._id || id),
        workerId: uid,
        clientId: job.clientId || '',
        postedByEmail: workerEmail,  // for backward compat
        workerEmail,
        workerName,
        workerPhone,
        proposalText: text
      };

      const res = await fetch(`${base}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.status === 409) {
        setAppliedMsg('You already applied to this job.');
        return;
      }
      if (!res.ok) throw new Error('Failed to submit');

      setAppliedMsg('✅ Proposal submitted!');
      setApplyOpen(false);
      setProposal('');
    } catch (e) {
      console.error(e);
      setAppliedMsg('❌ Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center">Loading…</div>;
  if (err) return <div className="py-16 text-center text-red-600">❌ {err}</div>;
  if (!job) return <div className="py-16 text-center">Not found.</div>;

  // Images + poster fields (fallbacks so it doesn’t crash if missing)
  const images = Array.isArray(job.images) && job.images.length ? job.images : [
    'https://via.placeholder.com/1200x700?text=No+Image',
  ];
  const poster = {
    name: job.postedByName || job.clientName || 'Unknown',
    email: (job.postedByEmail || job.email || '').toString(),
    phone: job.postedByPhone || job.phone || '',
    clientId: job.clientId || '',
  };

  return (
    <div className="max-w-6xl mx-auto p-5 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-primary">{job.title}</h1>
        <Link to="/jobs" className="btn btn-outline btn-sm">Back</Link>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: main image */}
        <div className="lg:col-span-3">
          <div className="rounded-xl overflow-hidden border bg-white">
            <div className="aspect-[16/9]">
              <img
                src={images[0]}
                alt={job.title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>
          </div>

          {/* Thumbs if multiple images */}
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.slice(1).map((src, i) => (
                <div key={i} className="aspect-[16/10] rounded-lg overflow-hidden border">
                  <img src={src} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Applicants preview (if present on job) */}
          <div className="mt-8 bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Applicants</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                {job.applicants?.length || 0} total
              </span>
            </div>
            {Array.isArray(job.applicants) && job.applicants.length ? (
              <ul className="space-y-2">
                {job.applicants.map((a, i) => (
                  <li key={i} className="border rounded-lg p-3 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-base-200 flex items-center justify-center text-sm font-bold">
                        {(a.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="leading-tight">
                        <p className="font-medium text-gray-800">{a.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">⭐ {a.rating ?? '—'}</p>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 mr-1">Bid:</span>
                      <span className="font-semibold text-green-700">৳{a.price ?? '—'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 border rounded-lg text-sm text-gray-600 bg-base-100">
                No applicants yet.
              </div>
            )}
          </div>
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Meta */}
          <div className="bg-white border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${(job.status || 'active').toLowerCase() === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-700'
                }`}>
                {job.status || 'active'}
              </span>
              {Array.isArray(job.skills) && job.skills.map((s, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  {s}
                </span>
              ))}
            </div>

            <InfoRow icon="🧰" label="Category" value={job.category || '—'} />
            <InfoRow icon="📍" label="Location" value={job.location || '—'} />
            <InfoRow icon="💸" label="Budget" value={`৳${job.budget ?? 0}`} />
            <InfoRow icon="📅" label="Schedule" value={`${job.date || '—'}${job.time ? ` • ${job.time}` : ''}`} />
            <InfoRow icon="⏱️" label="Posted"
              value={timeAgo(job.createdAt || job.date)} />
          </div>

          {/* Description */}
          <div className="bg-white border rounded-xl p-5">
            <p className="text-gray-500 text-sm mb-1">Description</p>
            <p className="leading-relaxed text-gray-800">
              {job.description || 'No description provided.'}
            </p>
          </div>

          {/* Poster / Client */}
          <div className="bg-white border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Job Owner</h3>
            <div className="space-y-2 text-sm">
              <InfoRow icon="👤" label="Name" value={poster.name} />
              {poster.email && <InfoRow icon="✉️" label="Email" value={poster.email} />}
              {poster.phone && <InfoRow icon="📞" label="Phone" value={poster.phone} />}
              {poster.clientId && <InfoRow icon="🆔" label="Client ID" value={poster.clientId} />}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                className="btn btn-primary grow"
                onClick={() => setApplyOpen(o => !o)}
                disabled={!authReady} // wait for auth check
              >
                {applyOpen ? 'Cancel' : 'Apply for this Job'}
              </button>
              <button className="btn grow">Save</button>
            </div>

            {/* Proposal box */}
            {applyOpen && (
              <div className="bg-white border rounded-xl p-4">
                {!uid && authReady && (
                  <div className="mb-2 text-sm text-red-600">
                    You must sign in to submit a proposal.
                  </div>
                )}
                <label className="block text-sm font-medium mb-1">Your Proposal</label>
                <textarea
                  className="textarea textarea-bordered w-full min-h-[140px]"
                  placeholder="Write a short proposal explaining why you're a good fit…"
                  value={proposal}
                  onChange={(e) => setProposal(e.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    className="btn btn-success"
                    onClick={submitProposal}
                    disabled={saving || !authReady}
                  >
                    {saving ? 'Submitting…' : 'Request for the work'}
                  </button>
                </div>
              </div>
            )}

            {/* Feedback */}
            {appliedMsg && (
              <div className={`text-sm ${appliedMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
                {appliedMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- small helpers ---------- */
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-xl leading-6">{icon}</span>
      <div className="text-sm">
        <p className="text-gray-500">{label}</p>
        <p className="font-medium text-gray-800 break-words">{value}</p>
      </div>
    </div>
  );
}

function timeAgo(input) {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return 'just now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const days = Math.floor(h / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}
