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

        // Filter for accepted and completed applications (these become orders)
        // Accepted = active orders, Completed = completed orders
        const acceptedApplications = Array.isArray(data) ? data.filter(app => {
          const status = app.status ? app.status.toLowerCase() : '';
          return status === 'accepted' || status === 'completed';
        }) : [];

        // Transform applications to order format
        const transformedOrders = acceptedApplications.map((app, index) => ({
          id: app._id,
          jobId: app.jobId,
          jobTitle: app.title || 'Untitled Job',
          clientName: app.clientName || 'Client', // This might need to be fetched separately
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
          ? { ...order, status: nextStatus, progress: nextStatus === 'completed' ? 100 : order.progress }
          : order
      ));

      const { data } = await axios.patch(`${API_BASE}/api/applications/${orderId}`, { status: nextStatus }, {
        headers: { 'Content-Type': 'application/json' },
      });

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

      toast.success(
        nextStatus === 'completed' ? 'Order marked as completed.' :
        nextStatus === 'active' ? 'Order set to active.' :
        nextStatus === 'cancelled' ? 'Order cancelled.' : 'Order status updated.'
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading orders...</p>
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
            Error Loading Orders
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      {/* Header Section - Mobile Optimized */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-base-content mb-3 lg:mb-4">
              My Orders
            </h1>
            <p className="text-base lg:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto px-4">
              Manage your accepted job applications and track your work progress
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-2 lg:mb-0">
                <p className="text-xs lg:text-sm font-medium text-base-content opacity-70">Total Orders</p>
                <p className="text-xl lg:text-3xl font-heading font-bold text-base-content">{orders.length}</p>
              </div>
              <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900 rounded-full self-start lg:self-auto">
                <i className="fas fa-clipboard-list text-blue-600 dark:text-blue-400 text-lg lg:text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-2 lg:mb-0">
                <p className="text-xs lg:text-sm font-medium text-base-content opacity-70">Active Orders</p>
                <p className="text-xl lg:text-3xl font-heading font-bold text-primary-600 dark:text-primary-400">{activeOrders.length}</p>
              </div>
              <div className="p-2 lg:p-3 bg-primary-100 dark:bg-primary-900 rounded-full self-start lg:self-auto">
                <i className="fas fa-tools text-primary-600 dark:text-primary-400 text-lg lg:text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-2 lg:mb-0">
                <p className="text-xs lg:text-sm font-medium text-base-content opacity-70">Completed</p>
                <p className="text-xl lg:text-3xl font-heading font-bold text-primary">
                  {orders.filter(o => o.status === 'completed').length}
                </p>
              </div>
              <div className="p-2 lg:p-3 bg-primary/20 rounded-full self-start lg:self-auto">
                <i className="fas fa-check-circle text-primary text-lg lg:text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-2 lg:mb-0">
                <p className="text-xs lg:text-sm font-medium text-base-content opacity-70">Total Earnings</p>
                <p className="text-lg lg:text-3xl font-heading font-bold text-base-content">
                  ৳{orders.reduce((sum, order) => sum + order.budget, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 lg:p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full self-start lg:self-auto">
                <i className="fas fa-money-bill-wave text-yellow-600 dark:text-yellow-400 text-lg lg:text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 mb-6 lg:mb-8">
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-2 lg:flex lg:flex-wrap gap-2 lg:gap-2">
              {[
                { key: 'all', label: 'All Orders', count: orders.length },
                { key: 'active', label: 'Active', count: activeOrders.length },
                { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
                { key: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 lg:px-6 py-2 lg:py-3 rounded-lg lg:rounded-xl font-medium transition-all duration-200 text-sm lg:text-base ${
                    filter === key
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="block lg:inline">{label}</span>
                  <span className="block lg:inline lg:ml-1">({count})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Orders List - Mobile Optimized */}
        <div className="space-y-4 lg:space-y-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 lg:py-12">
              <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-clipboard-list text-gray-400 text-2xl lg:text-3xl"></i>
              </div>
              <h3 className="text-lg lg:text-xl font-heading font-semibold text-base-content mb-2">
                No orders found
              </h3>
              <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-6 px-4">
                {filter === 'all' 
                  ? "You don't have any accepted job applications yet. Once your applications are accepted by clients, they will appear here as orders." 
                  : `No ${filter} orders found.`
                }
              </p>
              <Link 
                to="/jobs" 
                className="inline-flex items-center px-4 lg:px-6 py-2 lg:py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base"
              >
                <i className="fas fa-search mr-2"></i>
                Browse Available Jobs
              </Link>
            </div>
          ) : (
            filteredOrders.map((order, index) => (
              <div 
                key={order.id} 
                className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-4 lg:p-6">
                  <div className="flex flex-col gap-4 lg:gap-6">
                    {/* Order Header - Mobile Optimized */}
                    <div className="flex-1">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg lg:text-xl font-heading font-bold text-base-content mb-2">
                            {order.jobTitle}
                          </h3>
                          <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-2 lg:space-y-0 text-sm text-gray-600 dark:text-gray-300">
                            <span className="flex items-center">
                              <i className="fas fa-tag w-4 h-4 mr-2 text-primary-500 flex-shrink-0"></i>
                              <span className="truncate">{order.category}</span>
                            </span>
                            <span className="flex items-center">
                              <i className="fas fa-map-marker-alt w-4 h-4 mr-2 text-primary-500 flex-shrink-0"></i>
                              <span className="truncate">{order.location}</span>
                            </span>
                            <span className="flex items-center">
                              <i className="fas fa-calendar w-4 h-4 mr-2 text-primary-500 flex-shrink-0"></i>
                              <span>{new Date(order.startDate).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col lg:text-right">
                          <div className="text-xl lg:text-2xl font-heading font-bold text-primary-600 dark:text-primary-400 mb-2">
                            ৳{order.budget.toLocaleString()}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                            <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                              {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)} Priority
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Client Info - Mobile Optimized */}
                      <div className="flex items-center space-x-3 lg:space-x-4 mb-4">
                        <img 
                          src={order.clientAvatar} 
                          alt={order.clientName}
                          className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-base-content truncate">{order.clientName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">Client</p>
                        </div>
                      </div>

                      <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                        {order.proposalText || order.description || 'No description provided.'}
                      </p>

                      {/* Progress Bar for Active Orders */}
                      {order.status === 'active' && (
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-base-content opacity-80">Progress</span>
                            <span className="text-sm text-base-content opacity-70">{order.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${order.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Navigation Map for Active Orders */}
                      {order.status === 'active' && (() => {
                        const jobDetails = jobDetailsMap[order.jobId];
                        const jobCoords = jobDetails ? getJobLatLng(jobDetails) : null;
                        if (!jobCoords) return null;

                        const distance = workerLocation
                          ? getDistanceKm(workerLocation[0], workerLocation[1], jobCoords[0], jobCoords[1])
                          : null;
                        
                        const mapCenter = workerLocation
                          ? [
                              (workerLocation[0] + jobCoords[0]) / 2,
                              (workerLocation[1] + jobCoords[1]) / 2
                            ]
                          : jobCoords;

                        return (
                          <div className="mb-4">
                            <button
                              onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                              className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            >
                              <div className="flex items-center">
                                <i className="fas fa-map-marked-alt text-blue-600 dark:text-blue-400 mr-2"></i>
                                <span className="text-sm font-medium text-base-content opacity-80">
                                  Navigation Map
                                </span>
                                {distance !== null && (
                                  <span className="ml-3 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                                    {distance} km away
                                  </span>
                                )}
                              </div>
                              <i className={`fas fa-chevron-${expandedOrderId === order.id ? 'up' : 'down'} text-blue-600 dark:text-blue-400`}></i>
                            </button>
                            
                            {expandedOrderId === order.id && (
                              <div key={`order-map-${order.id}`} className="mt-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="h-64 w-full relative">
                                  <MapContainer
                                    key={`map-order-${order.id}`}
                                    center={mapCenter}
                                    zoom={13}
                                    scrollWheelZoom={false}
                                    className="h-full w-full"
                                  >
                                    <TileLayer
                                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                      url={isDarkMode ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                                    />
                                    <Marker position={jobCoords} icon={JobIcon}>
                                      <Popup>
                                        <div className="text-sm">
                                          <div className="font-semibold mb-1">{order.jobTitle}</div>
                                          <div className="text-gray-600">{order.location}</div>
                                        </div>
                                      </Popup>
                                    </Marker>
                                    {workerLocation && (
                                      <Marker position={workerLocation} icon={WorkerIcon}>
                                        <Popup>
                                          <div className="text-sm">
                                            <div className="font-semibold">📍 Your Location</div>
                                            {distance !== null && (
                                              <div className="text-blue-600 mt-1">{distance} km to job</div>
                                            )}
                                          </div>
                                        </Popup>
                                      </Marker>
                                    )}
                                  </MapContainer>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobCoords[0] + ',' + jobCoords[1])}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm"
                                  >
                                    <i className="fas fa-directions mr-2"></i>
                                    Get Directions
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Order Details - Mobile Optimized */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-xs lg:text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                          <p className="font-medium text-base-content text-xs lg:text-sm">
                            {new Date(order.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                          <p className="font-medium text-base-content text-xs lg:text-sm">
                            {new Date(order.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Est. Hours</p>
                          <p className="font-medium text-base-content text-xs lg:text-sm">{order.estimatedHours}h</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Order ID</p>
                          <p className="font-medium text-base-content text-xs lg:text-sm truncate">{order.id}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Mobile Optimized */}
                    <div className="flex flex-col lg:flex-col space-y-2 lg:space-y-3 lg:w-48">
                      <Link 
                        to={`/jobs/${order.jobId}`}
                        className="w-full bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-center text-sm lg:text-base"
                      >
                        <i className="fas fa-eye mr-2"></i>
                        View Job Details
                      </Link>
                      
                      {order.status === 'active' && (
                        <>
                          <button 
                            onClick={() => handleMarkComplete(order.id)}
                            disabled={Boolean(updating[order.id])}
                            className={`btn w-full ${updating[order.id] ? 'btn-primary opacity-50 cursor-not-allowed' : 'btn-primary'} font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base`}
                          >
                            <i className="fas fa-check mr-2"></i>
                            {updating[order.id] ? 'Marking...' : 'Mark Complete'}
                          </button>
                          <button
                            onClick={() => handleChangeStatus(order.id, 'cancelled')}
                            disabled={Boolean(updating[order.id])}
                            className={`w-full ${updating[order.id] ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'} text-base-content opacity-80 font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base`}
                          >
                            <i className="fas fa-ban mr-2"></i>
                            {updating[order.id] ? 'Working...' : 'Cancel Order'}
                          </button>
                          <button className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-base-content opacity-80 font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base">
                            <i className="fas fa-comments mr-2"></i>
                            Message Client
                          </button>
                        </>
                      )}
                      
                      {order.status === 'completed' && (
                        <>
                          <button 
                            onClick={() => handleChangeStatus(order.id, 'active')}
                            disabled={Boolean(updating[order.id])}
                            className={`w-full ${updating[order.id] ? 'bg-primary-400 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600'} text-white font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base`}
                          >
                            <i className="fas fa-undo mr-2"></i>
                            {updating[order.id] ? 'Working...' : 'Mark Active'}
                          </button>
                          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base">
                            <i className="fas fa-star mr-2"></i>
                            Leave Review
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </div>
    );
};

export default Orders;
