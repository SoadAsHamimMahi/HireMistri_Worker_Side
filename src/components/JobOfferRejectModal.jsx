import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { retryRequest } from '../utils/retryRequest';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function JobOfferRejectModal({ 
  job, 
  workerId,
  isOpen,
  onClose,
  onSuccess
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!job._id || !workerId) return;

    setLoading(true);
    try {
      // Task 2.4: Retry mechanism
      await retryRequest(() =>
        axios.post(
          `${API_BASE}/api/job-offers/${job._id}/reject`,
          { 
            workerId,
            reason: reason.trim() || undefined
          }
        )
      );
      toast.success('Job offer rejected');
      setReason('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to reject job offer:', err);
      toast.error(err.response?.data?.error || 'Failed to reject job offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          <i className="fas fa-times-circle mr-2 text-error"></i>
          Reject Job Offer: {job.title}
        </h3>
        
        <p className="mb-4 text-base-content/70">
          Are you sure you want to reject this job offer? This action cannot be undone.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">
                Reason for Rejection <span className="text-base-content/50">(Optional)</span>
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              placeholder="Please provide a reason (optional)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-error"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Rejecting...
                </>
              ) : (
                <>
                  <i className="fas fa-times mr-2"></i>
                  Reject Job Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
