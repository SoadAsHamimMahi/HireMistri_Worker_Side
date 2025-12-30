import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function JobRecommendations({ limit = 5 }) {
  const { user } = useContext(AuthContext);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchRecommendations();
    }
  }, [user?.uid]);

  const fetchRecommendations = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/api/jobs/recommendations/${user.uid}`);
      const jobs = response.data || [];
      setRecommendations(jobs.slice(0, limit));
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      // Don't show error toast, just fail silently
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-heading font-bold text-base-content">
          <i className="fas fa-star text-primary-500 mr-2"></i>
          Recommended for You
        </h2>
        <Link
          to="/recommended-jobs"
          className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
        >
          View All
        </Link>
      </div>

      <div className="space-y-4">
        {recommendations.map((job) => {
          const jobId = job._id?.$oid || job._id || job.id;
          return (
            <Link
              key={jobId}
              to={`/jobs/${jobId}`}
              className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-base-content line-clamp-1">
                  {job.title || 'Untitled Job'}
                </h3>
                <span className="text-xs text-primary-500 font-medium ml-2">
                  Score: {job.recommendationScore || 0}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                <span>📍 {job.location || 'N/A'}</span>
                <span>💸 ৳{job.budget || 0}</span>
              </div>

              {job.recommendationReasons && job.recommendationReasons.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.recommendationReasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

