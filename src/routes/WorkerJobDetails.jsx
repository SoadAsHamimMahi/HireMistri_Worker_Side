import { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import toast, { Toaster } from 'react-hot-toast';
import BookmarkButton from '../components/BookmarkButton';
import ShareButton from '../components/ShareButton';

export default function WorkerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
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
  
  // application state
  const [hasApplied, setHasApplied] = useState(false);
  const [application, setApplication] = useState(null);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editedProposalText, setEditedProposalText] = useState('');
  const [fetchingApplication, setFetchingApplication] = useState(false);

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

  // fetch application for current user and job
  const fetchApplication = async () => {
    if (!uid || !id) {
      setHasApplied(false);
      setApplication(null);
      return;
    }
    
    setFetchingApplication(true);
    try {
      const res = await fetch(`${base}/api/applications/${id}/${uid}`, {
        headers: { Accept: 'application/json' }
      });
      
      if (res.status === 404) {
        // No application found - this is normal if user hasn't applied
        setHasApplied(false);
        setApplication(null);
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      setApplication(data);
      setHasApplied(true);
    } catch (e) {
      // If error is 404, user hasn't applied - this is fine
      if (e.message.includes('404')) {
        setHasApplied(false);
        setApplication(null);
      } else {
        console.error('Failed to fetch application:', e);
        // Don't show error to user - just assume no application
        setHasApplied(false);
        setApplication(null);
      }
    } finally {
      setFetchingApplication(false);
    }
  };

  // Fetch application when component mounts or uid/id changes
  useEffect(() => {
    if (authReady && uid && id) {
      fetchApplication();
    } else {
      setHasApplied(false);
      setApplication(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, id, authReady, base]);

  // submit proposal → POST /api/applications
  const submitProposal = async () => {
    if (!authReady) return; // wait until we know
    if (!uid) {
      toast.error('Please sign in first.');
      return;
    }
    const text = proposal.trim();
    if (!text) {
      toast.error('Please write a short proposal.');
      return;
    }
    if (text.length < 50) {
      toast.error('Please write at least 50 characters for your proposal.');
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
      
      // Read response text once for error handling
      const responseText = await res.text();

      if (res.status === 409) {
        toast.error('You already applied to this job.');
        setAppliedMsg('❌ You already applied to this job.');
        return;
      }
      if (!res.ok) {
        // Try to parse error message from response
        let errorMessage = 'Failed to submit. Please try again.';
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If parsing fails, use default message
        }
        toast.error(errorMessage);
        setAppliedMsg(`❌ ${errorMessage}`);
        return;
      }

      // Parse successful response
      try {
        const data = JSON.parse(responseText);
        if (data.ok || data.application) {
          toast.success('Proposal submitted successfully!');
          setAppliedMsg('✅ Proposal submitted!');
          setApplyOpen(false);
          setProposal('');
          // Use the application data from the response directly
          if (data.application) {
            setApplication(data.application);
            setHasApplied(true);
          } else {
            // Fallback: fetch application data
            await fetchApplication();
          }
        } else {
          toast.error('Unexpected response from server.');
          setAppliedMsg('❌ Unexpected response from server.');
        }
      } catch (parseError) {
        // If response parsing fails, treat as error
        toast.error('Failed to parse server response.');
        setAppliedMsg('❌ Failed to parse server response.');
      }
    } catch (e) {
      console.error(e);
      // Only show generic error if we haven't already set a specific error message
      if (!appliedMsg || !appliedMsg.startsWith('❌')) {
        toast.error('Failed to submit. Please try again.');
        setAppliedMsg('❌ Failed to submit. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-base-content';
    }
  };

  const getApplicationStatusColor = (status) => {
    const statusLower = (status || 'pending').toLowerCase();
    switch (statusLower) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-base-content';
    }
  };

  // Edit proposal functions
  const handleEditProposal = () => {
    if (application && application.proposalText) {
      setEditedProposalText(application.proposalText);
      setIsEditingProposal(true);
    }
  };

  const handleCancelEdit = () => {
    setEditedProposalText('');
    setIsEditingProposal(false);
  };

  const handleSaveProposal = async () => {
    if (!application || !application._id) {
      toast.error('Application not found.');
      return;
    }

    const text = editedProposalText.trim();
    if (!text) {
      toast.error('Proposal text cannot be empty.');
      return;
    }

    if (text.length < 50) {
      toast.error('Proposal must be at least 50 characters long.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${base}/api/applications/${application._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalText: text })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update proposal');
      }

      toast.success('Proposal updated successfully!');
      setIsEditingProposal(false);
      setEditedProposalText('');
      // Refresh application data
      await fetchApplication();
    } catch (e) {
      console.error('Failed to update proposal:', e);
      toast.error(e.message || 'Failed to update proposal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'badge-success';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-base-content';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-3xl"></i>
          </div>
          <h3 className="text-xl font-heading font-semibold text-base-content mb-2">
            Error Loading Job
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{err}</p>
          <button 
            onClick={() => navigate('/jobs')} 
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-briefcase text-gray-400 text-3xl"></i>
          </div>
          <h3 className="text-xl font-heading font-semibold text-base-content mb-2">
            Job Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">This job may have been removed or doesn't exist.</p>
          <button 
            onClick={() => navigate('/jobs')} 
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  // Images + poster fields (fallbacks so it doesn't crash if missing)
  const images = Array.isArray(job.images) && job.images.length ? job.images : [];
  const poster = {
    name: job.postedByName || job.clientName || 'Unknown',
    email: (job.postedByEmail || job.email || '').toString(),
    phone: job.postedByPhone || job.phone || '',
    clientId: job.clientId || '',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />
      
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back
            </button>
            <div className="flex space-x-3 items-center">
              <BookmarkButton jobId={id} className="!btn-lg" />
              <ShareButton
                jobId={id}
                jobTitle={job.title}
                jobDescription={job.description}
              />
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(job.status || 'active')}`}>
                {job.status || 'Active'}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getPriorityColor(job.priority || 'medium')}`}>
                {job.priority || 'Medium'} Priority
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-heading font-bold text-base-content mb-6">
              {job.title || 'Untitled Job'}
            </h1>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center space-y-3 lg:space-y-0 lg:space-x-8 text-gray-600 dark:text-gray-300">
              <span className="flex items-center justify-center lg:justify-start text-lg">
                <i className="fas fa-tag w-5 h-5 mr-3 text-primary-500"></i>
                {job.category || 'General'}
              </span>
              <span className="flex items-center justify-center lg:justify-start text-lg">
                <i className="fas fa-map-marker-alt w-5 h-5 mr-3 text-primary-500"></i>
                {job.location || 'N/A'}
              </span>
              <span className="flex items-center justify-center lg:justify-start text-lg">
                <i className="fas fa-calendar w-5 h-5 mr-3 text-primary-500"></i>
                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Image Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              {images.length > 0 ? (
                <div className="relative">
                  <img
                    src={images[0]}
                    alt={job.title || 'Job image'}
                    className="w-full h-64 lg:h-80 object-cover"
                  />
                  {images.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      +{images.length - 1} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 lg:h-80 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                  <div className="text-center">
                    <i className="fas fa-image text-6xl text-gray-400 dark:text-gray-500 mb-4"></i>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No image available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Job Description */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
              <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content mb-6">
                Job Description
              </h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-base-content opacity-80 leading-relaxed text-lg">
                  {job.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Additional Job Images */}
            {images.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content mb-6">
                  Additional Images
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {images.slice(1).map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Job image ${index + 2}`}
                      className="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Applicants Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content">
                  Applicants
                </h2>
                <span className="text-gray-500 dark:text-gray-400 text-lg">
                  {job.applicants?.length || 0} total
                </span>
              </div>
              {Array.isArray(job.applicants) && job.applicants.length ? (
                <div className="space-y-4">
                  {job.applicants.map((a, i) => (
                    <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center justify-between bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-lg font-bold text-primary-600 dark:text-primary-400">
                          {(a.name || '?').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-base-content text-lg">{a.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">⭐ {a.rating ?? '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-500 dark:text-gray-400 text-sm">Bid:</span>
                        <span className="font-semibold text-primary text-lg ml-2">৳{a.price ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <i className="fas fa-users text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No applicants yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
              <h3 className="text-xl lg:text-2xl font-heading font-bold text-base-content mb-6">
                Job Information
              </h3>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-base-content opacity-70 mb-1">Budget</p>
                      <p className="text-3xl font-heading font-bold text-primary-600 dark:text-primary-400">
                        ৳{job.budget?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <i className="fas fa-money-bill-wave text-3xl text-primary-500 dark:text-primary-400"></i>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <i className="fas fa-briefcase w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-base-content opacity-70">Category</span>
                    </div>
                    <span className="text-base-content font-medium">
                      {job.category || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <i className="fas fa-map-marker-alt w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-base-content opacity-70">Location</span>
                    </div>
                    <span className="text-base-content font-medium text-right max-w-32 truncate">
                      {job.location || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <i className="fas fa-calendar w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-base-content opacity-70">Posted</span>
                    </div>
                    <span className="text-base-content font-medium">
                      {timeAgo(job.createdAt || job.date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <i className="fas fa-info-circle w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-base-content opacity-70">Status</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status || 'active')}`}>
                      {job.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
              <h3 className="text-xl lg:text-2xl font-heading font-bold text-base-content mb-6">
                Job Owner
              </h3>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900 dark:to-blue-900 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-primary-600 dark:text-primary-400 text-2xl"></i>
                </div>
                <div>
                  <p className="font-bold text-base-content text-lg">
                    {poster.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Job Poster</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-gray-700">
                  <i className="fas fa-envelope w-5 h-5 mr-3 text-gray-400"></i>
                  <span className="text-gray-600 dark:text-gray-300 text-sm">
                    {poster.email || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center py-3">
                  <i className="fas fa-id-card w-5 h-5 mr-3 text-gray-400"></i>
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-mono">
                    {poster.clientId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Application Form or Status */}
            {hasApplied && application ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h3 className="text-xl lg:text-2xl font-heading font-bold text-base-content mb-6">
                  Application Status
                </h3>
                
                <div className="space-y-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-base-content opacity-70 mb-2">Status</p>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${getApplicationStatusColor(application.status)}`}>
                        {application.status ? application.status.charAt(0).toUpperCase() + application.status.slice(1) : 'Pending'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-base-content opacity-70 mb-2">Submitted</p>
                      <p className="text-sm text-base-content font-medium">
                        {application.createdAt 
                          ? new Date(application.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Proposal Text */}
                  <div>
                    <label className="block text-sm font-medium text-base-content opacity-80 mb-3">
                      Your Proposal
                    </label>
                    {isEditingProposal ? (
                      <>
                        <textarea
                          value={editedProposalText}
                          onChange={(e) => setEditedProposalText(e.target.value)}
                          className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-lg"
                          rows={5}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Minimum 50 characters required ({editedProposalText.length}/50)
                        </p>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={handleSaveProposal}
                            disabled={saving || !editedProposalText.trim() || editedProposalText.trim().length < 50}
                            className="flex-1 bg-gradient-to-r from-primary-500 to-blue-500 hover:from-primary-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            {saving ? (
                              <span className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Saving...
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <i className="fas fa-save mr-2"></i>
                                Save Changes
                              </span>
                            )}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-full px-4 py-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-base-content text-lg min-h-[120px] whitespace-pre-wrap">
                          {application.proposalText || 'No proposal text available'}
                        </div>
                        {application.status === 'pending' && (
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={handleEditProposal}
                              className="flex-1 bg-gradient-to-r from-primary-500 to-blue-500 hover:from-primary-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              <i className="fas fa-edit mr-2"></i>
                              Edit Proposal
                            </button>
                            <Link
                              to="/applications"
                              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-xl flex items-center justify-center"
                            >
                              <i className="fas fa-eye mr-2"></i>
                              View All Applications
                            </Link>
                          </div>
                        )}
                        {application.status !== 'pending' && (
                          <div className="mt-4">
                            <Link
                              to="/applications"
                              className="w-full block text-center px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors shadow-lg hover:shadow-xl"
                            >
                              <i className="fas fa-eye mr-2"></i>
                              View All Applications
                            </Link>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h3 className="text-xl lg:text-2xl font-heading font-bold text-base-content mb-6">
                  Apply for this Job
                </h3>
                
                <div className="space-y-6">
                  {!uid && authReady && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <p className="text-red-600 dark:text-red-400 text-sm">
                        You must sign in to submit a proposal.
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-base-content opacity-80 mb-3">
                      Your Proposal
                    </label>
                    <textarea
                      value={proposal}
                      onChange={(e) => setProposal(e.target.value)}
                      placeholder="Write your proposal here... Explain why you're the best fit for this job."
                      className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-lg"
                      rows={5}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Minimum 50 characters required ({proposal.length}/50)
                    </p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => setApplyOpen(!applyOpen)}
                      className="flex-1 bg-gradient-to-r from-primary-500 to-blue-500 hover:from-primary-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                      disabled={!authReady}
                    >
                      {applyOpen ? 'Cancel' : 'Apply for this Job'}
                    </button>
                    <BookmarkButton jobId={id} />
                  </div>

                  {/* Proposal submission */}
                  {applyOpen && (
                    <div className="mt-6">
                      <button
                        onClick={submitProposal}
                        disabled={saving || !authReady || !proposal.trim() || proposal.trim().length < 50}
                        className="btn btn-primary w-full font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                      >
                        {saving ? (
                          <span className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                            Submitting...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            <i className="fas fa-paper-plane mr-2"></i>
                            Submit Proposal
                          </span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Feedback */}
                  {appliedMsg && (
                    <div className={`p-4 rounded-xl ${appliedMsg.startsWith('✅') ? 'bg-success/20 border border-success' : 'bg-error/20 border border-error'}`}>
                      <p className={`text-sm ${appliedMsg.startsWith('✅') ? 'text-success' : 'text-error'}`}>
                        {appliedMsg}
                      </p>
                    </div>
                  )}
                </div>
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
        <p className="font-medium text-base-content break-words">{value}</p>
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
