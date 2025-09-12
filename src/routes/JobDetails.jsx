import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

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
      } catch (err) {
        console.error('Failed to load job details:', err?.response?.data || err.message);
        setError('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [jobId, user?.uid]);

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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
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
          <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-2">
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
          <h3 className="text-xl font-heading font-semibold text-gray-900 dark:text-white mb-2">
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
            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-heading font-bold text-gray-900 dark:text-white mb-6">
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
              <h2 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-6">
                Job Description
              </h2>
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                  {job.description || 'No description provided.'}
                </p>
              </div>
            </div>

            {/* Job Requirements */}
            {job.requirements && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-6">
                  Requirements
                </h2>
                <ul className="space-y-4">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mr-4 mt-1">
                        <i className="fas fa-check text-primary-600 dark:text-primary-400 text-sm"></i>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-lg">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Job Images */}
            {job.images && job.images.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-white mb-6">
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

            {/* Applicants Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl lg:text-3xl font-heading font-bold text-gray-900 dark:text-white">
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
              <h3 className="text-xl lg:text-2xl font-heading font-bold text-gray-900 dark:text-white mb-6">
                Job Information
              </h3>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget</p>
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
                      <span className="text-gray-600 dark:text-gray-400">Category</span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {job.category || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start">
                      <i className="fas fa-map-marker-alt w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5"></i>
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Location</div>
                        <div className="text-gray-900 dark:text-white font-medium break-words">
                          {job.location || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center">
                      <i className="fas fa-calendar w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-gray-600 dark:text-gray-400">Posted</span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center">
                      <i className="fas fa-info-circle w-5 h-5 text-gray-400 mr-3"></i>
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
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
              <h3 className="text-xl lg:text-2xl font-heading font-bold text-gray-900 dark:text-white mb-6">
                Job Owner
              </h3>
              
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-blue-100 dark:from-primary-900 dark:to-blue-900 rounded-full flex items-center justify-center">
                  <i className="fas fa-user text-primary-600 dark:text-primary-400 text-2xl"></i>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
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
              </div>
            </div>

            {/* Application Form */}
            {!hasApplied ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 lg:p-8">
                <h3 className="text-xl lg:text-2xl font-heading font-bold text-gray-900 dark:text-white mb-6">
                  Apply for this Job
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-4">
                    <i className="fas fa-check-circle text-green-500 text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-heading font-bold text-green-800 dark:text-green-300">
                      Application Submitted
                    </h3>
                    <p className="text-green-600 dark:text-green-400 text-sm">
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