import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

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
  const [hasApplied, setHasApplied] = useState(false);
  const [workerLocation, setWorkerLocation] = useState(null); // { lat, lng }

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
    const fetchJobDetails = async () => {
      if (!jobId) {
        setError('No job ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Fetch job details
        const { data: jobData } = await axios.get(`${API_BASE}/api/jobs/${jobId}`, {
          headers: { Accept: 'application/json' },
        });

        // Check if user has already applied
        if (user?.uid) {
          try {
            const { data: applications } = await axios.get(`${API_BASE}/api/my-applications/${user.uid}`, {
              headers: { Accept: 'application/json' },
            });
            
            const hasUserApplied = applications.some(app => app.jobId === jobId);
            setHasApplied(hasUserApplied);
          } catch (err) {
            console.log('Could not check application status');
          }
        }

        setJob(jobData);
        
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
  }, [jobId, user?.uid]);

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
      
      await axios.post(`${API_BASE}/api/applications`, {
        jobId,
        workerId: user.uid,
        proposalText: proposalText.trim(),
        status: 'pending'
      });

      toast.success('Application submitted successfully!');
      setHasApplied(true);
      setProposalText('');
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
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
              <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content mb-6">
                Job Description
              </h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-base-content opacity-80 leading-relaxed text-lg">
                  {job.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Job Requirements */}
            {job.requirements && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content mb-6">
                  Requirements
                </h2>
                <ul className="space-y-4">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mr-4 mt-1">
                        <i className="fas fa-check text-primary-600 dark:text-primary-400 text-sm"></i>
                      </div>
                      <span className="text-base-content opacity-80 text-lg">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Job Images */}
            {job.images && job.images.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content mb-6">
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
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content">Client's Location</h2>
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
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-base-content">
                  Applicants
                </h2>
                <span className="text-gray-500 dark:text-gray-400 text-lg">
                  0 total
                </span>
              </div>
              <div className="text-center py-12">
                <i className="fas fa-users text-6xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No applicants yet</p>
              </div>
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
                    {job.clientName || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Job Poster</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center py-3 border-b border-gray-100 dark:border-gray-700">
                  <i className="fas fa-envelope w-5 h-5 mr-3 text-gray-400"></i>
                  <span className="text-gray-600 dark:text-gray-300 text-sm">
                    {job.clientEmail || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center py-3">
                  <i className="fas fa-id-card w-5 h-5 mr-3 text-gray-400"></i>
                  <span className="text-gray-600 dark:text-gray-300 text-sm font-mono">
                    {job.clientId || 'N/A'}
                  </span>
                </div>
                {job.clientId && (
                  <div className="pt-3">
                    <button
                      onClick={() => navigate(`/client/${job.clientId}`)}
                      className="btn btn-primary btn-sm w-full"
                    >
                      <i className="fas fa-user mr-2"></i>View Client Profile
                    </button>
                  </div>
                )}
              </div>
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
                <div className="flex items-center">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;