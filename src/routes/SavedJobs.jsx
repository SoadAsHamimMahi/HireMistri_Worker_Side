import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import BookmarkButton from '../components/BookmarkButton';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function SavedJobs() {
  const { user } = useContext(AuthContext);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const fetchSavedJobs = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${API_BASE}/api/saved-jobs/${user.uid}`);
        setSavedJobs(response.data || []);
      } catch (err) {
        console.error('Failed to fetch saved jobs:', err);
        setError('Failed to load saved jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [user?.uid]);

  const handleUnsave = (savedJobId) => {
    // Remove from local state when unsaved
    setSavedJobs(prev => prev.filter(job => job.savedJobId !== savedJobId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-base-content opacity-70">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-base-content mb-2">
            Saved Jobs
          </h1>
          <p className="text-base-content opacity-70">
            {savedJobs.length} {savedJobs.length === 1 ? 'job' : 'jobs'} saved
          </p>
        </div>

        {/* Jobs Grid */}
        {savedJobs.length === 0 ? (
          <div className="text-center py-16">
            <i className="far fa-bookmark text-6xl text-base-content opacity-30 mb-4"></i>
            <h3 className="text-xl font-semibold mb-2 text-base-content">No saved jobs yet</h3>
            <p className="text-base-content opacity-70 mb-6">
              Start saving jobs you're interested in to view them later
            </p>
            <Link
              to="/jobs"
              className="btn btn-primary"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map((job) => {
              const jobId = (typeof job._id === 'string' && job._id) ||
                           (job._id && job._id.$oid) ||
                           job.id;

              return (
                <div
                  key={jobId}
                  className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition relative"
                >
                  <div className="absolute top-2 right-2 z-10">
                    <BookmarkButton jobId={jobId} />
                  </div>
                  <img
                    src={job.images?.[0] || 'https://via.placeholder.com/300x200'}
                    alt={job.title}
                    className="w-full h-40 object-cover"
                  />

                  <div className="p-4 flex flex-col gap-2">
                    <h3 className="text-lg font-semibold text-base-content">{job.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">📍 {job.location}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">📂 {job.category}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      🗓️ Posted on: {job.date || (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A')}
                    </p>
                    <span className="text-primary font-semibold text-sm">৳{job.budget}</span>
                    {job.savedAt && (
                      <p className="text-xs text-gray-400">
                        Saved {new Date(job.savedAt).toLocaleDateString()}
                      </p>
                    )}

                    <Link
                      to={`/jobs/${jobId}`}
                      className="btn btn-sm btn-primary mt-3 w-full text-center"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

