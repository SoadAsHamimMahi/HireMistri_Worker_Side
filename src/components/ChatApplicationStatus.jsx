import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function ChatApplicationStatus({ 
  jobId, 
  clientId, 
  userRole = 'worker',
  userId,
  onStatusChange 
}) {
  const [applicationData, setApplicationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const fetchApplicationStatus = async () => {
      if (!jobId || !userId) {
        setApplicationData(null);
        setStatus(null);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE}/api/applications/${jobId}/${userId}`
        );
        setApplicationData(response.data);
        setStatus(response.data.status || 'pending');
      } catch (err) {
        if (err.response?.status === 404) {
          // No application yet
          setApplicationData(null);
          setStatus(null);
        } else {
          console.error('Failed to fetch application status:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationStatus();

    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchApplicationStatus, 5000);
    return () => clearInterval(interval);
  }, [jobId, userId]);

  if (!jobId || !userId) return null;

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      accepted: 'badge-success',
      rejected: 'badge-error',
      completed: 'badge-info'
    };
    return badges[status] || 'badge-ghost';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pending',
      accepted: 'Accepted',
      rejected: 'Rejected',
      completed: 'Completed'
    };
    return texts[status] || status;
  };

  if (loading && !applicationData) {
    return (
      <div className="flex items-center justify-center p-4">
        <span className="loading loading-spinner loading-sm"></span>
      </div>
    );
  }

  // No application yet
  if (!applicationData && status === null) {
    return null; // Worker can apply via button, no need to show waiting message
  }

  return (
    <div className="bg-base-200 p-4 rounded-lg border border-base-300 space-y-3">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`badge ${getStatusBadge(status)}`}>
            {getStatusText(status)}
          </span>
          {applicationData?.proposedPrice && (
            <span className="text-sm font-semibold text-base-content">
              {applicationData.proposedPrice} {applicationData.currency || 'BDT'}
            </span>
          )}
        </div>
        {applicationData?._id && (
          <Link
            to={`/applications/${applicationData._id}`}
            className="text-xs link link-primary"
          >
            View Details
          </Link>
        )}
      </div>

      {/* Proposal Text Preview */}
      {applicationData?.proposalText && (
        <div className="text-sm text-base-content/80 bg-base-100 p-3 rounded border border-base-300">
          <p className="line-clamp-2">{applicationData.proposalText}</p>
        </div>
      )}
    </div>
  );
}
