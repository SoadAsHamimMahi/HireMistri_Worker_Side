// src/routes/ClientProfile.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ClientProfile() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!clientId) {
        setError('Missing client id');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE}/api/users/${encodeURIComponent(clientId)}/public`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Failed to load profile (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (!ignore) setProfile(data);
      } catch (e) {
        if (!ignore) setError(e?.message || 'Failed to load profile');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [clientId]);

  const displayName = useMemo(() => {
    if (!profile) return 'Client';
    return (
      profile.displayName ||
      [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
      'Client'
    );
  }, [profile]);

  const stats = profile?.stats || {};
  const jobsPosted = safeNum(stats.totalJobsPosted);
  const jobsCompleted = safeNum(stats.clientJobsCompleted);
  const hireRate = safeNum(stats.clientHireRate);
  const cancellationRate = safeNum(stats.clientCancellationRate);
  const rating = safeNum(profile?.averageRating || stats.averageRating);

  // Trust fields
  const emailVerified = !!profile?.emailVerified;
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : null;
  const lastActive = profile?.lastActiveAt ? new Date(profile.lastActiveAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  // Client-specific fields
  const preferences = profile?.preferences || {};
  const preferredCategories = Array.isArray(preferences.categories) ? preferences.categories : [];
  const budgetMin = preferences.budgetMin || null;
  const budgetMax = preferences.budgetMax || null;
  const currency = preferences.currency || 'BDT';

  if (loading) {
    return (
      <div className="min-h-screen page-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center gap-3 mb-6">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
              <i className="fas fa-arrow-left mr-2"></i>Back
            </button>
          </div>
          <div className="card bg-base-200 shadow-sm border border-base-300">
            <div className="card-body">
              <span className="loading loading-spinner loading-md"></span>
              <p className="opacity-70">Loading client profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg">
        <div className="max-w-5xl mx-auto p-6">
          <button className="btn btn-ghost btn-sm mb-6" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
          <div className="alert alert-error">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <h3 className="font-bold">Failed to load profile</h3>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen page-bg">
        <div className="max-w-5xl mx-auto p-6">
          <button className="btn btn-ghost btn-sm mb-6" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
          <div className="alert alert-warning">
            <i className="fas fa-info-circle"></i>
            <span>No profile data found.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left mr-2"></i>Back
          </button>
          <Link to="/jobs" className="btn btn-outline btn-sm">
            <i className="fas fa-briefcase mr-2"></i>Browse Jobs
          </Link>
        </div>

        <div className="card bg-base-200 shadow-sm border border-base-300 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              <div className="avatar">
                <div className="w-20 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  <img
                    src={profile.profileCover || 'https://i.pravatar.cc/150?img=12'}
                    alt={displayName}
                    onError={(e) => {
                      e.currentTarget.src = 'https://i.pravatar.cc/150?img=12';
                    }}
                  />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-base-content">{displayName}</h1>
                </div>
                <p className="text-base-content opacity-70 mt-1">
                  {profile.headline || 'No headline provided.'}
                </p>
                <p className="text-sm opacity-70 mt-2">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  {[profile.city, profile.country].filter(Boolean).join(', ') || 'Location not set'}
                </p>
                
                {/* Trust Badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {emailVerified ? (
                    <span className="badge badge-success badge-sm gap-1">
                      <i className="fas fa-check-circle"></i>Email Verified
                    </span>
                  ) : (
                    <span className="badge badge-warning badge-sm gap-1">
                      <i className="fas fa-exclamation-circle"></i>Email Not Verified
                    </span>
                  )}
                  {memberSince && (
                    <span className="badge badge-info badge-sm gap-1">
                      <i className="fas fa-calendar"></i>Member since {memberSince}
                    </span>
                  )}
                  {lastActive && (
                    <span className="badge badge-ghost badge-sm gap-1">
                      <i className="fas fa-clock"></i>Last active {lastActive}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[180px]">
                {(profile.phone || profile.email) && (
                  <div className="flex flex-col gap-2">
                    {profile.phone && (
                      <a
                        href={`tel:${profile.phone.replace(/\s/g, '')}`}
                        className="btn btn-success btn-sm"
                      >
                        <i className="fas fa-phone mr-2"></i>Call
                      </a>
                    )}
                    {profile.email && (
                      <a
                        href={`mailto:${profile.email}`}
                        className="btn btn-outline btn-sm"
                      >
                        <i className="fas fa-envelope mr-2"></i>Email
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card-body">
            {/* Hiring Credibility */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Hiring Credibility</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat bg-base-100 rounded-xl border border-base-300">
                  <div className="stat-title">Jobs Posted</div>
                  <div className="stat-value text-primary">{jobsPosted}</div>
                  <div className="stat-desc">Total</div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-300">
                  <div className="stat-title">Completed</div>
                  <div className="stat-value">{jobsCompleted}</div>
                  <div className="stat-desc">Jobs</div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-300">
                  <div className="stat-title">Hire Rate</div>
                  <div className="stat-value">{hireRate}%</div>
                  <div className="stat-desc">Acceptance rate</div>
                </div>
                <div className="stat bg-base-100 rounded-xl border border-base-300">
                  <div className="stat-title">Cancellation</div>
                  <div className="stat-value">{cancellationRate}%</div>
                  <div className="stat-desc">Rate</div>
                </div>
              </div>
              {rating > 0 && (
                <div className="mt-4">
                  <div className="stat bg-base-100 rounded-xl border border-base-300">
                    <div className="stat-title">Rating from Workers</div>
                    <div className="stat-value">{rating.toFixed(1)}</div>
                    <div className="stat-desc">Average rating</div>
                  </div>
                </div>
              )}
            </div>

            {/* Job Preferences */}
            {(preferredCategories.length > 0 || budgetMin !== null || budgetMax !== null) && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Job Preferences</h3>
                {preferredCategories.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm opacity-70 mb-2">Preferred Categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {preferredCategories.map((cat, i) => (
                        <span key={`cat-${i}`} className="badge badge-primary">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(budgetMin !== null || budgetMax !== null) && (
                  <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                    <p className="text-sm opacity-70 mb-2">Budget Range:</p>
                    <p className="text-xl font-bold">
                      {budgetMin !== null && budgetMax !== null
                        ? `${currency} ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}`
                        : budgetMin !== null
                        ? `From ${currency} ${budgetMin.toLocaleString()}`
                        : `Up to ${currency} ${budgetMax.toLocaleString()}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* About */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="opacity-80">
                {profile.bio || "This client hasn't written an about section yet."}
              </p>
            </div>

            {/* Account Transparency */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Account Information</h3>
              <div className="bg-base-100 rounded-lg p-4 border border-base-300 space-y-2">
                {memberSince && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-calendar text-primary"></i>
                    <span className="text-sm opacity-70">Member since:</span>
                    <span className="font-semibold">{memberSince}</span>
                  </div>
                )}
                {lastActive && (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-primary"></i>
                    <span className="text-sm opacity-70">Last active:</span>
                    <span className="font-semibold">{lastActive}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <i className="fas fa-envelope text-primary"></i>
                  <span className="text-sm opacity-70">Email status:</span>
                  {emailVerified ? (
                    <span className="badge badge-success badge-sm">Verified</span>
                  ) : (
                    <span className="badge badge-warning badge-sm">Not Verified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="mt-6 alert alert-info">
              <i className="fas fa-info-circle"></i>
              <div>
                <p className="text-sm">
                  <strong>Privacy Note:</strong> Full address and contact details are only shared after a job is accepted.
                  This profile shows public information only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
