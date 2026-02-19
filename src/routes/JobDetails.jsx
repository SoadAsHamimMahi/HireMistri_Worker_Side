import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import PageContainer from '../components/layout/PageContainer';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const DEBUG_LOG_ENDPOINT = 'http://127.0.0.1:7244/ingest/911a7613-44ba-43a9-92c1-5f0fb37aadca';
const LOG_FILE_PATH = 'c:\\Projects\\Hire-Mistri\\.cursor\\debug.log';
const debugLog = (location, message, data, hypothesisId) => {
  const logEntry = {
    location,
    message,
    data: { ...data, timestamp: Date.now() },
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId
  };
  // Try fetch first
  fetch(DEBUG_LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logEntry)
  }).catch(() => {});
  // Also log to console for immediate visibility
  console.log(`[DEBUG ${hypothesisId}] ${location}: ${message}`, data);
};

const JobDetails = () => {
  const { jobId } = useParams();
  const { user } = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);
  const [proposalText, setProposalText] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [hasApplied, setHasApplied] = useState(false);
  const [workerLocation, setWorkerLocation] = useState(null); // { lat, lng }
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [clientProfile, setClientProfile] = useState(null);
  const [currentApplication, setCurrentApplication] = useState(null);

  // Log component mount
  useEffect(() => {
    debugLog('JobDetails.jsx:33', 'Component mounted', { jobId }, 'E');
    console.log('🚀 JobDetails component mounted with jobId:', jobId);
  }, []);

  // fix default marker icons for Vite
  const DefaultIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  }), []);

  const JobIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'job-marker',
  }), []);

  const WorkerIcon = useMemo(() => new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: 'worker-marker',
  }), []);

  const getJobLatLng = (j) => {
    if (!j) return null;
    const lat = j.lat ?? j.latitude ?? j?.locationLat ?? j?.location?.lat ?? j?.coordinates?.lat;
    const lng = j.lng ?? j.longitude ?? j?.locationLng ?? j?.location?.lng ?? j?.coordinates?.lng;
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng]; // Return array for Leaflet
    return null;
  };

  // simple haversine in km (accepts arrays [lat, lng])
  const getDistanceKm = (a, b) => {
    if (!a || !b) return null;
    // Handle both array [lat, lng] and object {lat, lng} formats
    const latA = Array.isArray(a) ? a[0] : a.lat;
    const lngA = Array.isArray(a) ? a[1] : a.lng;
    const latB = Array.isArray(b) ? b[0] : b.lat;
    const lngB = Array.isArray(b) ? b[1] : b.lng;
    if (typeof latA !== 'number' || typeof lngA !== 'number' || typeof latB !== 'number' || typeof lngB !== 'number') return null;
    const R = 6371; // km
    const dLat = (latB - latA) * Math.PI / 180;
    const dLng = (lngB - lngA) * Math.PI / 180;
    const s1 = Math.sin(dLat / 2) ** 2 + Math.cos(latA * Math.PI / 180) * Math.cos(latB * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
    return Math.round(R * c * 10) / 10;
  };

  useEffect(() => {
    console.log('🚀 [EFFECT] JobDetails useEffect triggered, jobId:', jobId);
    const fetchJobDetails = async () => {
      console.log('🚀 [FETCH START] fetchJobDetails called, jobId:', jobId);
      if (!jobId) {
        console.error('❌ [FETCH] No jobId provided');
        setError('No job ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🚀 [FETCH] Starting fetch, setting loading=true');
        setLoading(true);
        setError('');

        // Fetch job details - try browse-jobs first (new collection), fallback to jobs (legacy)
        let jobData = null;
        // #region agent log
        debugLog('JobDetails.jsx:120', 'Fetching job data', { jobId, jobIdType: typeof jobId }, 'B');
        console.log('🔵 [FETCH START] Fetching job with ID:', jobId, 'Type:', typeof jobId);
        // #endregion
        try {
          const { data } = await axios.get(`${API_BASE}/api/browse-jobs/${jobId}`, {
            headers: { Accept: 'application/json' },
          });
          jobData = data;
          // #region agent log
          debugLog('JobDetails.jsx:101', 'Job fetched from browse-jobs', { 
            hasClientId: !!data?.clientId, 
            clientId: data?.clientId,
            allKeys: Object.keys(data || {})
          }, 'B');
          // #endregion
          console.log('✅ Job fetched from browse-jobs');
        } catch (err) {
          // #region agent log
          debugLog('JobDetails.jsx:103', 'Browse-jobs fetch failed, trying legacy', { error: err.message }, 'B');
          // #endregion
          // Fallback to legacy endpoint
          try {
            const { data } = await axios.get(`${API_BASE}/api/jobs/${jobId}`, {
              headers: { Accept: 'application/json' },
            });
            jobData = data;
            // #region agent log
            debugLog('JobDetails.jsx:110', 'Job fetched from legacy endpoint', { 
              hasClientId: !!data?.clientId,
              clientId: data?.clientId,
              allKeys: Object.keys(data || {})
            }, 'B');
            // #endregion
            console.log('✅ Job fetched from legacy jobs endpoint');
          } catch (err2) {
            throw err2;
          }
        }

        // Check if user has already applied and get current application
        if (user?.uid) {
          try {
            const { data: applications } = await axios.get(`${API_BASE}/api/my-applications/${user.uid}`, {
              headers: { Accept: 'application/json' },
            });
            
            const userApplication = applications.find(app => app.jobId === jobId);
            if (userApplication) {
              setHasApplied(true);
              setCurrentApplication(userApplication);
              setProposedPrice(userApplication.proposedPrice || '');
            }
          } catch (err) {
            console.log('Could not check application status');
          }
        }

        console.log('✅ [FETCH] Job data received:', { 
          hasData: !!jobData, 
          clientId: jobData?.clientId,
          title: jobData?.title 
        });
        setJob(jobData);
        
        // #region agent log
        debugLog('JobDetails.jsx:181', 'Job state set', { 
          jobIsNull: !jobData,
          clientId: jobData?.clientId,
          clientName: jobData?.clientName,
          postedByName: jobData?.postedByName,
          postedByEmail: jobData?.postedByEmail,
          clientEmail: jobData?.clientEmail,
          email: jobData?.email,
          location: jobData?.location
        }, 'A');
        // #endregion
        
        // IMMEDIATELY set a basic clientProfile so it's never null
        console.log('🔵 [INITIAL PROFILE CHECK] jobData?.clientId:', jobData?.clientId);
        const locationParts = jobData.location ? jobData.location.split(',') : [];
        const emailFromJob = jobData.clientEmail || jobData.postedByEmail || jobData.email || null;
        
        if (jobData?.clientId) {
          const initialProfile = {
            displayName: `Loading... (${jobData.clientId.substring(0, 8)})`,
            email: emailFromJob,
            emailVerified: false,
            stats: {},
            city: locationParts[0]?.trim() || null,
            country: locationParts[locationParts.length - 1]?.trim() || null,
            uid: jobData.clientId
          };
          console.log('🟡 [INITIAL PROFILE] Setting initial profile:', initialProfile);
          setClientProfile(initialProfile);
          console.log('🟡 [INITIAL PROFILE] setClientProfile called');
        } else {
          console.warn('⚠️ [INITIAL PROFILE] No clientId found in jobData');
          // Even if no clientId, set a basic profile so it's never null
          const basicProfile = {
            displayName: jobData.clientName || jobData.postedByName || 'Unknown Client',
            email: emailFromJob,
            emailVerified: false,
            stats: {},
            city: locationParts[0]?.trim() || null,
            country: locationParts[locationParts.length - 1]?.trim() || null
          };
          setClientProfile(basicProfile);
        }
        
        // Log job data for debugging
        console.log('📋 Full Job Data:', jobData);
        console.log('📋 Job clientId:', jobData?.clientId);
        console.log('📋 Job clientName:', jobData?.clientName);
        console.log('📋 Job postedByName:', jobData?.postedByName);
        console.log('📋 Job postedByEmail:', jobData?.postedByEmail);
        console.log('📋 Job clientEmail:', jobData?.clientEmail);
        console.log('📋 Job email:', jobData?.email);
        console.log('📋 Job location:', jobData?.location);
        
        // Fetch client profile if clientId exists
        // #region agent log
        debugLog('JobDetails.jsx:206', 'Checking clientId before fetch', { 
          hasClientId: !!jobData?.clientId,
          clientId: jobData?.clientId,
          jobDataKeys: Object.keys(jobData || {})
        }, 'A');
        // #endregion
        console.log('🔵 [CLIENT PROFILE CHECK] clientId exists?', !!jobData?.clientId, 'clientId:', jobData?.clientId);
        if (jobData?.clientId) {
          try {
            const profileUrl = `${API_BASE}/api/users/${jobData.clientId}/public`;
            // #region agent log
            debugLog('JobDetails.jsx:213', 'Fetching client profile', { 
              clientId: jobData.clientId,
              url: profileUrl 
            }, 'A');
            console.log('🔵 [CLIENT PROFILE] Fetching from:', profileUrl);
            // #endregion
            const { data: clientData } = await axios.get(profileUrl, {
              headers: { Accept: 'application/json' },
            });
            // #region agent log
            debugLog('JobDetails.jsx:152', 'Client profile fetched successfully', { 
              hasDisplayName: !!clientData?.displayName,
              displayName: clientData?.displayName,
              hasStats: !!clientData?.stats,
              statsKeys: clientData?.stats ? Object.keys(clientData.stats) : []
            }, 'A');
            // #endregion
            console.log('✅ Client profile fetched:', clientData);
            // Ensure email is included (merge with job data email as fallback)
            const emailFromJob = jobData.clientEmail || jobData.postedByEmail || jobData.email || null;
            setClientProfile({
              ...clientData,
              email: clientData.email || emailFromJob || ''
            });
            // #region agent log
            debugLog('JobDetails.jsx:153', 'ClientProfile state set', { 
              displayName: clientData?.displayName,
              hasStats: !!clientData?.stats
            }, 'C');
            // #endregion
          } catch (err) {
            // #region agent log
            debugLog('JobDetails.jsx:237', 'Client profile fetch failed', { 
              error: err.message,
              errorStatus: err?.response?.status,
              errorResponse: err?.response?.data,
              clientId: jobData.clientId,
              url: `${API_BASE}/api/users/${jobData.clientId}/public`
            }, 'A');
            // #endregion
            console.error('❌ Failed to fetch client profile:', err);
            console.error('❌ Error status:', err?.response?.status);
            console.error('❌ Error data:', err?.response?.data);
            console.log('🔴 [CLIENT PROFILE FAILED] clientId:', jobData.clientId, 'URL:', `${API_BASE}/api/users/${jobData.clientId}/public`);
            // Try to get basic user info as fallback
            try {
              const { data: basicUserData } = await axios.get(`${API_BASE}/api/users/${jobData.clientId}`, {
                headers: { Accept: 'application/json' },
              });
              // #region agent log
              debugLog('JobDetails.jsx:248', 'Got basic user data as fallback', {
                hasDisplayName: !!basicUserData?.displayName,
                displayName: basicUserData?.displayName,
                email: basicUserData?.email
              }, 'A');
              // #endregion
              const locationParts = jobData.location ? jobData.location.split(',') : [];
              const emailFromJob = jobData.clientEmail || jobData.postedByEmail || jobData.email || null;
              const fallbackProfile = {
                displayName: basicUserData?.displayName || 
                            [basicUserData?.firstName, basicUserData?.lastName].filter(Boolean).join(' ') ||
                            jobData.clientName || 
                            jobData.postedByName || 
                            (jobData.clientId ? `Client ${jobData.clientId.substring(0, 12)}...` : 'Unknown'),
                email: basicUserData?.email || emailFromJob,
                emailVerified: !!basicUserData?.emailVerified,
                stats: {},
                city: basicUserData?.city || locationParts[0]?.trim() || null,
                country: basicUserData?.country || locationParts[locationParts.length - 1]?.trim() || null,
                uid: jobData.clientId || null
              };
              // #region agent log
              debugLog('JobDetails.jsx:262', 'Setting fallback profile from basic user', fallbackProfile, 'A');
              // #endregion
              setClientProfile(fallbackProfile);
            } catch (fallbackErr) {
              // #region agent log
              debugLog('JobDetails.jsx:313', 'Basic user fetch also failed', { 
                error: fallbackErr.message,
                errorStatus: fallbackErr?.response?.status,
                clientId: jobData.clientId
              }, 'A');
              // #endregion
              console.error('❌ Basic user fetch also failed:', fallbackErr);
              console.error('❌ Basic user error status:', fallbackErr?.response?.status);
              // Final fallback - use job data only, but ALWAYS show clientId if available
              const locationParts = jobData.location ? jobData.location.split(',') : [];
              const emailFromJob = jobData.clientEmail || jobData.postedByEmail || jobData.email || null;
              const fallbackProfile = {
                displayName: jobData.clientName || 
                            jobData.postedByName || 
                            (jobData.clientId ? `Client ${jobData.clientId.substring(0, 12)}...` : 'Unknown Client'),
                email: emailFromJob,
                emailVerified: false,
                stats: {},
                city: locationParts[0]?.trim() || null,
                country: locationParts[locationParts.length - 1]?.trim() || null,
                // Keep clientId for reference
                uid: jobData.clientId || null
              };
              // #region agent log
              debugLog('JobDetails.jsx:330', 'Setting final fallback profile', fallbackProfile, 'A');
              // #endregion
              console.log('⚠️ Using final fallback profile (user not found in DB):', fallbackProfile);
              setClientProfile(fallbackProfile);
            }
          }
        } else {
          // #region agent log
          debugLog('JobDetails.jsx:296', 'No clientId found in job data', { 
            clientName: jobData?.clientName,
            postedByName: jobData?.postedByName,
            location: jobData?.location,
            allJobKeys: Object.keys(jobData || {})
          }, 'A');
          // #endregion
          console.warn('⚠️ No clientId found in job data');
          console.log('🔴 [NO CLIENT ID] Available job fields:', Object.keys(jobData || {}));
          // Still set a basic profile from job data
          const locationParts = jobData.location ? jobData.location.split(',') : [];
          const emailFromJob = jobData.clientEmail || jobData.postedByEmail || jobData.email || null;
          const basicProfile = {
            displayName: jobData.clientName || jobData.postedByName || 'Unknown Client',
            email: emailFromJob,
            emailVerified: false,
            stats: {},
            city: locationParts[0]?.trim() || null,
            country: locationParts[locationParts.length - 1]?.trim() || null
          };
          // #region agent log
          debugLog('JobDetails.jsx:362', 'Setting basic profile (no clientId)', basicProfile, 'A');
          // #endregion
          console.log('⚠️ Setting basic profile (no clientId):', basicProfile);
          setClientProfile(basicProfile);
        }
        
        // #region agent log
        debugLog('JobDetails.jsx:315', 'After client profile fetch logic', {
          clientProfileSet: !!clientProfile,
          clientProfileDisplayName: clientProfile?.displayName
        }, 'A');
        // #endregion
        
        // Fetch applicants for this job
        fetchApplicants(jobId);
        
        // Debug: Log job data to check coordinates
        console.log('📋 Job Data:', jobData);
        console.log('📍 Available coordinate fields:', {
          lat: jobData?.lat,
          lng: jobData?.lng,
          latitude: jobData?.latitude,
          longitude: jobData?.longitude,
          locationLat: jobData?.locationLat,
          locationLng: jobData?.locationLng,
          location: jobData?.location,
          coordinates: jobData?.coordinates
        });
      } catch (err) {
        console.error('Failed to load job details:', err?.response?.data || err.message);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
    
    // Cleanup: Reset clientProfile when jobId changes to prevent stale data
    return () => {
      setClientProfile(null);
    };
  }, [jobId, user?.uid]);

  // Fetch applicants for the job
  const fetchApplicants = async (jobId) => {
    if (!jobId) {
      // #region agent log
      debugLog('JobDetails.jsx:348', 'fetchApplicants skipped - no jobId', {}, 'E');
      // #endregion
      return;
    }
    try {
      setApplicantsLoading(true);
      // #region agent log
      debugLog('JobDetails.jsx:353', 'Fetching applicants', { jobId, endpoint: `${API_BASE}/api/job-applications/${jobId}` }, 'E');
      // #endregion
      const { data } = await axios.get(`${API_BASE}/api/job-applications/${jobId}`, {
        headers: { Accept: 'application/json' },
      });
      // #region agent log
      debugLog('JobDetails.jsx:358', 'Applicants fetched successfully', { count: Array.isArray(data) ? data.length : 0 }, 'E');
      // #endregion
      setApplicants(Array.isArray(data) ? data : []);
    } catch (err) {
      // #region agent log
      debugLog('JobDetails.jsx:362', 'Failed to fetch applicants', { 
        error: err.message, 
        status: err?.response?.status,
        jobId 
      }, 'E');
      // #endregion
      console.error('Failed to fetch applicants (non-blocking):', err?.response?.status || err.message);
      // Don't block rendering - just set empty array
      setApplicants([]);
    } finally {
      setApplicantsLoading(false);
    }
  };

  // Track state changes for debugging
  useEffect(() => {
    // #region agent log
    debugLog('JobDetails.jsx:useEffect-job', 'Job state changed', {
      jobIsNull: !job,
      jobClientId: job?.clientId,
      jobClientName: job?.clientName,
      jobPostedByName: job?.postedByName,
      jobPostedByEmail: job?.postedByEmail,
      jobClientEmail: job?.clientEmail,
      jobEmail: job?.email,
      jobLocation: job?.location
    }, 'C');
    // #endregion
  }, [job]);

  useEffect(() => {
    // #region agent log
    debugLog('JobDetails.jsx:useEffect-clientProfile', 'ClientProfile state changed', {
      clientProfileIsNull: !clientProfile,
      displayName: clientProfile?.displayName,
      hasStats: !!clientProfile?.stats,
      statsKeys: clientProfile?.stats ? Object.keys(clientProfile.stats) : [],
      city: clientProfile?.city,
      country: clientProfile?.country
    }, 'C');
    // #endregion
  }, [clientProfile]);

  // get worker geolocation (optional)
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkerLocation([pos.coords.latitude, pos.coords.longitude]); // Array format for Leaflet
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  const handleApply = async () => {
    if (!user?.uid) {
      toast.error('Please log in to apply for jobs');
      navigate('/login');
      return;
    }

    if (!proposalText.trim()) {
      toast.error('Please write a proposal');
      return;
    }

    try {
      setApplying(true);
      
      const applicationData = {
        jobId,
        workerId: user.uid,
        proposalText: proposalText.trim(),
        status: 'pending'
      };
      
      // Add proposed price if provided
      if (proposedPrice && !isNaN(parseFloat(proposedPrice)) && parseFloat(proposedPrice) > 0) {
        applicationData.proposedPrice = parseFloat(proposedPrice);
        applicationData.negotiationStatus = 'pending';
      }
      
      const { data } = await axios.post(`${API_BASE}/api/applications`, applicationData);

      toast.success('Application submitted successfully!');
      setHasApplied(true);
      setProposalText('');
      setProposedPrice('');
      
      // Update current application
      if (data?.application) {
        setCurrentApplication(data.application);
      }
      
      // Refresh applicants list
      fetchApplicants(jobId);
    } catch (err) {
      console.error('Failed to apply:', err?.response?.data || err.message);
      toast.error(err?.response?.data?.error || 'Failed to submit application');
    } finally {
      setApplying(false);
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
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-600 dark:text-red-400 text-3xl"></i>
          </div>
          <h3 className="text-xl font-heading font-semibold text-base-content mb-2">
            Error Loading Job
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
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

  return (
    <div className="min-h-screen page-bg">
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
            <div className="flex space-x-3">
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
                <i className="fas fa-map-marker-alt w-5 h-5 mr-3 text-primary-500 flex-shrink-0"></i>
                <span className="break-words">{job.location || 'N/A'}</span>
              </span>
              <span className="flex items-center justify-center lg:justify-start text-lg">
                <i className="fas fa-calendar w-5 h-5 mr-3 text-primary-500"></i>
                {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <PageContainer>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Job Image Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
              {job.images && job.images.length > 0 ? (
                <div className="relative">
                  <img
                    src={job.images[0]}
                    alt={job.title || 'Job image'}
                    className="w-full h-64 lg:h-80 object-cover"
                  />
                  {job.images.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                      +{job.images.length - 1} more
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
              <h2 className="text-2xl font-heading font-bold text-base-content mb-4">Job Description</h2>
              <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
                <p className="text-base-content opacity-80 leading-relaxed">
                  {job.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Job Requirements */}
            {job.requirements && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl font-heading font-bold text-base-content mb-4">Requirements</h2>
                <ul className="prose prose-sm prose-gray dark:prose-invert max-w-none space-y-2 list-disc pl-6">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="text-base-content opacity-80 leading-relaxed">
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Job Images */}
            {job.images && job.images.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl font-heading font-bold text-base-content mb-4">
                  Additional Images
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {job.images.slice(1).map((image, index) => (
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

            {/* Location Map - Client's Location */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-0 overflow-hidden">
              <div className="flex items-center justify-between px-6 pt-6">
                <h2 className="text-2xl font-heading font-bold text-base-content">Client's Location</h2>
              </div>
              <div className="p-4">
                {(() => {
                  const jobLL = getJobLatLng(job);
                  const center = jobLL || workerLocation || [23.8103, 90.4125]; // Default to Dhaka if no coordinates
                  const distanceKm = jobLL && workerLocation ? getDistanceKm(workerLocation, jobLL) : null;
                  
                  if (!jobLL) {
                    // Show message if coordinates are missing
                    return (
                      <div className="w-full h-72 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <div className="text-center p-6">
                          <i className="fas fa-map-marked-alt text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
                          <p className="text-base-content opacity-70 mb-2">Location coordinates not available</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500">{job.location || 'Address not specified'}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      {distanceKm != null && (
                        <div className="mb-3">
                          <span className="px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                            {distanceKm} km away
                          </span>
                        </div>
                      )}
                      <div className="w-full h-72 rounded-xl overflow-hidden">
                        <MapContainer key={`job-details-map-${jobId}`} center={center} zoom={jobLL ? 13 : 10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url={isDarkMode ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                          />
                          <Marker position={jobLL} icon={JobIcon}>
                            <Popup>
                              <div className="text-sm">
                                <div className="font-semibold mb-1">{job.title || 'Job Location'}</div>
                                <div className="text-gray-600">{job.location || ''}</div>
                                {job.clientName && (
                                  <div className="text-gray-500 mt-1">Client: {job.clientName}</div>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                          {workerLocation && (
                            <Marker position={workerLocation} icon={WorkerIcon}>
                              <Popup>
                                <div className="text-sm">
                                  <div className="font-semibold">📍 Your Location</div>
                                  {distanceKm != null && (
                                    <div className="text-blue-600 mt-1">{distanceKm} km to job</div>
                                  )}
                                </div>
                              </Popup>
                            </Marker>
                          )}
                        </MapContainer>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobLL[0] + ',' + jobLL[1])}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                        >
                          <i className="fas fa-directions mr-2"></i>
                          Get Directions
                        </a>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Applicants Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-heading font-bold text-base-content">
                  Applicants
                </h2>
                <span className="text-gray-500 dark:text-gray-400 text-lg">
                  {applicants.length} total
                </span>
              </div>
              
              {applicantsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading applicants...</p>
                </div>
              ) : applicants.length > 0 ? (
                <div className="space-y-4">
                  {applicants.map((app) => (
                    <div key={app._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                              {(app.workerName || '?')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-base-content text-lg">{app.workerName || 'Unknown Worker'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {app.proposalText?.substring(0, 60)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {app.proposedPrice ? (
                            <div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Proposed:</span>
                              <p className="font-bold text-primary text-lg">৳{app.proposedPrice.toLocaleString()}</p>
                              {job.budget && (
                                <p className={`text-xs ${app.proposedPrice > job.budget ? 'text-red-500' : app.proposedPrice < job.budget ? 'text-green-500' : 'text-gray-500'}`}>
                                  {app.proposedPrice > job.budget ? '↑ Higher' : app.proposedPrice < job.budget ? '↓ Lower' : 'Same'}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs text-gray-400">No price</span>
                              <p className="text-sm text-gray-500">proposed</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className={`badge ${app.status === 'accepted' ? 'badge-success' : app.status === 'rejected' ? 'badge-error' : 'badge-warning'}`}>
                          {app.status || 'pending'}
                        </span>
                        <Link 
                          to={`/worker/${app.workerId}`}
                          className="text-primary hover:underline text-sm font-medium"
                        >
                          View Profile <i className="fas fa-arrow-right ml-1"></i>
                        </Link>
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
                  
                  <div className="py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start">
                      <i className="fas fa-map-marker-alt w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5"></i>
                      <div className="flex-1 min-w-0">
                        <div className="text-base-content opacity-70 text-sm mb-1">Location</div>
                        <div className="text-base-content font-medium break-words">
                          {job.location || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <i className="fas fa-calendar w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-base-content opacity-70">Posted</span>
                    </div>
                    <span className="text-base-content font-medium">
                      {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
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

            {/* Client Info Card - ALWAYS RENDER THIS SECTION */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-4 border-red-500 dark:border-gray-700 p-6 lg:p-8" style={{ minHeight: '200px' }}>
              <div className="bg-yellow-200 dark:bg-yellow-900 p-2 mb-4 rounded">
                <strong>🔴 DEBUG: Client Info Card Section - IF YOU SEE THIS, SECTION IS RENDERING</strong>
              </div>
              <h3 className="text-xl lg:text-2xl font-heading font-bold text-base-content mb-6">
                Job Owner
                {/* Visual test - remove after debugging */}
                <span className="ml-2 text-xs text-green-500">✓ RENDERING</span>
              </h3>
              {/* Force render test */}
              <div className="bg-green-200 dark:bg-green-900 p-2 mb-4 rounded">
                <strong>TEST: job exists = {job ? 'YES' : 'NO'}</strong>
                <br />
                <strong>TEST: clientProfile exists = {clientProfile ? 'YES' : 'NO'}</strong>
                <br />
                <strong>TEST: job.clientId = {job?.clientId || 'UNDEFINED'}</strong>
              </div>
              {/* #region agent log */}
              {(() => {
                const renderData = {
                  jobIsNull: !job,
                  clientProfileIsNull: !clientProfile,
                  jobClientId: job?.clientId,
                  jobClientName: job?.clientName,
                  jobPostedByName: job?.postedByName,
                  jobPostedByEmail: job?.postedByEmail,
                  jobClientEmail: job?.clientEmail,
                  jobEmail: job?.email,
                  jobLocation: job?.location,
                  clientProfileDisplayName: clientProfile?.displayName,
                  clientProfileStats: !!clientProfile?.stats,
                  clientProfileCity: clientProfile?.city,
                  clientProfileCountry: clientProfile?.country,
                  allJobKeys: job ? Object.keys(job) : []
                };
                debugLog('JobDetails.jsx:848', 'Rendering Client Info Card', renderData, 'D');
                console.log('🔍 [RENDER DEBUG] Client Info Card rendering with:', renderData);
                return null;
              })()}
              {/* #endregion */}
              
              {/* Client Header */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary-200 dark:ring-primary-800 bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900 dark:to-blue-900 flex items-center justify-center relative">
                  {(clientProfile?.profileCover || job?.clientAvatar) ? (
                    <img 
                      src={clientProfile?.profileCover || job?.clientAvatar} 
                      alt={clientProfile?.displayName || job?.clientName || 'Client'}
                      className="w-full h-full object-cover absolute inset-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <i className="fas fa-user text-primary-600 dark:text-primary-400 text-2xl relative z-10"></i>
                </div>
                <div className="flex-1">
                  {/* #region agent log */}
                  {(() => {
                    const displayName = clientProfile?.displayName || 
                                      job?.clientName || 
                                      job?.postedByName || 
                                      (job?.clientId ? `Client ${job.clientId.substring(0, 12)}...` : 'Unknown Client');
                    debugLog('JobDetails.jsx:1041', 'Rendering client name', {
                      displayName,
                      clientProfileDisplayName: clientProfile?.displayName,
                      jobClientName: job?.clientName,
                      jobPostedByName: job?.postedByName,
                      jobClientId: job?.clientId
                    }, 'D');
                    return null;
                  })()}
                  {/* #endregion */}
                  <div className="bg-blue-100 dark:bg-blue-900 p-2 mb-2 rounded text-xs">
                    <strong>DEBUG Name Logic:</strong>
                    <br />clientProfile?.displayName = {clientProfile?.displayName || 'NULL'}
                    <br />job?.clientName = {job?.clientName || 'NULL'}
                    <br />job?.postedByName = {job?.postedByName || 'NULL'}
                    <br />job?.clientId = {job?.clientId || 'NULL'}
                    <br />
                    <strong>Final displayName:</strong> {clientProfile?.displayName || job?.clientName || job?.postedByName || `Client ${job?.clientId?.substring(0, 8) || 'Unknown'}`}
                    <br />
                    <strong>clientProfile object:</strong> {clientProfile ? JSON.stringify(clientProfile).substring(0, 150) : 'NULL - NOT SET!'}
                  </div>
                  <p className="font-bold text-base-content text-lg">
                    {clientProfile?.displayName || 
                     job?.clientName || 
                     job?.postedByName || 
                     (job?.clientId ? `Client ${job.clientId.substring(0, 12)}...` : 'Unknown Client')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {clientProfile?.headline || (clientProfile?.displayName?.includes('Loading') ? 'Fetching profile...' : 'Job Poster')}
                  </p>
                  {/* Trust Badges */}
                  {clientProfile && clientProfile.emailVerified !== undefined && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {clientProfile.emailVerified ? (
                        <span className="badge badge-success badge-sm gap-1">
                          <i className="fas fa-check-circle"></i>Email Verified
                        </span>
                      ) : (
                        <span className="badge badge-warning badge-sm gap-1">
                          <i className="fas fa-exclamation-circle"></i>Email Not Verified
                        </span>
                      )}
                      {clientProfile.phoneVerified && (
                        <span className="badge badge-success badge-sm gap-1">
                          <i className="fas fa-phone"></i>Phone Verified
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Client Stats */}
              {clientProfile?.stats && (
                <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{clientProfile.stats.totalJobsPosted || 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Jobs Posted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{clientProfile.stats.clientJobsCompleted || 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{clientProfile.stats.clientHireRate ?? 0}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hire Rate</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-xl font-bold ${(clientProfile.stats.clientCancellationRate ?? 0) > 20 ? 'text-red-600' : 'text-gray-600'}`}>
                      {clientProfile.stats.clientCancellationRate ?? 0}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cancel Rate</p>
                  </div>
                </div>
              )}
              
              {/* Client Details */}
              <div className="space-y-3">
                {/* Email - Always show if available */}
                {(() => {
                  const emailToShow = clientProfile?.email || job?.clientEmail || job?.postedByEmail || job?.email || null;
                  // #region agent log
                  debugLog('JobDetails.jsx:1084', 'Rendering email field', {
                    clientProfileEmail: clientProfile?.email,
                    clientEmail: job?.clientEmail,
                    postedByEmail: job?.postedByEmail,
                    email: job?.email,
                    finalEmail: emailToShow
                  }, 'D');
                  // #endregion
                  return (
                    <div className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700">
                      <i className="fas fa-envelope w-5 h-5 mr-3 text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-300 text-sm">
                        {emailToShow || 'Email not available'}
                      </span>
                    </div>
                  );
                })()}
                
                {/* Location - Always show */}
                {(clientProfile?.city || clientProfile?.country || job.location) ? (
                  <div className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <i className="fas fa-map-marker-alt w-5 h-5 mr-3 text-gray-400"></i>
                    <span className="text-gray-600 dark:text-gray-300 text-sm">
                      {clientProfile?.city || clientProfile?.country 
                        ? [clientProfile.city, clientProfile.country].filter(Boolean).join(', ')
                        : job.location || 'Location not set'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <i className="fas fa-map-marker-alt w-5 h-5 mr-3 text-gray-400"></i>
                    <span className="text-gray-600 dark:text-gray-300 text-sm">Location not set</span>
                  </div>
                )}
                
                {/* Member Since */}
                {clientProfile?.createdAt && (
                  <div className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <i className="fas fa-calendar w-5 h-5 mr-3 text-gray-400"></i>
                    <span className="text-gray-600 dark:text-gray-300 text-sm">
                      Member since {new Date(clientProfile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                    </span>
                  </div>
                )}
                
                {/* Last Active */}
                {clientProfile?.lastActiveAt && (
                  <div className="flex items-center py-2 border-b border-gray-100 dark:border-gray-700">
                    <i className="fas fa-clock w-5 h-5 mr-3 text-gray-400"></i>
                    <span className="text-gray-600 dark:text-gray-300 text-sm">
                      Last active {new Date(clientProfile.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                
                {/* Client ID - Always show if available */}
                {(() => {
                  // #region agent log
                  debugLog('JobDetails.jsx:850', 'Rendering client ID', {
                    hasClientId: !!job?.clientId,
                    clientId: job?.clientId,
                    jobIsNull: !job
                  }, 'D');
                  // #endregion
                  return job?.clientId ? (
                    <div className="flex items-center py-2">
                      <i className="fas fa-id-card w-5 h-5 mr-3 text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-300 text-xs font-mono break-all">
                        {job.clientId}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center py-2">
                      <i className="fas fa-id-card w-5 h-5 mr-3 text-gray-400"></i>
                      <span className="text-gray-600 dark:text-gray-300 text-xs">N/A</span>
                    </div>
                  );
                })()}
              </div>
              
              {/* View Profile Button */}
              {(() => {
                // #region agent log
                debugLog('JobDetails.jsx:1040', 'Rendering View Profile button', {
                  hasClientId: !!job?.clientId,
                  clientId: job?.clientId,
                  jobIsNull: !job
                }, 'D');
                // #endregion
                return job?.clientId ? (
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/client/${job.clientId}`)}
                      className="btn btn-primary btn-sm w-full"
                    >
                      <i className="fas fa-user mr-2"></i>View Client Profile
                    </button>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Application Form */}
            {!hasApplied ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h3 className="text-xl lg:text-2xl font-heading font-bold text-base-content mb-6">
                  Apply for this Job
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-base-content opacity-80 mb-3">
                      Your Proposal
                    </label>
                    <textarea
                      value={proposalText}
                      onChange={(e) => setProposalText(e.target.value)}
                      placeholder="Write your proposal here... Explain why you're the best fit for this job."
                      className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-lg"
                      rows={5}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Minimum 50 characters required
                    </p>
                  </div>
                  
                  {/* Price Bargaining Section */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                    <label className="block text-sm font-medium text-base-content opacity-80 mb-2">
                      <i className="fas fa-money-bill-wave mr-2"></i>
                      Proposed Price (Optional)
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-600 dark:text-gray-300 font-medium">৳</span>
                      <input
                        type="number"
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        placeholder={job.budget ? job.budget.toString() : 'Enter your price'}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                        min="0"
                        step="100"
                      />
                    </div>
                    {job.budget && (
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          Job budget: <span className="font-semibold">৳{job.budget.toLocaleString()}</span>
                        </span>
                        {proposedPrice && !isNaN(parseFloat(proposedPrice)) && (
                          <span className={`font-semibold ${
                            parseFloat(proposedPrice) > job.budget 
                              ? 'text-red-500' 
                              : parseFloat(proposedPrice) < job.budget 
                              ? 'text-green-500' 
                              : 'text-gray-500'
                          }`}>
                            {parseFloat(proposedPrice) > job.budget 
                              ? `+৳${(parseFloat(proposedPrice) - job.budget).toLocaleString()} higher`
                              : parseFloat(proposedPrice) < job.budget
                              ? `-৳${(job.budget - parseFloat(proposedPrice)).toLocaleString()} lower`
                              : 'Same as budget'}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Leave empty to accept the job budget. You can negotiate the price after applying.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleApply}
                    disabled={applying || !proposalText.trim() || proposalText.trim().length < 50}
                    className="w-full bg-gradient-to-r from-primary-500 to-blue-500 hover:from-primary-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                  >
                    {applying ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Applying...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <i className="fas fa-paper-plane mr-2"></i>
                        Submit Application
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800 p-6 lg:p-8">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-check-circle text-primary text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold text-primary">
                      Application Submitted
                    </h3>
                    <p className="text-primary opacity-80 text-sm">
                      Your application has been submitted successfully.
                    </p>
                  </div>
                </div>
                {currentApplication?.proposedPrice && (
                  <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      Your proposed price:
                    </p>
                    <p className="text-xl font-bold text-primary">
                      ৳{currentApplication.proposedPrice.toLocaleString()}
                    </p>
                    {currentApplication.negotiationStatus === 'countered' && currentApplication.counterPrice && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                          <i className="fas fa-handshake mr-2"></i>
                          Client counter-offered: ৳{currentApplication.counterPrice.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {currentApplication.negotiationStatus === 'accepted' && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                          <i className="fas fa-check-circle mr-2"></i>
                          Price accepted!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
};

export default JobDetails;