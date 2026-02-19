import { useState, useContext } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function ChatApplicationModal({ 
  jobId, 
  clientId,
  onClose, 
  onSuccess 
}) {
  const { user } = useContext(AuthContext);
  const [proposalText, setProposalText] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!proposalText.trim() || proposalText.trim().length < 50) {
      toast.error('Proposal text must be at least 50 characters');
      return;
    }

    if (proposedPrice && (isNaN(proposedPrice) || parseFloat(proposedPrice) <= 0)) {
      toast.error('Price must be a positive number');
      return;
    }

    if (!user?.uid) {
      toast.error('You must be logged in to apply');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        jobId,
        workerId: user.uid,
        clientId,
        proposalText: proposalText.trim(),
        ...(proposedPrice && { proposedPrice: parseFloat(proposedPrice) }),
        ...(currency && { currency })
      };

      const response = await axios.post(`${API_BASE}/api/applications`, payload);
      
      toast.success('Application submitted successfully!');
      if (onSuccess) {
        onSuccess(response.data.application);
      }
      onClose();
    } catch (err) {
      console.error('Failed to submit application:', err);
      toast.error(err.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Apply for Job</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proposal Text */}
          <div>
            <label className="label">
              <span className="label-text">Proposal Text *</span>
              <span className="label-text-alt">
                {proposalText.length}/50 min
              </span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Describe why you're the best fit for this job..."
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              rows={5}
              required
              minLength={50}
            />
            {proposalText.length > 0 && proposalText.length < 50 && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {50 - proposalText.length} more characters required
                </span>
              </label>
            )}
          </div>

          {/* Proposed Price */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="label">
                <span className="label-text">Proposed Price (Optional)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                placeholder="Enter your proposed price"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Currency</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="BDT">BDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-action">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || proposalText.trim().length < 50}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Submitting...
                </>
              ) : (
                'Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
