import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  BriefcaseIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyBangladeshiIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const STATUS_TONES = {
  pending:  'badge-ghost',
  accepted: 'badge-success',
  completed:'badge-primary',
  rejected: 'badge-error',
};

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function Applications() {
  const { user } = useContext(AuthContext) || {};
  const [authReady, setAuthReady] = useState(Boolean(user));
  useEffect(() => { setAuthReady(true); }, [user]);

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile toggle

  // fetch apps for this worker (server already joins basic job fields)
  useEffect(() => {
    if (!authReady) return;
    if (!user?.uid) { setLoading(false); setApplications([]); return; }

    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        setErr('');

        // ✅ correct endpoint
        const { data } = await axios.get(`${API_BASE}/api/my-applications/${user.uid}`, {
          headers: { Accept: 'application/json' },
        });

        // normalize a bit for UI safety
        const rows = Array.isArray(data) ? data : [];
        const normalized = rows.map(a => ({
          ...a,
          // ensure fields exist; backend aggregation should already provide these
          title:     a.title ?? 'Untitled Job',
          location:  a.location ?? 'N/A',
          budget:    a.budget ?? null,
          category:  a.category ?? '',
          createdAt: a.createdAt || a.updatedAt || null,
          status:    (a.status || 'pending').toLowerCase(),
        }));

        if (!ignore) setApplications(normalized);
      } catch (e) {
        console.error('❌ Failed to load applications:', e?.response?.data || e.message);
        if (!ignore) setErr('Failed to load applications');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => { ignore = true; };
  }, [authReady, user?.uid]);

  // dynamic categories list (includes All)
  const categories = useMemo(() => {
    const set = new Set(['All']);
    applications.forEach(a => a?.category && set.add(a.category));
    return Array.from(set);
  }, [applications]);

  // filter + search
  const filteredApps = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return applications.filter(app => {
      const sOK =
        statusFilter === 'All' ||
        (app.status && app.status.toLowerCase() === statusFilter.toLowerCase());
      const cOK =
        categoryFilter === 'All' ||
        (app.category && app.category === categoryFilter);
      const tOK = !q || (app.title || '').toLowerCase().includes(q);
      return sOK && cOK && tOK;
    });
  }, [applications, statusFilter, categoryFilter, searchTerm]);

  // local handlers (UI-only for now)
  const handleCancel = (id) => {
    setApplications(prev => prev.filter(a => a._id !== id));
    toast.success('Application cancelled.');
  };
  const handleReapply = (job) => {
    toast(`Re-applied to: ${job.title || 'Job'}`, { icon: '🔄' });
  };

  const statuses = ['All', 'Pending', 'Accepted', 'Completed', 'Rejected'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Toaster />

      {/* Page title + mobile filter toggle */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <BriefcaseIcon className="w-6 h-6 sm:w-7 sm:h-7" />
          My Applications
        </h2>

        {/* Mobile only filter button */}
        <button
          className="btn btn-outline btn-sm md:hidden"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          aria-controls="filters"
        >
          <FunnelIcon className="w-4 h-4 mr-1" />
          Filters
        </button>
      </div>

      {/* Responsive layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters */}
        <aside
          id="filters"
          className={`
            space-y-4 rounded-xl border bg-white p-4
            ${filtersOpen ? 'block' : 'hidden'}
            md:block md:col-span-1
          `}
        >
          <h3 className="text-lg font-semibold">🔍 Filters</h3>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Status</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Category</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              {categories.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Search by Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. AC Repair"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </aside>

        {/* Applications list */}
        <main className="lg:col-span-3 space-y-4">
          {!authReady ? (
            <div className="text-gray-500">Checking sign-in…</div>
          ) : loading ? (
            <div className="text-gray-500">Loading…</div>
          ) : err ? (
            <div className="text-rose-600">❌ {err}</div>
          ) : filteredApps.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-gray-500">
              No applications found with current filters.
            </div>
          ) : (
            filteredApps.map(app => {
              const tone = STATUS_TONES[(app.status || 'pending').toLowerCase()] || 'badge-ghost';
              return (
                <div
                  key={app._id}
                  className="card bg-white shadow-sm border rounded-xl"
                >
                  <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left: job summary */}
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-primary mb-1 break-words">
                        {app.title || 'Untitled Job'}
                      </h3>

                      <div className="flex flex-col gap-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{app.location || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CurrencyBangladeshiIcon className="w-4 h-4 shrink-0" />
                          <span>
                            {typeof app.budget === 'number'
                              ? `৳${app.budget}`
                              : (app.budget || '৳N/A')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="w-4 h-4 shrink-0" />
                          <span>Applied on: {fmtDate(app.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {!!app.category && (
                          <span className="badge badge-outline">{app.category}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex md:flex-col items-center md:items-end gap-2 md:gap-3">
                      <span className={`badge ${tone} w-auto md:self-end`}>
                        {app.status || 'pending'}
                      </span>

                      <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                        <Link
                          to={`/jobs/${app.jobId}`}
                          className="btn btn-sm btn-outline"
                        >
                          View Job
                        </Link>

                        {app.status?.toLowerCase() === 'pending' && (
                          <button
                            className="btn btn-sm btn-error text-white"
                            onClick={() => handleCancel(app._id)}
                          >
                            Cancel
                          </button>
                        )}

                        {app.status?.toLowerCase() === 'rejected' && (
                          <button
                            className="btn btn-sm btn-accent"
                            onClick={() => handleReapply(app)}
                          >
                            Reapply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Proposal snippet */}
                  {app.proposalText && (
                    <div className="px-4 md:px-5 pb-4 text-sm text-gray-700">
                      <span className="text-gray-500">Your proposal:</span>
                      <div className="mt-1 p-3 rounded bg-base-200 whitespace-pre-wrap">
                        {app.proposalText.length > 280
                          ? app.proposalText.slice(0, 280) + '…'
                          : app.proposalText}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}


