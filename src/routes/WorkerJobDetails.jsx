import { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { JobLocationMap, LiveTrackingMap } from '../components/maps';
import toast, { Toaster } from 'react-hot-toast';
import BookmarkButton from '../components/BookmarkButton';
import ShareButton from '../components/ShareButton';

export default function WorkerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const { socket } = useWebSocket() || {};
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

  // auth state (use context first, then fallback to Firebase directly)
  const [uid, setUid] = useState(ctx?.user?.uid || null);
  const [authReady, setAuthReady] = useState(Boolean(ctx?.user)); // toggled true when we know

  // job state
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // apply/proposal UI state
  const [proposal, setProposal] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [appliedMsg, setAppliedMsg] = useState('');
  
  // application state
  const [hasApplied, setHasApplied] = useState(false);
  const [application, setApplication] = useState(null);
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editedProposalText, setEditedProposalText] = useState('');
  const [fetchingApplication, setFetchingApplication] = useState(false);
  const [negotiatingPrice, setNegotiatingPrice] = useState(false);
  const [workerLocation, setWorkerLocation] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [clientPublic, setClientPublic] = useState(null);

  // extra charges state
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraType, setExtraType] = useState('EXTRA_COST');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraReceipts, setExtraReceipts] = useState([]);
  const [submittingExtra, setSubmittingExtra] = useState(false);
  const [extraChargesList, setExtraChargesList] = useState([]);
  const [feeStats, setFeeStats] = useState(null);
  const [isFeeLoading, setIsFeeLoading] = useState(false);

  // fetch fees
  const fetchFees = async () => {
    const laborAmount = Number(application?.finalPrice || application?.proposedPrice || 0);
    if (laborAmount <= 0) return;
    
    setIsFeeLoading(true);
    try {
      const res = await fetch(`${base}/api/fees/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laborAmount }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeeStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch fee estimate:', e);
    } finally {
      setIsFeeLoading(false);
    }
  };

  // fetch extra charges if applied
  const fetchCharges = async () => {
    if (!application?._id) return;
    try {
      const res = await fetch(`${base}/api/applications/${application._id}/additional-charges`);
      if (res.ok) {
        const data = await res.json();
        setExtraChargesList(data);
      }
    } catch(e) {}
  };

  useEffect(() => {
    fetchCharges();
    fetchFees();
  }, [application?._id, application?.finalPrice, application?.proposedPrice]);

  const submitExtraCharge = async (e) => {
    e.preventDefault();
    if (!extraAmount || parseFloat(extraAmount) <= 0) return toast.error('Enter valid amount');
    if (extraType === 'EXTRA_COST' && extraReceipts.length === 0) return toast.error('Receipts are required for extra costs');
    setSubmittingExtra(true);
    try {
      const formData = new FormData();
      formData.append('workerId', uid);
      formData.append('amount', extraAmount);
      formData.append('type', extraType);
      formData.append('description', extraDesc);
      Array.from(extraReceipts).forEach(f => formData.append('receipts', f));

      const res = await fetch(`${base}/api/applications/${application._id}/additional-charges`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        toast.success(`Successfully requested ${extraType === 'TIP' ? 'tip' : 'extra cost'}`);
        setShowExtraModal(false);
        setExtraAmount('');
        setExtraDesc('');
        setExtraReceipts([]);
        fetchCharges();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit request');
      }
    } catch(err) {
      toast.error('Network error');
    } finally {
      setSubmittingExtra(false);
    }
  };

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

  const [profile, setProfile] = useState(null);

  // load user profile for restrictions
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const res = await fetch(`${base}/api/users/${uid}`, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.warn('Could not load user profile:', e);
      }
    })();
  }, [uid, base]);

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

  // fetch job owner public profile to show reliable client name
  useEffect(() => {
    if (!job?.clientId) {
      setClientPublic(null);
      return;
    }
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(`${base}/api/users/${encodeURIComponent(job.clientId)}/public`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          if (!ignore) setClientPublic(null);
          return;
        }
        const data = await res.json();
        if (!ignore) setClientPublic(data);
      } catch {
        if (!ignore) setClientPublic(null);
      }
    })();
    return () => { ignore = true; };
  }, [job?.clientId, base]);

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

  // Keep application state fresh so worker sees client counter offers.
  useEffect(() => {
    if (!authReady || !uid || !id) return undefined;
    const timer = setInterval(() => {
      fetchApplication();
    }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, uid, id]);

  // Initialize worker location from profile if GPS not available
  useEffect(() => {
    if (!workerLocation && ctx?.profile?.locationGeo) {
      setWorkerLocation(ctx.profile.locationGeo);
    }
  }, [ctx?.profile?.locationGeo, workerLocation]);

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
    const price = parseFloat(proposedPrice);
    if (Number.isNaN(price) || price <= 0) {
      toast.error('Please enter a valid proposed budget amount.');
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
        proposalText: text,
        proposedPrice: price
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
          setProposal('');
          setProposedPrice('');
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
        return 'bg-base-300 text-base-content';
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
        return 'bg-base-300 text-base-content';
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

  const handleCounterDecision = async (decision) => {
    if (!application?.jobId || !uid) {
      toast.error('Application details are missing.');
      return;
    }
    const parseMoney = (v) => {
      if (v == null || v === '') return NaN;
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'object' && v !== null && '$numberDecimal' in v) return parseFloat(v.$numberDecimal);
      const n = parseFloat(String(v));
      return Number.isFinite(n) ? n : NaN;
    };
    if (decision === 'accept') {
      const counter = parseMoney(application.counterPrice);
      if (!Number.isFinite(counter) || counter <= 0) {
        toast.error('Invalid counter offer amount.');
        return;
      }
    }
    try {
      setNegotiatingPrice(true);
      const payload =
        decision === 'accept'
          ? {
              jobId: application.jobId,
              workerId: uid,
              finalPrice: parseMoney(application.counterPrice),
              negotiationStatus: 'accepted',
            }
          : {
              jobId: application.jobId,
              workerId: uid,
              negotiationStatus: 'cancelled',
            };
      const res = await fetch(`${base}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to update counter decision');
      }
      if (body?.application) {
        setApplication(body.application);
      } else {
        await fetchApplication();
      }
      toast.success(decision === 'accept' ? 'Counter offer accepted.' : 'Counter offer declined.');
    } catch (e) {
      toast.error(e.message || 'Failed to update counter decision.');
    } finally {
      setNegotiatingPrice(false);
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
        return 'bg-base-300 text-base-content';
    }
  };

  const requestWorkerLocation = () => {
    if (!('geolocation' in navigator)) {
      if (ctx?.profile?.locationGeo) {
        setWorkerLocation(ctx.profile.locationGeo);
        toast.success('Using your saved profile location.');
      } else {
        setGeoError('Geolocation is not supported. Please set your address in profile settings.');
      }
      return;
    }

    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkerLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoLoading(false);
      },
      (error) => {
        let message = 'Unable to get your location right now.';
        if (error?.code === 1) {
          // Permission Denied - Fallback to profile
          if (ctx?.profile?.locationGeo) {
            setWorkerLocation(ctx.profile.locationGeo);
            toast.success('Location permission denied. Using your saved profile address.');
            message = ''; // Clear error so badge shows
          } else {
            message = 'Location permission was denied. Please allow access or set your address in profile settings.';
          }
        } else if (error?.code === 2) {
          if (ctx?.profile?.locationGeo) {
            setWorkerLocation(ctx.profile.locationGeo);
            toast.success('GPS unavailable. Using your saved profile address.');
            message = '';
          } else {
            message = 'Your location is currently unavailable. Turn on GPS and try again.';
          }
        }
        setGeoError(message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-base-content opacity-80">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-3xl"></i>
          </div>
          <h3 className="text-xl font-heading font-semibold text-base-content mb-2">
            Error Loading Job
          </h3>
          <p className="text-base-content opacity-80 mb-6">{err}</p>
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
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-base-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-briefcase text-base-content opacity-60 text-3xl"></i>
          </div>
          <h3 className="text-xl font-heading font-semibold text-base-content mb-2">
            Job Not Found
          </h3>
          <p className="text-base-content opacity-80 mb-6">This job may have been removed or doesn't exist.</p>
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
    name: job.postedByName || job.clientName || clientPublic?.displayName || 'Unknown',
    email: (job.postedByEmail || job.email || '').toString(),
    phone: job.postedByPhone || job.phone || '',
    clientId: job.clientId || clientPublic?.uid || '',
  };
  const resolvedJobGeo = job.locationGeo || getJobLatLng(job);
  const resolvedLocationText = job.locationText || job.location || 'No location specified';
  const applicationStatus = (application?.status || '').toLowerCase();
  const isAcceptedApplication = hasApplied && applicationStatus === 'accepted';
  const distanceKm = getDistanceKm(workerLocation, resolvedJobGeo);

  return (
    <div className="min-h-screen text-[#e0e0e0] font-sans selection:bg-primary/30">
      
      {/* Top Navbar / Header area */}
      <div className="sticky top-0 z-[100] bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/5"
            >
              <i className="fas fa-arrow-left text-sm opacity-70"></i>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                <i className="fas fa-hammer text-primary text-sm"></i>
              </div>
              <span className="font-heading font-bold text-lg tracking-tight text-white/90">Hire Mistri</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="tooltip tooltip-bottom" data-tip="Share Job">
               <ShareButton jobId={id} jobTitle={job.title} jobDescription={job.description} className="!w-10 !h-10 !rounded-full bg-white/5 border-white/5 hover:bg-white/10" />
             </div>
             <div className="tooltip tooltip-bottom" data-tip="Bookmark">
               <BookmarkButton jobId={id} className="!w-10 !h-10 !rounded-full bg-white/5 border-white/5 hover:bg-white/10" />
             </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left 2/3) */}
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. Hero Title Card */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32"></div>
               
               <h1 className="text-3xl lg:text-4xl font-heading font-black text-white mb-4 leading-tight">
                 {job.title || 'Untitled Job'}
               </h1>
               
               <div className="flex flex-wrap items-center gap-6 text-sm">
                 <div className="flex items-center gap-2 font-bold text-[#00C853]">
                   <i className="fas fa-money-bill-wave"></i>
                   <span className="text-xl">৳{job.budget?.toLocaleString() || 'N/A'} Total</span>
                 </div>
                 <div className="flex items-center gap-2 text-white/60">
                   <i className="fas fa-map-marker-alt"></i>
                   <span>{job.location || 'N/A'}</span>
                 </div>
                 <div className="flex items-center gap-2 text-white/40">
                   <i className="fas fa-clock"></i>
                   <span>Posted {timeAgo(job.createdAt || job.date)}</span>
                 </div>
               </div>
               
               {distanceKm !== null && (
                 <div className="mt-6">
                    <span className="inline-flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-xs font-bold border border-green-500/20 shadow-lg shadow-green-500/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                      {distanceKm} KM FROM {workerLocation === ctx?.profile?.locationGeo ? 'SAVED ADDRESS' : 'YOU'}
                    </span>
                 </div>
               )}
            </div>

            {/* 2. Job Details Grid */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8">
               <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                 <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                 Job Details
               </h2>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Category</span>
                    <span className="text-lg font-bold text-white/90">{job.category || 'Masonry (Mistri)'}</span>
                 </div>
                 <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Duration</span>
                    <span className="text-lg font-bold text-white/90">{job.duration || '5 Days'}</span>
                 </div>
                 <div className="bg-[#111] border border-white/5 p-4 rounded-2xl">
                    <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Start Date</span>
                    <span className="text-lg font-bold text-white/90">{job.startDate ? new Date(job.startDate).toLocaleDateString() : 'Immediate'}</span>
                 </div>
               </div>

               {/* Description */}
               <div className="mt-8">
                 <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Description</h3>
                 <div className="text-white/70 leading-relaxed space-y-4 text-base">
                   {job.description ? (
                     job.description.split('\n').map((para, i) => (
                       <p key={i}>{para}</p>
                     ))
                   ) : (
                     <p>Looking for an experienced professional for this project. Materials will be provided by client. High quality finishing expected.</p>
                   )}
                 </div>
               </div>

               {/* Required Skills */}
               <div className="mt-8">
                 <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4">Required Skills</h3>
                 <div className="flex flex-wrap gap-2">
                   {(job.skills || ['Plastering', 'Tile Installation', 'Cement Work', 'Finishing']).map((skill, idx) => (
                     <span key={idx} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs font-medium hover:bg-white/10 hover:border-white/20 transition-all cursor-default">
                       {skill}
                     </span>
                   ))}
                 </div>
               </div>
            </div>

            {/* 2.5 Image Gallery */}
            {images && images.length > 0 && (
               <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8">
                  <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    Project Media
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {images.map((img, idx) => (
                        <div key={idx} className={`relative rounded-2xl overflow-hidden border border-white/5 group ${idx === 0 && images.length % 2 !== 0 ? 'sm:col-span-2' : ''}`}>
                           <img 
                              src={img} 
                              alt={`Job ${idx}`} 
                              className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest">View Full Image</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Required Skills moved below Gallery or kept in Details? Let's keep it in Details as I had it. */}

            {/* 3. Work Location */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8">
               <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
                 <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                 Work Location
               </h2>
               
               <div className="relative rounded-3xl overflow-hidden border border-white/5 h-[350px] shadow-2xl">
                  <JobLocationMap
                    locationGeo={resolvedJobGeo}
                    locationText={resolvedLocationText}
                    className="h-full w-full"
                  />
                  
                  {/* Map Overlay Info */}
                  <div className="absolute bottom-6 left-6 right-6 z-[400]">
                    <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl inline-flex items-center gap-3 shadow-2xl">
                       <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                         <i className="fas fa-map-marker-alt"></i>
                       </div>
                       <span className="text-sm font-bold text-white/90 tracking-tight">
                         {resolvedLocationText}
                       </span>
                    </div>
                  </div>
               </div>
               
               <div className="mt-4">
                 {distanceKm === null && (
                    <button
                      type="button"
                      onClick={requestWorkerLocation}
                      disabled={geoLoading}
                      className="text-primary text-sm font-bold flex items-center gap-2 hover:underline"
                    >
                      {geoLoading ? (
                        <>
                          <span className="loading loading-spinner loading-xs"></span>
                          Accessing location...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-location-arrow"></i>
                          Calculate distance from me
                        </>
                      )}
                    </button>
                 )}
                 {geoError && <p className="text-xs text-red-500 mt-2">{geoError}</p>}
               </div>
            </div>

            {/* Live Tracking Map Overlay (Conditional) */}
            {isAcceptedApplication && poster.clientId && uid && (
              <div className="bg-[#1a1a1a] border border-primary/20 rounded-xl p-8 bg-primary/5">
                <h2 className="text-xl font-heading font-bold text-primary mb-4">
                  <i className="fas fa-map-marked-alt mr-2"></i> Live Tracking
                </h2>
                <div className="rounded-2xl overflow-hidden border border-primary/30 h-[400px]">
                  <LiveTrackingMap
                    jobId={String(job._id || id)}
                    jobLocationGeo={resolvedJobGeo}
                    currentUserId={uid}
                    peerUserId={poster.clientId}
                    socket={socket}
                    isAccepted
                  />
                </div>
              </div>
            )}

            {/* 4. Application Status or Apply Section */}
            {hasApplied && application ? (
               <div className="bg-[#1a1a1a] border border-primary/20 rounded-xl p-8 bg-primary/5">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                      <i className="fas fa-file-alt text-primary"></i>
                      Your Application Status
                    </h2>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      application.status === 'accepted' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                      application.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {application.status || 'Pending'}
                    </span>
                  </div>

                  <div className="space-y-8">
                     {/* Proposal Text */}
                     <div>
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Your Proposal</h3>
                           {!isEditingProposal && application.status === 'pending' && (
                              <button onClick={handleEditProposal} className="text-primary text-[10px] font-black uppercase tracking-widest hover:underline">
                                Edit Proposal
                              </button>
                           )}
                        </div>
                        
                        {isEditingProposal ? (
                           <div className="space-y-4">
                              <textarea
                                value={editedProposalText}
                                onChange={(e) => setEditedProposalText(e.target.value)}
                                className="w-full px-6 py-4 bg-[#111] border border-primary/30 rounded-2xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-white resize-none"
                                rows={6}
                              />
                              <div className="flex gap-3">
                                 <button onClick={handleSaveProposal} disabled={saving || editedProposalText.length < 50} className="flex-1 py-3 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-widest transition-all hover:bg-primary-focus">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                 </button>
                                 <button onClick={handleCancelEdit} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest transition-all hover:bg-white/10">
                                    Cancel
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <p className="text-white/70 bg-white/5 p-6 rounded-2xl border border-white/5 leading-relaxed italic">
                              "{application.proposalText || 'No proposal text provided.'}"
                           </p>
                        )}
                     </div>

                     {/* Price Details */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl">
                           <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Original Bid</span>
                           <span className="text-xl font-black text-white">৳{Number(application.proposedPrice || 0).toLocaleString()}</span>
                        </div>
                        
                        {application.counterPrice && (
                           <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 bg-amber-500 text-black text-[8px] font-black uppercase tracking-widest rounded-bl-lg">Counter Offer</div>
                              <span className="block text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mb-2">Client Offered</span>
                              <span className="text-xl font-black text-amber-500">৳{Number(application.counterPrice).toLocaleString()}</span>
                              
                              {application.status === 'pending' && !['accepted', 'declined'].includes((application.negotiationStatus || '').toLowerCase()) && (
                                 <div className="flex gap-2 mt-4">
                                    <button onClick={() => handleCounterDecision('accept')} disabled={negotiatingPrice} className="flex-1 py-2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-tighter rounded-lg hover:bg-amber-400 transition-all">Accept</button>
                                    <button onClick={() => handleCounterDecision('decline')} disabled={negotiatingPrice} className="flex-1 py-2 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-tighter rounded-lg hover:bg-white/10 transition-all">Decline</button>
                                 </div>
                              )}
                           </div>
                        )}

                        {application.finalPrice && (
                           <div className="bg-green-500/5 border border-green-500/20 p-5 rounded-2xl col-span-full">
                              <span className="block text-[10px] font-bold text-green-500/70 uppercase tracking-widest mb-2">Final Agreed Price</span>
                              <span className="text-2xl font-black text-green-500">৳{Number(application.finalPrice).toLocaleString()}</span>
                           </div>
                        )}
                     </div>

                     {/* Estimated Platform Fee Card - only show when accepted and price is known */}
                     {(application.status === 'accepted' || application.status === 'pending' || application.status === 'in-progress') && (application.finalPrice || application.proposedPrice) && (
                       <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 w-full mt-4 relative overflow-hidden group">
                         {isFeeLoading && (
                           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 flex items-center justify-center">
                             <div className="loading loading-spinner loading-sm text-primary"></div>
                           </div>
                         )}
                         <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -mr-12 -mt-12 rounded-full"></div>
                         
                         <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4 flex items-center justify-between">
                           <span>Estimated Earnings Breakdown</span>
                           {feeStats?.tier && (
                             <span className="text-primary/60 bg-primary/10 px-2 py-0.5 rounded text-[8px] border border-primary/20">
                               {feeStats.tier.replace('_', ' ')}
                             </span>
                           )}
                         </p>
                         
                         {feeStats ? (
                           <div className="space-y-3">
                             <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-xl border border-white/5">
                               <span className="text-sm text-white/60">Agreed Labor Price</span>
                               <span className="text-base font-bold text-white">৳{(Number(application.finalPrice || application.proposedPrice || 0)).toLocaleString()}</span>
                             </div>
                             
                             <div className="flex justify-between items-center px-3">
                               <div className="flex items-center gap-2">
                                 <span className="text-sm text-white/40">Platform Fee</span>
                                 <div className="tooltip tooltip-right" data-tip="PLATFORM_FIXED_FEE + TIERED_LABOR_PERCENTAGE">
                                   <i className="fas fa-info-circle text-[10px] text-white/20 cursor-help"></i>
                                 </div>
                               </div>
                               <span className="text-sm font-bold text-red-500/80">- ৳{feeStats.fee?.toLocaleString()}</span>
                             </div>
                             
                             <div className="mt-2 pt-3 border-t border-white/5 flex justify-between items-center px-3">
                               <span className="text-base font-black text-white/90">Net Earnings</span>
                               <div className="text-right">
                                 <span className="text-2xl font-black text-[#1ec86d]">৳{(Number(application.finalPrice || application.proposedPrice || 0) - feeStats.fee).toLocaleString()}</span>
                                 <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Expected Payout</p>
                               </div>
                             </div>
                           </div>
                         ) : (
                           <p className="text-xs text-white/30 italic py-2">Calculating earnings projection...</p>
                         )}
                         
                         <div className="mt-5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
                           <i className="fas fa-shield-alt text-amber-500 text-[10px] mt-1"></i>
                           <p className="text-[10px] text-amber-500/70 leading-relaxed">
                             This fee is only charged upon <span className="font-bold">successful completion</span> and will be added to your account's due balance.
                           </p>
                         </div>
                       </div>
                     )}

                     {/* Action Buttons */}
                     <div className="pt-4 flex gap-4">
                        <button className="flex-1 py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-white/90 transition-all">
                           Message Client
                        </button>
                        <button className="flex-1 py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-black uppercase tracking-widest text-xs hover:bg-red-500/20 transition-all">
                           Withdraw Application
                        </button>
                     </div>

                     {/* Additional Charges Section */}
                     {(application.status === 'accepted' || application.status === 'completed') && (
                        <div className="bg-[#111] border border-white/5 p-5 rounded-2xl w-full mt-4">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <span className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">Additional Charges & Tips</span>
                              <button onClick={() => setShowExtraModal(true)} disabled={application.status === 'completed'} className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
                                 + Request Extra
                              </button>
                           </div>
                           
                           {extraChargesList.length > 0 ? (
                              <div className="space-y-3 mt-4">
                                 {extraChargesList.map(charge => (
                                    <div key={charge._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                       <div>
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${charge.type === 'TIP' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {charge.type.replace('_', ' ')}
                                             </span>
                                             <span className="font-bold text-white text-sm">৳{Number(charge.amount).toLocaleString()}</span>
                                          </div>
                                          <p className="text-xs text-white/50">{charge.description || 'No description provided'}</p>
                                          {charge.receiptUrls && charge.receiptUrls.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                              {charge.receiptUrls.map((url, i) => (
                                                <a key={i} href={base + url} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">View Receipt {i+1}</a>
                                              ))}
                                            </div>
                                          )}
                                       </div>
                                       <div className="shrink-0">
                                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                                             charge.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                             charge.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                             'bg-amber-500/10 text-amber-500'
                                          }`}>
                                             {charge.status}
                                          </span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-xs text-white/30 italic mt-4">No additional charges requested.</p>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            ) : !hasApplied && (
               <div className="bg-[#1a1a1a] border border-primary/10 rounded-xl p-8">
                  <h2 className="text-xl font-heading font-bold text-white mb-8 flex items-center gap-3">
                    <i className="fas fa-paper-plane text-primary text-sm"></i>
                    Apply for this Job
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Your Proposed Price (৳)</label>
                      <div className="relative">
                         <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 font-bold">৳</span>
                         <input
                           type="number"
                           value={proposedPrice}
                           onChange={(e) => setProposedPrice(e.target.value)}
                           placeholder="15,000"
                           className="w-full pl-10 pr-6 py-4 bg-[#111] border border-white/5 rounded-2xl focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-lg text-white"
                         />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Your Proposal / Message</label>
                      <textarea
                        value={proposal}
                        onChange={(e) => setProposal(e.target.value)}
                        placeholder="Briefly describe your experience with similar work..."
                        rows={6}
                        className="w-full px-6 py-4 bg-[#111] border border-white/5 rounded-2xl focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none text-white resize-none"
                      />
                      <div className="flex justify-between items-center mt-2 px-2">
                         <span className={`text-[10px] font-bold ${proposal.length < 50 ? 'text-white/30' : 'text-green-500'}`}>
                           {proposal.length}/50 min characters
                         </span>
                         {saving && <span className="loading loading-spinner loading-xs text-primary"></span>}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                        {profile?.isApplyBlocked ? (
                          <div className="w-full bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                              <MdLock className="text-xl" />
                            </div>
                            <div>
                              <h4 className="text-red-500 font-bold mb-1">Account Restricted</h4>
                              <p className="text-white/60 text-xs">You cannot apply for new jobs until your due balance is cleared. Please visit your earnings page.</p>
                            </div>
                            <Link to="/earnings" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-red-500/20">
                              Clear Dues & Resume Applying
                            </Link>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={submitProposal}
                              disabled={saving || proposal.trim().length < 50 || !proposedPrice}
                              className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[#00C853] to-[#64DD17] text-black font-black uppercase tracking-widest text-sm shadow-xl shadow-green-500/10 hover:shadow-green-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                            >
                              {saving ? 'Processing...' : 'Submit Proposal'}
                            </button>
                            <button className="flex-1 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-sm hover:bg-white/90 active:scale-95 transition-all">
                              Message Client
                            </button>
                          </>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* Existing Applicants List - Modernized */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    Recent Applicants
                  </h2>
                  <span className="text-xs font-bold text-white/40 tracking-widest uppercase">{job.applicants?.length || 0} TOTAL</span>
               </div>
               
               {job.applicants && job.applicants.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {job.applicants.map((app, idx) => (
                      <div key={idx} className="bg-[#111] border border-white/5 p-4 rounded-2xl hover:border-white/10 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black">
                              {app.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1">
                               <p className="font-bold text-white/90 group-hover:text-primary transition-colors">{app.name}</p>
                               <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                  <span className="text-amber-500 flex items-center gap-1">
                                    <i className="fas fa-star"></i> {app.rating || 'N/A'}
                                  </span>
                                  <span>•</span>
                                  <span>৳{app.price?.toLocaleString()}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <div className="text-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No applicants yet. Be the first!</p>
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar (Right 1/3) */}
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            
            {/* 1. About the Client */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8">
               <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">About the Client</h3>
               
               <div className="flex items-center gap-5 mb-8">
                  <div className="relative">
                    <img
                      src={clientPublic?.pfp || 'https://via.placeholder.com/150'}
                      alt={poster.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                    />
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-white">
                       <i className="fas fa-check"></i>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-xl text-white">{poster.name}</h4>
                    <div className="flex items-center gap-1 text-amber-500 text-sm mt-1">
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <span className="text-white/40 text-xs ml-1">(12 reviews)</span>
                    </div>
                  </div>
               </div>
               
               <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm font-medium text-white/70">
                     <i className="fas fa-check-circle text-green-500"></i>
                     <span>Identity Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-white/70">
                     <i className="fas fa-check-circle text-green-500"></i>
                     <span>Payment Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-white/40">
                     <i className="fas fa-calendar-alt"></i>
                     <span>Member since 2021</span>
                  </div>
               </div>
               
               <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={() => navigate(`/client/${poster.clientId}`)}
                    className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-primary text-xs font-black uppercase tracking-widest hover:bg-primary/10 hover:border-primary/30 transition-all"
                  >
                    View Full Profile
                  </button>
               </div>
            </div>

            {/* 2. Safety Tips */}
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-8 group">
               <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                 Hire Mistri Safety Tips
                 <i className="fas fa-shield-alt text-primary opacity-50"></i>
               </h3>
               
               <ul className="space-y-6">
                 <li className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 text-[10px]">
                      <i className="fas fa-check"></i>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">Always get a clear scope of work before starting.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 text-[10px]">
                      <i className="fas fa-check"></i>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">Request 20% advance only via platform escrow.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                      <i className="fas fa-info"></i>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">Contact support for any disputes or payment issues.</p>
                 </li>
               </ul>
            </div>

            {/* 3. Job Activity */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-8">
               <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-8">Job Activity</h3>
               
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-white/60">Proposals</span>
                     <span className="text-sm font-black text-white">5 - 10</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-white/60">Interviewing</span>
                     <span className="text-sm font-black text-white">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-white/60">Last View</span>
                     <span className="text-sm font-black text-white">12 mins ago</span>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="py-12 border-t border-white/5 mt-12 text-center">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">
          © 2024 Hire Mistri • Professional Services Marketplace
        </p>
      </footer>

      {/* Extra Charge Request Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
            <h3 className="text-xl font-bold mb-6">Request Additional Charge</h3>
            <form onSubmit={submitExtraCharge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Charge Type</label>
                <select value={extraType} onChange={e => setExtraType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white">
                   <option value="EXTRA_COST">Materials / Parts / Transport</option>
                   <option value="TIP">Discretionary Tip</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Amount (৳)</label>
                <input type="number" value={extraAmount} onChange={e => setExtraAmount(e.target.value)} placeholder="0.00" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-2">Description</label>
                <textarea value={extraDesc} onChange={e => setExtraDesc(e.target.value)} placeholder="What is this charge for?" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white" required></textarea>
              </div>
              {extraType === 'EXTRA_COST' && (
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2">Receipts (Mandatory)</label>
                  <input type="file" multiple accept="image/*" onChange={e => setExtraReceipts(Array.from(e.target.files))} className="w-full file:bg-primary file:border-none file:px-4 file:py-2 file:rounded-xl file:text-black file:font-bold file:mr-4 file:cursor-pointer text-white/70" required />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                 <button type="submit" disabled={submittingExtra} className="flex-1 py-3 bg-primary text-black font-bold uppercase tracking-widest text-xs rounded-xl disabled:opacity-50">
                    {submittingExtra ? 'Submitting...' : 'Submit Request'}
                 </button>
                 <button type="button" onClick={() => setShowExtraModal(false)} className="px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-xl border border-white/10">
                    Cancel
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

/* ---------- small helpers ---------- */
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-xl leading-6">{icon}</span>
      <div className="text-sm">
        <p className="text-base-content opacity-70">{label}</p>
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

function toNumber(value) {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : null;
}

function getJobLatLng(j) {
  if (!j) return null;
  const lat = toNumber(j.lat ?? j.latitude ?? j?.locationLat ?? j?.location?.lat ?? j?.coordinates?.lat);
  const lng = toNumber(j.lng ?? j.longitude ?? j?.locationLng ?? j?.location?.lng ?? j?.coordinates?.lng);
  if (lat === null || lng === null) return null;
  return { lat, lng };
}

function getDistanceKm(a, b) {
  if (!a || !b) return null;
  const latA = toNumber(a.lat);
  const lngA = toNumber(a.lng);
  const latB = toNumber(b.lat);
  const lngB = toNumber(b.lng);
  if (latA === null || lngA === null || latB === null || lngB === null) return null;
  const R = 6371;
  const dLat = (latB - latA) * Math.PI / 180;
  const dLng = (lngB - lngA) * Math.PI / 180;
  const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(latA * Math.PI / 180) * Math.cos(latB * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return Math.round(R * c * 10) / 10;
}
