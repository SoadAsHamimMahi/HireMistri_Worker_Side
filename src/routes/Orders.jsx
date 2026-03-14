import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const Orders = () => {
  const { user } = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active'); // Default to active orders
  const [updating, setUpdating] = useState({}); // per-order loading state
  const [workerLocation, setWorkerLocation] = useState(null);
  const [jobDetailsMap, setJobDetailsMap] = useState({}); // jobId -> job details with coordinates
  const [expandedOrderId, setExpandedOrderId] = useState(null); // For showing/hiding map

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.uid) {
        setLoading(false);
        setOrders([]);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Fetch all applications for the worker
        const { data } = await axios.get(`${API_BASE}/api/my-applications/${user.uid}`, {
          headers: { Accept: 'application/json' },
        });

        // Filter for accepted and completed applications (these become orders).
        // Exclude "accepted but price pending": if worker proposed a different budget, only count as order once client has accepted it.
        const acceptedApplications = Array.isArray(data) ? data.filter(app => {
          const status = app.status ? app.status.toLowerCase() : '';
          if (status !== 'accepted' && status !== 'completed') return false;
          const hasProposedPrice = app.proposedPrice != null && app.proposedPrice !== '';
          const priceAgreed = app.negotiationStatus === 'accepted' || (app.finalPrice != null && app.finalPrice !== '');
          if (hasProposedPrice && !priceAgreed) return false; // don't show in My Jobs until client accepts price
          return true;
        }) : [];

        // Transform applications to order format
        const transformedOrders = acceptedApplications.map((app, index) => ({
          id: app._id,
          jobId: app.jobId,
          jobTitle: app.title || 'Untitled Job',
          clientName: app.clientName || 'Client', // This might need to be fetched separately
          clientId: app.clientId || null, // Add clientId for profile navigation
          clientAvatar: `https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face&ixid=${index}`, // Placeholder avatar
          category: app.category || 'General',
          status: app.status && app.status.toLowerCase() === 'completed' ? 'completed' : 'active', // Preserve completed status, others are active
          budget: typeof app.budget === 'number' ? app.budget : parseInt(app.budget) || 0,
          location: app.location || 'N/A',
          startDate: app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          endDate: app.createdAt ? new Date(new Date(app.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: app.proposalText || 'No description provided.',
          priority: 'medium', // Default priority
          estimatedHours: 4, // Default estimated hours
          progress: 0, // Default progress for new orders
          createdAt: app.createdAt || new Date().toISOString(),
          proposalText: app.proposalText
        }));

        setOrders(transformedOrders);

        // Fetch job details for each order to get coordinates
        const jobDetailsPromises = transformedOrders.map(async (order) => {
          try {
            const { data: jobData } = await axios.get(`${API_BASE}/api/jobs/${order.jobId}`, {
              headers: { Accept: 'application/json' },
            });
            return { jobId: order.jobId, jobData };
          } catch (err) {
            console.warn(`Failed to load job details for ${order.jobId}:`, err);
            return { jobId: order.jobId, jobData: null };
          }
        });

        const jobDetailsResults = await Promise.all(jobDetailsPromises);
        const detailsMap = {};
        jobDetailsResults.forEach(({ jobId, jobData }) => {
          if (jobData) detailsMap[jobId] = jobData;
        });
        setJobDetailsMap(detailsMap);
      } catch (err) {
        console.error('Failed to load orders:', err?.response?.data || err.message);
        setError('Failed to load orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    // expose refresher on window for internal reuse (lightweight, local only)
    // eslint-disable-next-line no-unused-vars
    window.__refreshOrders = fetchOrders;

    fetchOrders();
  }, [user?.uid]);

  // Get worker geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkerLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Optional: Watch position for real-time updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setWorkerLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'badge-success';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-base-300 text-base-content';
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

  // Extract job coordinates helper
  const getJobLatLng = (job) => {
    if (!job) return null;
    const lat = job.lat ?? job.latitude ?? job?.locationLat ?? job?.location?.lat ?? job?.coordinates?.lat;
    const lng = job.lng ?? job.longitude ?? job?.locationLng ?? job?.location?.lng ?? job?.coordinates?.lng;
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
    return null;
  };

  // Haversine distance calculation in km
  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  // Custom icons for map
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

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const activeOrders = orders.filter(order => order.status === 'active');

  // Change status helper (PATCH /api/applications/:id)
  const handleChangeStatus = async (orderId, nextStatus) => {
    const target = orders.find(o => o.id === orderId);
    if (!target || updating[orderId]) return;

    try {
      setUpdating(prev => ({ ...prev, [orderId]: true }));

      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: nextStatus === 'completed' ? order.status : nextStatus,
              progress: nextStatus === 'completed' ? order.progress : order.progress
            }
          : order
      ));

      const { data } = await axios.patch(
        `${API_BASE}/api/applications/${orderId}`,
        {
          status: nextStatus,
          ...(nextStatus === 'completed' ? { actorRole: 'worker' } : {})
        },
        {
        headers: { 'Content-Type': 'application/json' },
        }
      );

      if (data && typeof data === 'object') {
        setOrders(prev => prev.map(order =>
          order.id === orderId
            ? { ...order, status: data.status || nextStatus }
            : order
        ));
      }

      if (typeof window.__refreshOrders === 'function') {
        try {
          await window.__refreshOrders();
        } catch (refreshErr) {
          console.warn('Order refresh failed after status update:', refreshErr);
        }
      }

      const effectiveStatus = (data?.status || nextStatus || '').toLowerCase();
      toast.success(
        nextStatus === 'completed'
          ? (effectiveStatus === 'completed'
              ? 'Job completed by both sides.'
              : 'Completion sent. Waiting for client confirmation.')
          : nextStatus === 'active'
            ? 'Order set to active.'
            : nextStatus === 'cancelled'
              ? 'Order cancelled.'
              : 'Order status updated.'
      );
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update order status.';
      console.error('Failed to update order status:', msg);

      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, status: target.status, progress: target.progress }
          : order
      ));
      toast.error(msg);
    } finally {
      setUpdating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Handle marking order as complete
  const handleMarkComplete = async (orderId) => {
    await handleChangeStatus(orderId, 'completed');
  };

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-base-content opacity-80">Loading orders...</p>
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
            Error Loading Orders
          </h3>
          <p className="text-base-content opacity-80 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20">
      <Toaster position="top-right" />
      
      {/* Search & Top Bar */}
      <div className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1ec86d] rounded-lg flex items-center justify-center">
              <i className="fas fa-tools text-black text-sm"></i>
            </div>
            <span className="text-xl font-bold tracking-tight">Hire Mistri</span>
          </div>

          <div className="flex-1 max-w-2xl relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm"></i>
            <input 
              type="text" 
              placeholder="Search orders, clients, or jobs..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#1ec86d]/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center relative hover:bg-white/10 transition-colors">
              <i className="far fa-bell text-white/60"></i>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#050505]"></span>
            </button>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <i className="far fa-cog text-white/60"></i>
            </button>
            <img 
              src={user?.photoURL || '/default-profile.png'} 
              alt="Profile" 
              className="w-10 h-10 rounded-full border border-white/10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-10">
        {/* Hero + Stats - Single div with black to green gradient */}
        <div className="bg-gradient-to-r from-[#050505] via-[#0a1a0a] to-[#1ec86d]/30 -mx-6 px-6 py-10 rounded-2xl mb-12">
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h1 className="text-5xl font-bold mb-3 tracking-tight">My Orders</h1>
              <p className="text-white/50 text-lg">
                You have <span className="text-[#1ec86d] font-semibold">{activeOrders.length} active</span> service requests today.
              </p>
            </div>
            <button className="bg-[#1ec86d] hover:bg-[#19b360] text-black font-bold px-6 py-3.5 rounded-2xl flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(30,200,109,0.3)] hover:shadow-[0_0_25px_rgba(30,200,109,0.5)] transform hover:-translate-y-0.5">
              <i className="fas fa-wallet"></i>
              Withdraw Earnings
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Orders', value: orders.length, trend: '+12%', color: 'white' },
            { label: 'Active', value: activeOrders.length, trend: null, color: '#1ec86d' },
            { label: 'Completed', value: orders.filter(o => o.status === 'completed').length, trend: null, color: 'white' },
            { label: 'Total Earnings', value: `৳${orders.reduce((sum, order) => sum + order.budget, 0).toLocaleString()}`, trend: null, color: 'white' }
          ].map((stat, i) => (
            <div key={i} className={`bg-[#0f1c23] border ${stat.color === '#1ec86d' ? 'border-[#1ec86d]/50 shadow-[inset_0_0_20px_rgba(30,200,109,0.05)]' : 'border-white/10'} rounded-3xl p-8 relative overflow-hidden group hover:bg-[#152530] transition-all`}>
              {stat.color === '#1ec86d' && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-[#1ec86d] rounded-r-full shadow-[0_0_15px_rgba(30,200,109,0.8)]"></div>
              )}
              <div className="flex justify-between items-start mb-4">
                <span className="text-white/40 font-medium tracking-wide text-sm">{stat.label}</span>
                {stat.trend && (
                  <span className="bg-[#1ec86d]/10 text-[#1ec86d] text-[10px] font-bold px-2 py-1 rounded-full">{stat.trend}</span>
                )}
              </div>
              <div className="text-4xl font-bold tracking-tighter" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-8 mb-10 border-b border-white/5">
          {[
            { key: 'all', label: 'All Orders' },
            { key: 'active', label: `Active (${activeOrders.length})` },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`pb-4 px-1 text-sm font-semibold tracking-wide transition-all relative ${
                filter === tab.key ? 'text-[#1ec86d]' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {tab.label}
              {filter === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1ec86d] rounded-t-full shadow-[0_-2px_10px_rgba(30,200,109,0.5)]"></div>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredOrders.length === 0 ? (
            <div className="col-span-full py-20 bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <i className="far fa-clipboard-list text-3xl text-white/20"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">No orders found</h3>
              <p className="text-white/40 max-w-md mx-auto mb-8">
                {filter === 'all' 
                  ? "You don't have any accepted job applications yet." 
                  : `No ${filter} orders found in your records.`
                }
              </p>
              <Link to="/jobs" className="bg-white/10 hover:bg-white/15 px-8 py-3 rounded-xl font-bold transition-all">
                Browse Available Jobs
              </Link>
            </div>
          ) : (
            filteredOrders.map((order, index) => (
              <div 
                key={order.id} 
                className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.05] transition-all group animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                      order.status === 'completed' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-[#1ec86d]/20 text-[#1ec86d]'
                    }`}>
                      {order.status}
                    </span>
                    {order.priority === 'high' && (
                      <span className="bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
                        High Priority
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-1">
                      {order.status === 'completed' ? 'Paid' : 'Est. Earnings'}
                    </span>
                    <span className="text-2xl font-bold text-[#1ec86d]">৳{order.budget.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-1 group-hover:text-[#1ec86d] transition-colors">{order.jobTitle}</h3>
                  <p className="text-white/30 text-xs font-semibold tracking-widest uppercase">
                    Job ID: #{order.id.slice(-6).toUpperCase()} • {order.category}
                  </p>
                </div>

                {/* Client Profile Row */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={order.clientAvatar} alt="" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-4 border-[#090909] flex items-center justify-center">
                        <i className="fas fa-check text-[6px] text-white"></i>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {order.clientName}
                        <i className="fas fa-info-circle text-white/20 text-xs"></i>
                      </div>
                      <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider flex items-center gap-2">
                        <span>Premium Member</span>
                        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                        <span className="flex items-center gap-1 text-yellow-500/80">
                          <i className="fas fa-star text-[8px]"></i>
                          4.9
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/client/${order.clientId}`} className="text-[#1ec86d] text-xs font-bold hover:underline">View Profile</Link>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-3 gap-6 mb-10 pt-6 border-t border-white/5">
                  <div>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Start Date</span>
                    <span className="text-sm font-bold">{new Date(order.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">{order.status === 'completed' ? 'End Date' : 'Deadline'}</span>
                    <span className="text-sm font-bold">{new Date(order.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block mb-2">Hours</span>
                    <span className="text-sm font-bold">~{order.estimatedHours} Hours</span>
                  </div>
                </div>

                {/* Navigation/Map Expanded */}
                {expandedOrderId === order.id && (() => {
                  const jobDetails = jobDetailsMap[order.jobId];
                  const jobCoords = jobDetails ? getJobLatLng(jobDetails) : null;
                  if (!jobCoords) return null;

                  const distance = workerLocation
                    ? getDistanceKm(workerLocation[0], workerLocation[1], jobCoords[0], jobCoords[1])
                    : null;
                  
                  const mapCenter = workerLocation
                    ? [(workerLocation[0] + jobCoords[0]) / 2, (workerLocation[1] + jobCoords[1]) / 2]
                    : jobCoords;

                  return (
                    <div className="mb-8 rounded-2xl border border-white/5 overflow-hidden animate-slide-down">
                      <div className="h-64 relative bg-black">
                        <MapContainer
                          key={`map-order-${order.id}`}
                          center={mapCenter}
                          zoom={13}
                          scrollWheelZoom={false}
                          className="h-full w-full"
                          style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)' }}
                        >
                          <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <Marker position={jobCoords} icon={JobIcon}>
                            <Popup>
                              <div className="text-sm p-1">
                                <div className="font-bold">{order.jobTitle}</div>
                                <div className="text-black/60">{order.location}</div>
                              </div>
                            </Popup>
                          </Marker>
                          {workerLocation && (
                            <Marker position={workerLocation} icon={WorkerIcon}>
                              <Popup>
                                <div className="text-sm p-1">
                                  <div className="font-bold">📍 Your Location</div>
                                  {distance !== null && (
                                    <div className="text-[#1ec86d] font-bold mt-1">{distance} km to job</div>
                                  )}
                                </div>
                              </Popup>
                            </Marker>
                          )}
                        </MapContainer>
                        <div className="absolute bottom-4 left-4 z-[1000] bg-[#050505] border border-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
                          {distance !== null ? `${distance} km away` : 'Calculating distance...'}
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 flex gap-3">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobCoords[0] + ',' + jobCoords[1])}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-all text-center text-sm flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-directions"></i> Get Directions
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {order.status === 'active' ? (
                    <>
                      <button 
                        onClick={() => handleMarkComplete(order.id)}
                        disabled={updating[order.id]}
                        className="flex-1 bg-[#1ec86d] hover:bg-[#19b360] text-black font-extrabold py-4 rounded-xl transition-all disabled:opacity-50"
                      >
                        {updating[order.id] ? (<i className="fas fa-spinner fa-spin"></i>) : 'Mark Complete'}
                      </button>
                      <Link 
                        to={`/jobs/${order.jobId}`}
                        className="flex-1 bg-white/10 hover:bg-white/15 text-white font-extrabold py-4 rounded-xl transition-all text-center"
                      >
                        Details
                      </Link>
                      <button className="w-14 h-14 bg-white/10 hover:bg-white/15 rounded-xl flex items-center justify-center transition-all">
                        <i className="far fa-comment-dots text-lg"></i>
                      </button>
                      <button 
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        className={`w-14 h-14 ${expandedOrderId === order.id ? 'bg-[#1ec86d] text-black' : 'bg-white/10 hover:bg-white/15 text-white'} rounded-xl flex items-center justify-center transition-all`}
                      >
                        <i className="far fa-paper-plane text-lg"></i>
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="flex-1 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-extrabold py-4 rounded-xl transition-all flex items-center justify-center gap-2">
                        <i className="fas fa-download text-sm"></i>
                        Download Invoice
                      </button>
                      <button className="flex-1 bg-white/10 hover:bg-white/15 text-white font-extrabold py-4 rounded-xl transition-all text-center">
                        View Summary
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Pagination/Footer Placeholder */}
        <div className="mt-16 flex flex-col items-center">
           <div className="h-[200px] w-full bg-white/[0.02] rounded-[40px] border border-dashed border-white/5 flex items-center justify-center">
              <span className="text-white/10 font-black uppercase tracking-[1em] text-sm">Hire Mistri Ecosystem</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
