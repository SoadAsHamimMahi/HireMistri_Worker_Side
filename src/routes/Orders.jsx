import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const Orders = () => {
  const { user } = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('active'); // Default to active orders

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

        // Filter for accepted applications (these become orders)
        const acceptedApplications = Array.isArray(data) ? data.filter(app => 
          app.status && app.status.toLowerCase() === 'accepted'
        ) : [];

        // Transform applications to order format
        const transformedOrders = acceptedApplications.map((app, index) => ({
          id: app._id,
          jobId: app.jobId,
          jobTitle: app.title || 'Untitled Job',
          clientName: app.clientName || 'Client', // This might need to be fetched separately
          clientAvatar: `https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face&ixid=${index}`, // Placeholder avatar
          category: app.category || 'General',
          status: 'active', // All accepted applications are considered active orders
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
      } catch (err) {
        console.error('Failed to load orders:', err?.response?.data || err.message);
        setError('Failed to load orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.uid]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const activeOrders = orders.filter(order => order.status === 'active');

  // Handle marking order as complete
  const handleMarkComplete = async (orderId) => {
    try {
      // Update the application status to 'completed' in the backend
      await axios.post(`${API_BASE}/api/applications`, {
        jobId: orders.find(o => o.id === orderId)?.jobId,
        workerId: user?.uid,
        status: 'completed'
      });

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: 'completed', progress: 100 }
          : order
      ));

      // Show success message
      alert('Order marked as complete!');
    } catch (err) {
      console.error('Failed to mark order as complete:', err);
      alert('Failed to mark order as complete. Please try again.');
    }
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
          <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-2">
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
      {/* Header Section - Mobile Optimized */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
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
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-white">{orders.length}</p>
              </div>
              <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900 rounded-full self-start lg:self-auto">
                <i className="fas fa-clipboard-list text-blue-600 dark:text-blue-400 text-lg lg:text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-2 lg:mb-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Active Orders</p>
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
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-xl lg:text-3xl font-heading font-bold text-green-600 dark:text-green-400">
                  {orders.filter(o => o.status === 'completed').length}
                </p>
              </div>
              <div className="p-2 lg:p-3 bg-green-100 dark:bg-green-900 rounded-full self-start lg:self-auto">
                <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-lg lg:text-xl"></i>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-2 lg:mb-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
                <p className="text-lg lg:text-3xl font-heading font-bold text-gray-900 dark:text-white">
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
              <h3 className="text-lg lg:text-xl font-heading font-semibold text-gray-900 dark:text-white mb-2">
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
                          <h3 className="text-lg lg:text-xl font-heading font-bold text-gray-900 dark:text-white mb-2">
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
                          <p className="font-medium text-gray-900 dark:text-white truncate">{order.clientName}</p>
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
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{order.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${order.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Order Details - Mobile Optimized */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 text-xs lg:text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                          <p className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm">
                            {new Date(order.startDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                          <p className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm">
                            {new Date(order.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Est. Hours</p>
                          <p className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm">{order.estimatedHours}h</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 mb-1">Order ID</p>
                          <p className="font-medium text-gray-900 dark:text-white text-xs lg:text-sm truncate">{order.id}</p>
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
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base"
                          >
                            <i className="fas fa-check mr-2"></i>
                            Mark Complete
                          </button>
                          <button className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base">
                            <i className="fas fa-comments mr-2"></i>
                            Message Client
                          </button>
                        </>
                      )}
                      
                      {order.status === 'completed' && (
                        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 lg:py-3 px-4 rounded-lg lg:rounded-xl transition-colors text-sm lg:text-base">
                          <i className="fas fa-star mr-2"></i>
                          Leave Review
                        </button>
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
