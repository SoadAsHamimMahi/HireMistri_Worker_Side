import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { retryRequest } from '../utils/retryRequest';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function JobOfferAcceptModal({ 
  job, 
  workerId,
  isOpen,
  onClose,
  onSuccess
}) {
  const [proposal, setProposal] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!job._id || !workerId) return;

    // Validate proposal length if provided
    if (proposal.trim() && proposal.trim().length < 10) {
      toast.error('Proposal must be at least 10 characters long');
      return;
    }

    const priceNum = proposedPrice.trim() ? parseFloat(proposedPrice.trim()) : null;
    if (proposedPrice.trim() && (isNaN(priceNum) || priceNum <= 0)) {
      toast.error('Please enter a valid proposed price');
      return;
    }

    // Task 2.3: Optimistic UI Update - disable form immediately
    setLoading(true);
    
    try {
      // Task 2.4: Retry mechanism
      const response = await retryRequest(() => 
        axios.post(
          `${API_BASE}/api/job-offers/${job._id}/accept`,
          { 
            workerId,
            proposal: proposal.trim() || undefined,
            proposedPrice: priceNum != null && priceNum > 0 ? priceNum : undefined,
            currency: job.currency || 'BDT'
          }
        )
      );
      // Success - UI already updated optimistically
      toast.success('Job offer accepted! Application created.');
      setProposal('');
      setProposedPrice('');
      if (onSuccess) {
        onSuccess(response.data.application);
      }
      onClose();
    } catch (err) {
      // Rollback optimistic update
      console.error('Failed to accept job offer:', err);
      toast.error(err.response?.data?.error || 'Failed to accept job offer');
      setLoading(false); // Re-enable form on error
    }
  };

  const handleCancel = () => {
    setProposal('');
    setProposedPrice('');
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-4">
          <i className="fas fa-briefcase mr-2 text-primary"></i>
          Accept Job Offer: {job.title}
        </h3>

        <div className="mb-4 p-3 bg-base-200 rounded-lg">
          <p className="text-sm text-base-content/70 mb-2">
            <strong>Job Details:</strong>
          </p>
          {job.description && (
            <p className="text-sm text-base-content/80 mb-2">{job.description}</p>
          )}
          {job.budget && (
            <p className="text-sm">
              <strong>Budget:</strong> {job.budget} {job.currency || 'BDT'}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">
                Custom Proposal <span className="text-base-content/50">(Optional)</span>
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32"
              placeholder="Add a custom proposal message to the client (optional). If left empty, a default message will be used."
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              disabled={loading}
            />
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                Minimum 10 characters if provided
              </span>
            </label>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">
                Propose different budget <span className="text-base-content/50">(Optional)</span>
              </span>
            </label>
            <p className="text-xs text-base-content/60 mb-2">
              If you want to suggest a different price than the job budget, enter it here. The client can accept or counter it.
            </p>
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="number"
                min="0"
                step="any"
                placeholder={job.budget ? `e.g. ${job.budget}` : 'e.g. 5000'}
                className="input input-bordered w-32"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                disabled={loading}
              />
              <span className="text-sm text-base-content/70">{job.currency || 'BDT'}</span>
            </div>
          </div>

          <div className="modal-action">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-success"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Accepting...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Accept Job Offer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={handleCancel}></div>
    </div>
  );
}
