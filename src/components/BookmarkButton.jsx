import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function BookmarkButton({ jobId, className = '' }) {
  const { user } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(false);
  const [savedJobId, setSavedJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if job is saved
  useEffect(() => {
    if (!user?.uid || !jobId) {
      setChecking(false);
      return;
    }

    const checkSaved = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/saved-jobs/check/${user.uid}/${jobId}`);
        setIsSaved(response.data.saved);
        setSavedJobId(response.data.savedJobId);
      } catch (err) {
        console.error('Failed to check saved status:', err);
      } finally {
        setChecking(false);
      }
    };

    checkSaved();
  }, [user?.uid, jobId]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.uid) {
      toast.error('Please sign in to save jobs');
      return;
    }

    if (loading) return;

    try {
      setLoading(true);

      if (isSaved && savedJobId) {
        // Unsave
        await axios.delete(`${API_BASE}/api/saved-jobs/${savedJobId}`, {
          data: { userId: user.uid }
        });
        setIsSaved(false);
        setSavedJobId(null);
        toast.success('Job removed from saved');
      } else {
        // Save
        const response = await axios.post(`${API_BASE}/api/saved-jobs`, {
          userId: user.uid,
          jobId
        });
        setIsSaved(true);
        setSavedJobId(String(response.data.savedJob._id));
        toast.success('Job saved!');
      }
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      const errorMsg = err.response?.data?.error || 'Failed to save job';
      if (err.response?.status !== 409) {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <button className={`btn btn-ghost btn-sm btn-circle ${className}`} disabled>
        <i className="far fa-bookmark text-base-content opacity-50"></i>
      </button>
    );
  }

  return (
    <button
      className={`btn btn-ghost btn-sm btn-circle ${className}`}
      onClick={handleToggle}
      disabled={loading}
      title={isSaved ? 'Remove from saved' : 'Save job'}
    >
      {loading ? (
        <i className="fas fa-spinner fa-spin text-base-content"></i>
      ) : isSaved ? (
        <i className="fas fa-bookmark text-primary"></i>
      ) : (
        <i className="far fa-bookmark text-base-content"></i>
      )}
    </button>
  );
}

