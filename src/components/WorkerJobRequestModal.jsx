import { useState, useContext } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function WorkerJobRequestModal({ 
  clientId,
  conversationId,
  onClose, 
  onSuccess 
}) {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    proposedPrice: '',
    currency: 'BDT'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const wordCount = form.description.trim().split(/\s+/).filter(Boolean).length;
  const minWords = 10; // Reduced from 20 to 10 for simplicity
  const isDescriptionValid = wordCount >= minWords;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!form.category) {
      toast.error('Category is required');
      return;
    }

    if (!isDescriptionValid) {
      toast.error(`Description must be at least ${minWords} words`);
      return;
    }

    if (form.proposedPrice && (isNaN(form.proposedPrice) || parseFloat(form.proposedPrice) <= 0)) {
      toast.error('Price must be a positive number');
      return;
    }

    if (!user?.uid) {
      toast.error('You must be logged in to create a job request');
      return;
    }

    if (!clientId || !conversationId) {
      toast.error('Missing client or conversation information');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        workerId: user.uid,
        clientId: clientId,
        conversationId: conversationId,
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        ...(form.proposedPrice && { proposedPrice: parseFloat(form.proposedPrice) }),
        currency: form.currency
      };

      const response = await axios.post(`${API_BASE}/api/worker-job-requests`, payload);
      
      toast.success('Job request sent successfully!');
      if (onSuccess) {
        onSuccess(response.data.request);
      }
      onClose();
    } catch (err) {
      console.error('Failed to create job request:', err);
      toast.error(err.response?.data?.error || 'Failed to create job request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <h3 className="font-bold text-lg mb-4">Create Job Request</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="label">
              <span className="label-text">Job Request Title *</span>
            </label>
            <input
              type="text"
              name="title"
              className="input input-bordered w-full"
              placeholder="e.g. I can help you with plumbing repairs"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="label">
              <span className="label-text">Category *</span>
            </label>
            <select
              name="category"
              className="select select-bordered w-full"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option disabled value="">Select Category</option>
              <option value="Electrician">Electrician</option>
              <option value="Plumber">Plumber</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Technician">Technician</option>
              <option value="Carpenter">Carpenter</option>
              <option value="Mason">Mason (Rajmistri)</option>
              <option value="Welder">Welder</option>
              <option value="Painter">Painter</option>
              <option value="AC Technician">AC Technician</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label">
              <span className="label-text">Description *</span>
              <span className="label-text-alt">
                {wordCount}/{minWords} words min
              </span>
            </label>
            <textarea
              name="description"
              className="textarea textarea-bordered w-full"
              placeholder="Briefly describe the work you can do..."
              value={form.description}
              onChange={handleChange}
              rows={4}
              required
            />
            {form.description && !isDescriptionValid && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {minWords - wordCount} more words required
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
                name="proposedPrice"
                className="input input-bordered w-full"
                placeholder="Enter your proposed price"
                value={form.proposedPrice}
                onChange={handleChange}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Currency</span>
              </label>
              <select
                name="currency"
                className="select select-bordered w-full"
                value={form.currency}
                onChange={handleChange}
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
              disabled={submitting || !isDescriptionValid || !form.title || !form.category}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Sending...
                </>
              ) : (
                'Send Job Request'
              )}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
