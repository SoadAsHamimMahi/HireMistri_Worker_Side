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
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
            <i className="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Error Loading Job
          </h3>
          <p className="text-gray-600 mb-6">{err}</p>
          <button 
            onClick={() => navigate('/jobs')} 
            className="px-6 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#f9f9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            <i className="fas fa-briefcase text-gray-400 text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Job Not Found
          </h3>
          <p className="text-gray-600 mb-6">This job may have been removed or doesn't exist.</p>
          <button 
            onClick={() => navigate('/jobs')} 
            className="px-6 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-colors shadow-sm"
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
    <div className="min-h-screen bg-[#f9f9f7] text-gray-900 font-sans pb-20 pt-6">
      
      {/* Top Navbar / Header area (Simplified for Light Theme) */}
      <div className="w-full max-w-[83.333%] mx-auto mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-semibold transition-colors"
        >
          <i className="fas fa-arrow-left"></i>
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
           <div className="tooltip tooltip-bottom" data-tip="Share Job">
             <ShareButton jobId={id} jobTitle={job.title} jobDescription={job.description} className="!w-10 !h-10 !rounded-full bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm border" />
           </div>
           <div className="tooltip tooltip-bottom" data-tip="Bookmark">
             <BookmarkButton jobId={id} className="!w-10 !h-10 !rounded-full bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm border" />
           </div>
        </div>
      </div>

      <div className="w-full max-w-[83.333%] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left 2/3) */}
          <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* 1. Hero Title Card */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light blur-[100px] -mr-32 -mt-32"></div>
               
               <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-4 leading-tight relative">
                 {job.title || 'Untitled Job'}
               </h1>
               
               <div className="flex flex-wrap items-center gap-6 text-sm relative">
                 <div className="flex items-center gap-2 font-bold text-brand-hover">
                   <i className="fas fa-money-bill-wave"></i>
                   <span className="text-xl">৳{job.budget?.toLocaleString() || 'N/A'} Total</span>
                 </div>
                 <div className="flex items-center gap-2 text-gray-600">
                   <i className="fas fa-map-marker-alt"></i>
                   <span>{job.location || 'N/A'}</span>
                 </div>
                 <div className="flex items-center gap-2 text-gray-500">
                   <i className="fas fa-clock"></i>
                   <span>Posted {timeAgo(job.createdAt || job.date)}</span>
                 </div>
               </div>
               
               {distanceKm !== null && (
                 <div className="mt-6 relative">
                    <span className="inline-flex items-center gap-2 bg-green-50 text-brand-hover px-4 py-1.5 rounded-full text-xs font-bold border border-green-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse"></span>
                      {distanceKm} KM FROM {workerLocation === ctx?.profile?.locationGeo ? 'SAVED ADDRESS' : 'YOU'}
                    </span>
                 </div>
               )}
            </div>

            {/* 2. Job Details Grid */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
               <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                 <span className="w-1.5 h-6 bg-brand rounded-full"></span>
                 Job Details
               </h2>
               
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</span>
                    <span className="text-lg font-bold text-gray-900">{job.category || 'Masonry (Mistri)'}</span>
                 </div>
                 <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</span>
                    <span className="text-lg font-bold text-gray-900">{job.duration || '5 Days'}</span>
                 </div>
                 <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
                    <span className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</span>
                    <span className="text-lg font-bold text-gray-900">{job.startDate ? new Date(job.startDate).toLocaleDateString() : 'Immediate'}</span>
                 </div>
               </div>

               {/* Description */}
               <div className="mt-8">
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Description</h3>
                 <div className="text-gray-700 leading-relaxed space-y-4 text-base">
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
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Required Skills</h3>
                 <div className="flex flex-wrap gap-2">
                   {(job.skills || ['Plastering', 'Tile Installation', 'Cement Work', 'Finishing']).map((skill, idx) => (
                     <span key={idx} className="px-4 py-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-all cursor-default">
                       {skill}
                     </span>
                   ))}
                 </div>
               </div>
            </div>

            {/* 2.5 Image Gallery */}
            {images && images.length > 0 && (
               <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
                  <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-brand rounded-full"></span>
                    Project Media
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {images.map((img, idx) => (
                        <div key={idx} className={`relative rounded-2xl overflow-hidden border border-gray-200 group ${idx === 0 && images.length % 2 !== 0 ? 'sm:col-span-2' : ''}`}>
                           <img 
                              src={img} 
                              alt={`Job ${idx}`} 
                              className="w-full h-64 object-cover transition-transform duration-500 group-hover:scale-110"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                              <span className="text-xs font-bold text-white uppercase tracking-widest">View Full Image</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Required Skills moved below Gallery or kept in Details? Let's keep it in Details as I had it. */}

            {/* 3. Work Location */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
               <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                 <span className="w-1.5 h-6 bg-brand rounded-full"></span>
                 Work Location
               </h2>
               
               <div className="relative rounded-3xl overflow-hidden border border-gray-200 h-[350px] shadow-sm">
                  <JobLocationMap
                    locationGeo={resolvedJobGeo}
                    locationText={resolvedLocationText}
                    className="h-full w-full"
                  />
                  
                  {/* Map Overlay Info */}
                  <div className="absolute bottom-6 left-6 right-6 z-[400]">
                    <div className="bg-white/90 backdrop-blur-sm border border-gray-200 px-6 py-3 rounded-2xl inline-flex items-center gap-3 shadow-md">
                       <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand">
                         <i className="fas fa-map-marker-alt"></i>
                       </div>
                       <span className="text-sm font-bold text-gray-900 tracking-tight">
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
                      className="text-brand text-sm font-bold flex items-center gap-2 hover:underline"
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
              <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-8">
                <h2 className="text-xl font-black text-gray-900 mb-4">
                  <i className="fas fa-map-marked-alt text-brand mr-2"></i> Live Tracking
                </h2>
                <div className="rounded-2xl overflow-hidden border border-gray-200 h-[400px]">
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
               <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                      <i className="fas fa-file-alt text-brand"></i>
                      Your Application Status
                    </h2>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${
                      application.status === 'accepted' ? 'bg-green-50 text-green-600 border-green-200' :
                      application.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                      'bg-brand-light text-brand border-brand/20'
                    }`}>
                      {application.status || 'Pending'}
                    </span>
                  </div>

                  <div className="space-y-8">
                     {/* Proposal Text */}
                     <div>
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Your Proposal</h3>
                           {!isEditingProposal && application.status === 'pending' && (
                              <button onClick={handleEditProposal} className="text-brand text-[10px] font-black uppercase tracking-widest hover:underline">
                                Edit Proposal
                              </button>
                           )}
                        </div>
                        
                        {isEditingProposal ? (
                           <div className="space-y-4">
                              <textarea
                                value={editedProposalText}
                                onChange={(e) => setEditedProposalText(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all outline-none text-gray-900 resize-none"
                                rows={6}
                              />
                              <div className="flex gap-3">
                                 <button onClick={handleSaveProposal} disabled={saving || editedProposalText.length < 50} className="flex-1 py-3 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-widest transition-all">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                 </button>
                                 <button onClick={handleCancelEdit} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-widest transition-all hover:bg-gray-50">
                                    Cancel
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <p className="text-gray-700 bg-gray-50 p-6 rounded-2xl border border-gray-100 leading-relaxed italic">
                              "{application.proposalText || 'No proposal text provided.'}"
                           </p>
                        )}
                     </div>

                     {/* Price Details */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl">
                           <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Original Bid</span>
                           <span className="text-xl font-black text-gray-900">৳{Number(application.proposedPrice || 0).toLocaleString()}</span>
                        </div>
                        
                        {application.counterPrice && (
                           <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2 bg-amber-400 text-amber-900 text-[8px] font-black uppercase tracking-widest rounded-bl-lg">Counter Offer</div>
                              <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Client Offered</span>
                              <span className="text-xl font-black text-amber-600">৳{Number(application.counterPrice).toLocaleString()}</span>
                              
                              {application.status === 'pending' && !['accepted', 'declined'].includes((application.negotiationStatus || '').toLowerCase()) && (
                                 <div className="flex gap-2 mt-4">
                                    <button onClick={() => handleCounterDecision('accept')} disabled={negotiatingPrice} className="flex-1 py-2 bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-tighter rounded-lg hover:bg-amber-500 transition-all">Accept</button>
                                    <button onClick={() => handleCounterDecision('decline')} disabled={negotiatingPrice} className="flex-1 py-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-tighter rounded-lg hover:bg-gray-50 transition-all">Decline</button>
                                 </div>
                              )}
                           </div>
                        )}

                        {application.finalPrice && (
                           <div className="bg-green-50 border border-green-200 p-5 rounded-2xl col-span-full">
                              <span className="block text-xs font-bold text-green-700 uppercase tracking-widest mb-2">Final Agreed Price</span>
                              <span className="text-2xl font-black text-green-600">৳{Number(application.finalPrice).toLocaleString()}</span>
                           </div>
                        )}
                     </div>

                     {/* Estimated Platform Fee Card - only show when accepted and price is known */}
                     {(application.status === 'accepted' || application.status === 'pending' || application.status === 'in-progress') && (application.finalPrice || application.proposedPrice) && (
                       <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 w-full mt-4 relative overflow-hidden group">
                         {isFeeLoading && (
                           <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-10 flex items-center justify-center">
                             <div className="loading loading-spinner loading-sm text-brand"></div>
                           </div>
                         )}
                         <div className="absolute top-0 right-0 w-24 h-24 bg-brand-light blur-2xl -mr-12 -mt-12 rounded-full"></div>
                         
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center justify-between">
                           <span>Estimated Earnings Breakdown</span>
                           {feeStats?.tier && (
                             <span className="text-brand bg-brand-light px-2 py-0.5 rounded text-[8px] border border-brand/20">
                               {feeStats.tier.replace('_', ' ')}
                             </span>
                           )}
                         </p>
                         
                         {feeStats ? (
                           <div className="space-y-3">
                             <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100">
                               <span className="text-sm text-gray-600">Agreed Labor Price</span>
                               <span className="text-base font-bold text-gray-900">৳{(Number(application.finalPrice || application.proposedPrice || 0)).toLocaleString()}</span>
                             </div>
                             
                             <div className="flex justify-between items-center px-3">
                               <div className="flex items-center gap-2">
                                 <span className="text-sm text-gray-500">Platform Fee</span>
                                 <div className="tooltip tooltip-right" data-tip="PLATFORM_FIXED_FEE + TIERED_LABOR_PERCENTAGE">
                                   <i className="fas fa-info-circle text-[10px] text-gray-400 cursor-help"></i>
                                 </div>
                               </div>
                               <span className="text-sm font-bold text-red-500">- ৳{feeStats.fee?.toLocaleString()}</span>
                             </div>
                             
                             <div className="mt-2 pt-3 border-t border-gray-200 flex justify-between items-center px-3">
                               <span className="text-base font-black text-gray-900">Net Earnings</span>
                               <div className="text-right">
                                 <span className="text-2xl font-black text-[#1ec86d]">৳{(Number(application.finalPrice || application.proposedPrice || 0) - feeStats.fee).toLocaleString()}</span>
                                 <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Expected Payout</p>
                               </div>
                             </div>
                           </div>
                         ) : (
                           <p className="text-xs text-gray-400 italic py-2">Calculating earnings projection...</p>
                         )}
                         
                         <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 items-start">
                           <i className="fas fa-shield-alt text-amber-500 text-[10px] mt-1"></i>
                           <p className="text-[10px] text-amber-700 leading-relaxed">
                             This fee is only charged upon <span className="font-bold">successful completion</span> and will be added to your account's due balance.
                           </p>
                         </div>
                       </div>
                     )}

                     {/* Action Buttons */}
                     <div className="pt-4 flex gap-4">
                        <button className="flex-1 py-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all">
                           Message Client
                        </button>
                        <button className="flex-1 py-4 rounded-xl bg-red-50 border border-red-200 text-red-600 font-black uppercase tracking-widest text-xs hover:bg-red-100 transition-all">
                           Withdraw Application
                        </button>
                     </div>

                     {/* Additional Charges Section */}
                     {(application.status === 'accepted' || application.status === 'completed') && (
                        <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl w-full mt-4">
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Additional Charges & Tips</span>
                              <button onClick={() => setShowExtraModal(true)} disabled={application.status === 'completed'} className="px-4 py-2 bg-brand-light text-brand hover:bg-brand/20 transition-colors rounded-lg text-xs font-black uppercase tracking-widest disabled:opacity-50">
                                 + Request Extra
                              </button>
                           </div>
                           
                           {extraChargesList.length > 0 ? (
                              <div className="space-y-3 mt-4">
                                 {extraChargesList.map(charge => (
                                    <div key={charge._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                       <div>
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${charge.type === 'TIP' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {charge.type.replace('_', ' ')}
                                             </span>
                                             <span className="font-bold text-gray-900 text-sm">৳{Number(charge.amount).toLocaleString()}</span>
                                          </div>
                                          <p className="text-xs text-gray-500">{charge.description || 'No description provided'}</p>
                                          {charge.receiptUrls && charge.receiptUrls.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                              {charge.receiptUrls.map((url, i) => (
                                                <a key={i} href={base + url} target="_blank" rel="noreferrer" className="text-[10px] text-brand hover:underline">View Receipt {i+1}</a>
                                              ))}
                                            </div>
                                          )}
                                       </div>
                                       <div className="shrink-0">
                                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                                             charge.status === 'APPROVED' ? 'bg-green-50 text-green-600' :
                                             charge.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                                             'bg-amber-50 text-amber-600'
                                          }`}>
                                             {charge.status}
                                          </span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <p className="text-xs text-gray-400 italic mt-4">No additional charges requested.</p>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            ) : !hasApplied && (
               <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
                  <h2 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                    <i className="fas fa-paper-plane text-brand text-sm"></i>
                    Apply for this Job
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Proposed Price (৳)</label>
                      <div className="relative">
                         <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                         <input
                           type="number"
                           value={proposedPrice}
                           onChange={(e) => setProposedPrice(e.target.value)}
                           placeholder="15,000"
                           className="w-full pl-10 pr-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none font-bold text-lg text-gray-900"
                         />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Proposal / Message</label>
                      <textarea
                        value={proposal}
                        onChange={(e) => setProposal(e.target.value)}
                        placeholder="Briefly describe your experience with similar work..."
                        rows={6}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all outline-none text-gray-900 resize-none"
                      />
                      <div className="flex justify-between items-center mt-2 px-2">
                         <span className={`text-[10px] font-bold ${proposal.length < 50 ? 'text-gray-400' : 'text-green-500'}`}>
                           {proposal.length}/50 min characters
                         </span>
                         {saving && <span className="loading loading-spinner loading-xs text-brand"></span>}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                        {profile?.isApplyBlocked ? (
                          <div className="w-full bg-red-50 border border-red-200 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                              <i className="fas fa-lock text-xl"></i>
                            </div>
                            <div>
                              <h4 className="text-red-600 font-bold mb-1">Account Restricted</h4>
                              <p className="text-gray-600 text-xs">You cannot apply for new jobs until your due balance is cleared. Please visit your earnings page.</p>
                            </div>
                            <Link to="/earnings" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-sm">
                              Clear Dues & Resume Applying
                            </Link>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={submitProposal}
                              disabled={saving || proposal.trim().length < 50 || !proposedPrice}
                              className="flex-[2] py-4 rounded-2xl bg-brand hover:bg-brand-hover text-white font-black uppercase tracking-widest text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? 'Processing...' : 'Submit Proposal'}
                            </button>
                            <button className="flex-1 py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 font-black uppercase tracking-widest text-sm hover:bg-gray-50 transition-all">
                              Message Client
                            </button>
                          </>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* Existing Applicants List - Modernized */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
               <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-brand rounded-full"></span>
                    Recent Applicants
                  </h2>
                  <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">{job.applicants?.length || 0} TOTAL</span>
               </div>
               
               {job.applicants && job.applicants.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {job.applicants.map((app, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl hover:border-gray-200 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand font-black">
                              {app.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1">
                               <p className="font-bold text-gray-900 group-hover:text-brand transition-colors">{app.name}</p>
                               <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
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
                 <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No applicants yet. Be the first!</p>
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar (Right 1/3) */}
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
            
            {/* 1. About the Client */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">About the Client</h3>
               
               <div className="flex items-center gap-5 mb-8">
                  <div className="relative">
                    <img
                      src={clientPublic?.pfp || 'https://placehold.co/150'}
                      alt={poster.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-brand"
                    />
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white">
                       <i className="fas fa-check"></i>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{poster.name}</h4>
                    <div className="flex items-center gap-1 text-amber-500 text-sm mt-1">
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <i className="fas fa-star"></i>
                       <span className="text-gray-500 text-xs ml-1">(12 reviews)</span>
                    </div>
                  </div>
               </div>
               
               <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                     <i className="fas fa-check-circle text-green-500"></i>
                     <span>Identity Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                     <i className="fas fa-check-circle text-green-500"></i>
                     <span>Payment Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
                     <i className="fas fa-calendar-alt"></i>
                     <span>Member since 2021</span>
                  </div>
               </div>
               
               <div className="pt-6 border-t border-gray-100">
                  <button 
                    onClick={() => navigate(`/client/${poster.clientId}`)}
                    className="w-full py-4 rounded-xl bg-brand-light border border-brand/20 text-brand text-xs font-black uppercase tracking-widest hover:bg-brand/20 hover:border-brand/30 transition-all"
                  >
                    View Full Profile
                  </button>
               </div>
            </div>

            {/* 2. Safety Tips */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 group">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                 Hire Mistri Safety Tips
                 <i className="fas fa-shield-alt text-brand opacity-50"></i>
               </h3>
               
               <ul className="space-y-6">
                 <li className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-green-600 text-[10px]">
                      <i className="fas fa-check"></i>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">Always get a clear scope of work before starting.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-green-600 text-[10px]">
                      <i className="fas fa-check"></i>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">Request 20% advance only via platform escrow.</p>
                 </li>
                 <li className="flex gap-4">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-brand-light flex items-center justify-center text-brand text-[10px]">
                      <i className="fas fa-info"></i>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">Contact support for any disputes or payment issues.</p>
                 </li>
               </ul>
            </div>

            {/* 3. Job Activity */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
               <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-8">Job Activity</h3>
               
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-600">Proposals</span>
                     <span className="text-sm font-black text-gray-900">5 - 10</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-600">Interviewing</span>
                     <span className="text-sm font-black text-gray-900">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm text-gray-600">Last View</span>
                     <span className="text-sm font-black text-gray-900">12 mins ago</span>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      {/* Extra Charge Request Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 z-[999] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 relative shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Request Additional Charge</h3>
            <form onSubmit={submitExtraCharge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Charge Type</label>
                <select value={extraType} onChange={e => setExtraType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-brand/20 outline-none">
                   <option value="EXTRA_COST">Materials / Parts / Transport</option>
                   <option value="TIP">Discretionary Tip</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Amount (৳)</label>
                <input type="number" value={extraAmount} onChange={e => setExtraAmount(e.target.value)} placeholder="0.00" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-brand/20 outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Description</label>
                <textarea value={extraDesc} onChange={e => setExtraDesc(e.target.value)} placeholder="What is this charge for?" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-brand/20 outline-none" required></textarea>
              </div>
              {extraType === 'EXTRA_COST' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">Receipts (Mandatory)</label>
                  <input type="file" multiple accept="image/*" onChange={e => setExtraReceipts(Array.from(e.target.files))} className="w-full file:bg-brand-light file:border-none file:px-4 file:py-2 file:rounded-xl file:text-brand file:font-bold file:mr-4 file:cursor-pointer text-gray-600" required />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                 <button type="submit" disabled={submittingExtra} className="flex-1 py-3 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-widest text-xs rounded-xl disabled:opacity-50 transition-colors">
                    {submittingExtra ? 'Submitting...' : 'Submit Request'}
                 </button>
                 <button type="button" onClick={() => setShowExtraModal(false)} className="px-6 py-3 bg-gray-100 text-gray-700 font-bold uppercase tracking-widest text-xs rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors">
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
