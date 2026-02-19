import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function WorkerJobRequestCard({ 
  request,
  userRole = 'worker',
  onAccept,
  onReject,
  onStatusChange
}) {
  if (!request) return null;

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      accepted: 'badge-success',
      rejected: 'badge-error',
      expired: 'badge-ghost'
    };
    return badges[status] || 'badge-ghost';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleAccept = async () => {
    if (!request._id) return;

    try {
      const response = await axios.patch(
        `${API_BASE}/api/worker-job-requests/${request._id}/status`,
        { status: 'accepted' }
      );
      toast.success('Job request accepted!');
      if (onStatusChange) {
        onStatusChange('accepted', response.data);
      }
      if (onAccept) {
        onAccept(response.data);
      }
    } catch (err) {
      console.error('Failed to accept job request:', err);
      toast.error(err.response?.data?.error || 'Failed to accept job request');
    }
  };

  const handleReject = async () => {
    if (!request._id) return;

    try {
      const response = await axios.patch(
        `${API_BASE}/api/worker-job-requests/${request._id}/status`,
        { status: 'rejected' }
      );
      toast.success('Job request rejected');
      if (onStatusChange) {
        onStatusChange('rejected', response.data);
      }
      if (onReject) {
        onReject(response.data);
      }
    } catch (err) {
      console.error('Failed to reject job request:', err);
      toast.error(err.response?.data?.error || 'Failed to reject job request');
    }
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg border border-base-300 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-base-content">{request.title}</h3>
            <span className={`badge ${getStatusBadge(request.status)}`}>
              {request.status || 'pending'}
            </span>
            <span className="badge badge-info badge-sm">
              <i className="fas fa-user-tie mr-1"></i>
              Worker Request
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70 mb-2">
            {request.category && (
              <span className="badge badge-outline">
                <i className="fas fa-folder mr-1"></i>
                {request.category}
              </span>
            )}
            {request.proposedPrice && (
              <span>
                <i className="fas fa-money-bill-wave mr-1"></i>
                {request.proposedPrice} {request.currency || 'BDT'}
              </span>
            )}
            {request.location && (
              <span>
                <i className="fas fa-map-marker-alt mr-1"></i>
                {request.location}
              </span>
            )}
            {request.createdAt && (
              <span>
                <i className="fas fa-calendar mr-1"></i>
                {formatDate(request.createdAt)}
              </span>
            )}
          </div>

          {request.description && (
            <p className="text-sm text-base-content/80 line-clamp-3">
              {request.description}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons for client */}
      {userRole === 'client' && request.status === 'pending' && (
        <div className="flex gap-2 pt-2 border-t border-base-300">
          <button
            onClick={handleAccept}
            className="btn btn-sm btn-success flex-1"
          >
            Accept Request
          </button>
          <button
            onClick={handleReject}
            className="btn btn-sm btn-error flex-1"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
