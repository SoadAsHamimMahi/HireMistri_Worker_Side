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
import ApplicationNotes from '../components/ApplicationNotes';
import PageContainer from '../components/layout/PageContainer';
import PageHeader from '../components/layout/PageHeader';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const STATUS_TONES = {
  pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  accepted: 'badge-success',
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingApplicationId, setCancellingApplicationId] = useState(null);
  const [cancellingApplicationTitle, setCancellingApplicationTitle] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [editProposalText, setEditProposalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile toggle
  const [clientDetails, setClientDetails] = useState({}); // Cache for client { name, phone, email }
  const [expandedProposal, setExpandedProposal] = useState({}); // appId -> boolean for collapsible proposal
  const toggleProposal = (id) => setExpandedProposal((prev) => ({ ...prev, [id]: !prev[id] }));

  // Fetch client details for contact (Call/Email)
  const fetchClientDetails = async (clientId) => {
    if (!clientId) return { name: 'Client', phone: '', email: '' };
    if (clientDetails[clientId]) return clientDetails[clientId];
    
    try {
      const response = await axios.get(`${API_BASE}/api/users/${clientId}/public`, {
        headers: { Accept: 'application/json' }
      });
      
      if (response.data) {
        const clientData = response.data;
        const info = {
          name: clientData.displayName || 
                [clientData.firstName, clientData.lastName].filter(Boolean).join(' ') ||
                clientData.email || 'Client',
          phone: clientData.phone || '',
          email: clientData.email || ''
        };
        setClientDetails(prev => ({ ...prev, [clientId]: info }));
        return info;
      }
    } catch (err) {
      console.error('Failed to fetch client details:', err);
    }
    return { name: 'Client', phone: '', email: '' };
  };

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

  // Preload client details for accepted applications (for Contact Call/Email)
  useEffect(() => {
    applications
      .filter(a => (a.status || '').toLowerCase() === 'accepted' && a.clientId)
      .forEach(a => fetchClientDetails(a.clientId));
  }, [applications]);

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

  // Group by status: accepted first, then pending, then rejected
  const groupedApps = useMemo(() => ({
    accepted: filteredApps.filter(a => (a.status || '').toLowerCase() === 'accepted'),
    pending: filteredApps.filter(a => (a.status || '').toLowerCase() === 'pending'),
    rejected: filteredApps.filter(a => (a.status || '').toLowerCase() === 'rejected')
  }), [filteredApps]);
  const acceptedAppsCount = groupedApps.accepted.length;

  // Open cancel confirmation modal
  const handleCancelClick = (application) => {
    setCancellingApplicationId(application._id);
    setCancellingApplicationTitle(application.title || 'this job');
    setShowCancelModal(true);
  };

  // Confirm and delete application
  const handleCancelConfirm = async () => {
    if (!cancellingApplicationId || !user?.uid) {
      toast.error('Unable to cancel application. Please try again.');
      return;
    }

    try {
      setIsCancelling(true);
      
      const response = await axios.delete(`${API_BASE}/api/applications/${cancellingApplicationId}`, {
        data: { workerId: user.uid },
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.status === 200 || response.status === 204) {
        // Remove from local state
        setApplications(prev => prev.filter(a => a._id !== cancellingApplicationId));
        toast.success('Application withdrawn successfully.');
        setShowCancelModal(false);
        setCancellingApplicationId(null);
        setCancellingApplicationTitle('');
      }
    } catch (error) {
      console.error('Failed to withdraw application:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to withdraw application. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelCancel = () => {
    setShowCancelModal(false);
    setCancellingApplicationId(null);
    setCancellingApplicationTitle('');
  };

  // Open edit proposal modal
  const handleEditClick = (application) => {
    setEditingApplication(application);
    setEditProposalText(application.proposalText || '');
    setShowEditModal(true);
  };

  // Save edited proposal
  const handleSaveProposal = async () => {
    if (!editingApplication || !user?.uid) {
      toast.error('Unable to save proposal. Please try again.');
      return;
    }

    if (!editProposalText.trim()) {
      toast.error('Proposal text cannot be empty');
      return;
    }

    if (editProposalText.trim().length < 50) {
      toast.error('Proposal must be at least 50 characters long');
      return;
    }

    try {
      setIsSaving(true);
      
      const response = await axios.post(`${API_BASE}/api/applications`, {
        jobId: editingApplication.jobId,
        workerId: user.uid,
        proposalText: editProposalText.trim(),
        status: 'pending'
      });

      if (response.status === 200 || response.status === 201) {
        // Update local state
        setApplications(prev =>
          prev.map(app =>
            app._id === editingApplication._id
              ? { ...app, proposalText: editProposalText.trim(), updatedAt: new Date().toISOString() }
              : app
          )
        );
        toast.success('Proposal updated successfully!');
        setShowEditModal(false);
        setEditingApplication(null);
        setEditProposalText('');
      }
    } catch (error) {
      console.error('Failed to update proposal:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update proposal. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setEditingApplication(null);
    setEditProposalText('');
  };

  const handleReapply = (app) => {
    if (app?.jobId) {
      navigate(`/jobs/${app.jobId}`);
    } else {
      toast.error('Unable to open job. Please try again.');
    }
  };

  const statuses = ['All', 'Pending', 'Accepted', 'Completed', 'Rejected'];

  return (
    <div className="min-h-screen page-bg">
      <Toaster />

      <PageContainer>
        <PageHeader
          title="My Applications"
          subtitle="Track and manage your job applications"
          icon={<BriefcaseIcon className="w-6 h-6" />}
          actions={
            <button
              className="md:hidden flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              onClick={() => setFiltersOpen(o => !o)}
              aria-expanded={filtersOpen}
              aria-controls="filters"
            >
              <FunnelIcon className="w-4 h-4 mr-2" />
              Filters
            </button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 dark:bg-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70 font-medium">Total</p>
                  <p className="text-2xl font-bold text-base-content">{applications.length}</p>
                </div>
                <i className="fas fa-briefcase text-2xl text-primary"></i>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-base-content">
                    {applications.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <i className="fas fa-clock text-2xl text-amber-600 dark:text-amber-400"></i>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70 font-medium">Accepted</p>
                  <p className="text-2xl font-bold text-base-content">
                    {applications.filter(a => a.status === 'accepted').length}
                  </p>
                </div>
                <i className="fas fa-check-circle text-2xl text-emerald-600 dark:text-emerald-400"></i>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70 font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-base-content">
                    {applications.filter(a => a.status === 'rejected').length}
                  </p>
                </div>
                <i className="fas fa-times-circle text-2xl text-red-600 dark:text-red-400"></i>
              </div>
            </div>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside
            id="filters"
            className={`
              space-y-6 rounded-2xl border border-base-300/60 border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 p-6
              ${filtersOpen ? 'block' : 'hidden'}
              lg:block lg:col-span-1
            `}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-heading font-bold text-base-content">
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
                <label className="block text-sm font-medium text-base-content opacity-80 mb-3">
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
                <label className="block text-sm font-medium text-base-content opacity-80 mb-3">
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
                <label className="block text-sm font-medium text-base-content opacity-80 mb-3">
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
              <div className="rounded-2xl border border-base-300/60 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-base-content/70">Checking sign-in…</p>
              </div>
            ) : loading ? (
              <div className="rounded-2xl border border-base-300/60 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-base-content/70">Loading applications…</p>
              </div>
            ) : err ? (
              <div className="rounded-2xl border border-error/30 p-8 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-error mb-4"></i>
                <h3 className="text-lg font-semibold text-base-content mb-2">Error Loading Applications</h3>
                <p className="text-base-content/80">{err}</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="rounded-2xl border border-base-300/60 p-12 text-center">
                <i className="fas fa-inbox text-6xl text-base-content/30 mb-6"></i>
                <h3 className="text-xl font-semibold text-base-content mb-2">No Applications Found</h3>
                <p className="text-base-content/70 mb-6">
                  {searchTerm || statusFilter !== 'All' || categoryFilter !== 'All'
                    ? 'No applications match your current filters.'
                    : 'You haven\'t applied to any jobs yet.'}
                </p>
                <Link to="/jobs" className="btn btn-primary gap-2">
                  <i className="fas fa-search"></i>
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <>
                {/* Active Orders - Quick access when there are accepted applications */}
                {acceptedAppsCount > 0 && statusFilter === 'All' && (
                  <div className="mb-8 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <i className="fas fa-user-check text-xl"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-base-content">Active Orders</h2>
                        <p className="text-sm text-base-content/70">Call your clients to coordinate</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {groupedApps.accepted.slice(0, 5).map((app) => {
                        const info = clientDetails[app.clientId] || { name: 'Client', phone: '', email: '' };
                        return (
                          <div key={app._id} className="flex items-center gap-3 rounded-xl p-4 border border-base-300/60 min-w-[200px]">
                            <div className="w-10 h-10 rounded-full bg-base-300/50 flex items-center justify-center text-base-content font-bold">
                              {info.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base-content truncate">{info.name}</p>
                              <p className="text-xs text-base-content/60 truncate">{app.title || 'Job'}</p>
                              {info.phone && (
                                <a href={`tel:${info.phone.replace(/\s/g, '')}`} className="btn btn-success btn-sm mt-2">
                                  <i className="fas fa-phone mr-1"></i>Call
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Applications List - Grouped by status */}
                {['accepted', 'pending', 'rejected'].map((statusKey) => {
                  const group = groupedApps[statusKey];
                  if (group.length === 0) return null;
                  const sectionLabels = { accepted: 'Active Orders', pending: 'Pending', rejected: 'Rejected' };
                  const sectionIcons = { accepted: 'fa-user-check', pending: 'fa-clock', rejected: 'fa-times-circle' };
                  const sectionClass = { accepted: 'text-green-600 dark:text-green-400', pending: 'text-yellow-600 dark:text-yellow-400', rejected: 'text-red-600 dark:text-red-400' };
                  return (
                    <div key={statusKey} className="mb-8">
                      <h3 className={`flex items-center gap-2 text-lg font-semibold mb-4 ${sectionClass[statusKey]}`}>
                        <i className={`fas ${sectionIcons[statusKey]} ${sectionClass[statusKey]}`}></i>
                        {sectionLabels[statusKey]} ({group.length})
                      </h3>
                      <div className="space-y-6">
                        {group.map(app => {
                const status = (app.status || 'pending').toLowerCase();
                const tone = STATUS_TONES[status] || STATUS_TONES.pending;
                const icon = STATUS_ICONS[status] || STATUS_ICONS.pending;
                const isAccepted = status === 'accepted';
                
                const borderAccent = status === 'accepted' ? 'border-l-4 border-l-emerald-500' : status === 'rejected' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-500';
                return (
                  <div
                    key={app._id}
                    className={`rounded-xl overflow-hidden border border-base-300/60 ${borderAccent} transition-all`}
                  >
                    <div className="p-4 lg:p-6 space-y-4">
                      {/* Header: Title + Status */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <h3 className="text-lg font-semibold text-base-content break-words pr-2">
                          {app.title || 'Untitled Job'}
                        </h3>
                        <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center w-fit ${tone}`}>
                          <i className={`${icon} mr-1.5 text-xs`}></i>
                          {isAccepted ? 'Active' : (app.status || 'pending')}
                        </span>
                      </div>

                      {/* Meta row: Location (short), Category, Budget, Date */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-base-content/80">
                        <span className="flex items-center gap-1.5 min-w-0" title={app.location || undefined}>
                          <MapPinIcon className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-none">{app.location || 'N/A'}</span>
                        </span>
                        {app.category && (
                          <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {app.category}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 font-medium text-base-content">
                          <CurrencyBangladeshiIcon className="w-4 h-4 text-primary" />
                          {typeof app.budget === 'number' ? `৳${app.budget.toLocaleString()}` : (app.budget || '৳N/A')}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="w-4 h-4 text-primary" />
                          {fmtDate(app.createdAt)}
                        </span>
                      </div>

                      {/* Actions: primary + contact grouped */}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/jobs/${app.jobId}`}
                          className="btn btn-primary btn-sm gap-1.5"
                        >
                          <i className="fas fa-eye"></i>
                          View Job
                        </Link>
                        {app.status?.toLowerCase() === 'accepted' && app.clientId && (
                          <>
                            <button
                              onClick={() => navigate(`/client/${app.clientId}`)}
                              className="btn btn-success btn-sm gap-1.5"
                            >
                              <i className="fas fa-user"></i>
                              View Client
                            </button>
                            {(() => {
                              const info = clientDetails[app.clientId] || { phone: '', email: '' };
                              return (info.phone || info.email) ? (
                                <>
                                  {info.phone && (
                                    <a href={`tel:${info.phone.replace(/\s/g, '')}`} className="btn btn-outline btn-sm gap-1.5 btn-success">
                                      <i className="fas fa-phone"></i>
                                      Call
                                    </a>
                                  )}
                                  {info.email && (
                                    <a href={`mailto:${info.email}`} className="btn btn-outline btn-sm gap-1.5">
                                      <i className="fas fa-envelope"></i>
                                      Email
                                    </a>
                                  )}
                                </>
                              ) : null;
                            })()}
                          </>
                        )}
                        {app.status?.toLowerCase() === 'pending' && (
                          <>
                            <button className="btn btn-sm btn-info gap-1.5" onClick={() => handleEditClick(app)} disabled={isSaving}>
                              <i className="fas fa-edit"></i>
                              Edit Proposal
                            </button>
                            <button className="btn btn-sm btn-error btn-outline gap-1.5" onClick={() => handleCancelClick(app)} disabled={isCancelling}>
                              {isCancelling && cancellingApplicationId === app._id ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-times"></i>}
                              Withdraw
                            </button>
                          </>
                        )}
                        {app.status?.toLowerCase() === 'rejected' && (
                          <button className="btn btn-sm btn-info gap-1.5" onClick={() => handleReapply(app)}>
                            <i className="fas fa-redo"></i>
                            Reapply
                          </button>
                        )}
                      </div>

                      {/* Proposal: collapsible */}
                      {app.proposalText && (
                        <div className="space-y-2">
                          {expandedProposal[app._id] ? (
                            <div className="rounded-lg bg-base-200 dark:bg-gray-700/50 p-4">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-sm font-medium text-base-content/80">Your proposal</span>
                                <button type="button" className="btn btn-ghost btn-xs" onClick={() => toggleProposal(app._id)}>Collapse</button>
                              </div>
                              <p className="text-sm text-base-content/90 leading-relaxed whitespace-pre-wrap">{app.proposalText}</p>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-ghost btn-sm gap-2 text-primary" onClick={() => toggleProposal(app._id)}>
                              <i className="fas fa-file-alt"></i>
                              View your proposal
                            </button>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <ApplicationNotes
                          applicationId={app._id}
                          userId={user?.uid}
                          userName={user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
                        />
                      </div>
                    </div>
                  </div>
                );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </main>
        </div>
      </PageContainer>

      {/* Edit Proposal Modal */}
      {showEditModal && editingApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleEditCancel}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-base-content">Edit Proposal</h3>
            <p className="text-sm text-base-content opacity-70 mb-4">
              Job: <strong>{editingApplication.title || 'Untitled Job'}</strong>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-base-content mb-2">
                Your Proposal <span className="text-error">*</span>
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-base-content resize-none"
                rows={8}
                value={editProposalText}
                onChange={(e) => setEditProposalText(e.target.value)}
                placeholder="Describe your skills, experience, and why you're the right fit for this job..."
                disabled={isSaving}
              />
              <div className="mt-2 text-xs text-base-content opacity-60">
                {editProposalText.length} characters (minimum 50)
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-base-content font-medium rounded-lg transition-colors"
                onClick={handleEditCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSaveProposal}
                disabled={isSaving || editProposalText.trim().length < 50}
              >
                {isSaving ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelCancel}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-base-content">Withdraw Application</h3>
            <p className="text-base-content opacity-70 mb-6">
              Are you sure you want to withdraw your application for <strong>"{cancellingApplicationTitle}"</strong>? 
              This action cannot be undone, and the client will be notified.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-base-content font-medium rounded-lg transition-colors"
                onClick={handleCancelCancel}
                disabled={isCancelling}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCancelConfirm}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Withdrawing...
                  </>
                ) : (
                  'Yes, Withdraw'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


