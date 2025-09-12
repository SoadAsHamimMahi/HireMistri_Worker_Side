import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  BriefcaseIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyBangladeshiIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const STATUS_TONES = {
  pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  completed:'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const STATUS_ICONS = {
  pending:  'fas fa-clock',
  accepted: 'fas fa-check-circle',
  completed:'fas fa-check-double',
  rejected: 'fas fa-times-circle',
};

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function Applications() {
  const { user } = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />

      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-blue-500 rounded-xl flex items-center justify-center">
                <BriefcaseIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-heading font-bold text-gray-900 dark:text-white">
                  My Applications
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Track and manage your job applications
                </p>
              </div>
            </div>

            {/* Mobile filter toggle */}
            <button
              className="md:hidden flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              aria-controls="filters"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{applications.length}</p>
                </div>
                <i className="fas fa-briefcase text-2xl text-blue-500"></i>
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {applications.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <i className="fas fa-clock text-2xl text-yellow-500"></i>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Accepted</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {applications.filter(a => a.status === 'accepted').length}
                  </p>
                </div>
                <i className="fas fa-check-circle text-2xl text-green-500"></i>
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {applications.filter(a => a.status === 'rejected').length}
                  </p>
                </div>
                <i className="fas fa-times-circle text-2xl text-red-500"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside
            id="filters"
            className={`
              space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6
              ${filtersOpen ? 'block' : 'hidden'}
              lg:block lg:col-span-1
            `}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                🔍 Filters
              </h3>
              <button
                className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={() => setFiltersOpen(false)}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Status
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  {statuses.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Category
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  {categories.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Search by Title
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g. AC Repair"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Applications List */}
          <main className="lg:col-span-3 space-y-6">
            {!authReady ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Checking sign-in…</p>
              </div>
            ) : loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading applications…</p>
              </div>
            ) : err ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Error Loading Applications</h3>
                <p className="text-red-600 dark:text-red-400">{err}</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
                <i className="fas fa-inbox text-6xl text-gray-300 dark:text-gray-600 mb-6"></i>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Applications Found</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {searchTerm || statusFilter !== 'All' || categoryFilter !== 'All'
                    ? 'No applications match your current filters.'
                    : 'You haven\'t applied to any jobs yet.'}
                </p>
                <Link
                  to="/jobs"
                  className="inline-flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
                >
                  <i className="fas fa-search mr-2"></i>
                  Browse Jobs
                </Link>
              </div>
            ) : (
              filteredApps.map(app => {
                const status = (app.status || 'pending').toLowerCase();
                const tone = STATUS_TONES[status] || STATUS_TONES.pending;
                const icon = STATUS_ICONS[status] || STATUS_ICONS.pending;
                
                return (
                  <div
                    key={app._id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow"
                  >
                    <div className="p-6 lg:p-8">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        {/* Left: Job Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xl lg:text-2xl font-heading font-bold text-gray-900 dark:text-white break-words">
                              {app.title || 'Untitled Job'}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${tone}`}>
                              <i className={`${icon} mr-2`}></i>
                              {app.status || 'pending'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <MapPinIcon className="w-5 h-5 mr-3 text-primary-500 flex-shrink-0" />
                              <span className="break-words">{app.location || 'N/A'}</span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <CurrencyBangladeshiIcon className="w-5 h-5 mr-3 text-primary-500" />
                              <span className="font-semibold">
                                {typeof app.budget === 'number'
                                  ? `৳${app.budget.toLocaleString()}`
                                  : (app.budget || '৳N/A')}
                              </span>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                              <CalendarDaysIcon className="w-5 h-5 mr-3 text-primary-500" />
                              <span>{fmtDate(app.createdAt)}</span>
                            </div>
                          </div>

                          {app.category && (
                            <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
                                {app.category}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col lg:items-end gap-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              to={`/jobs/${app.jobId}`}
                              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                            >
                              <i className="fas fa-eye mr-2"></i>
                              View Job
                            </Link>

                            {app.status?.toLowerCase() === 'pending' && (
                              <button
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                                onClick={() => handleCancel(app._id)}
                              >
                                <i className="fas fa-times mr-2"></i>
                                Cancel
                              </button>
                            )}

                            {app.status?.toLowerCase() === 'rejected' && (
                              <button
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                onClick={() => handleReapply(app)}
                              >
                                <i className="fas fa-redo mr-2"></i>
                                Reapply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Proposal */}
                      {app.proposalText && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Proposal:</h4>
                          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {app.proposalText.length > 300
                                ? app.proposalText.slice(0, 300) + '…'
                                : app.proposalText}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </main>
        </div>
      </div>
    </div>
  );
}


