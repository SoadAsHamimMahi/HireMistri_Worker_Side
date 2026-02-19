import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { retryRequest } from '../utils/retryRequest';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function getDefaultReminderDate() {
  const d = new Date();
  d.setHours(d.getHours() + 2);
  d.setMinutes(0);
  return d.toISOString().slice(0, 16);
}

export default function JobOfferRemindLaterModal({
  job,
  workerId,
  isOpen,
  onClose,
  onSuccess
}) {
  const [reminderAt, setReminderAt] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setReminderAt(getDefaultReminderDate());
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!job._id || !workerId) return;

    const at = reminderAt || getDefaultReminderDate();
    const reminderDate = new Date(at);
    if (reminderDate <= new Date()) {
      toast.error('Reminder time must be in the future');
      return;
    }

    setLoading(true);
    try {
      await retryRequest(() =>
        axios.post(
          `${API_BASE}/api/job-offers/${job._id}/remind-later`,
          {
            workerId,
            reminderAt: reminderDate.toISOString()
          }
        )
      );
      toast.success('Reminder set. We\'ll remind you before the offer expires.');
      setReminderAt('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to set reminder:', err);
      toast.error(err.response?.data?.error || 'Failed to set reminder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          <i className="fas fa-bell mr-2 text-primary"></i>
          Remind me later: {job.title}
        </h3>

        <p className="mb-4 text-base-content/70 text-sm">
          Choose when you want to be reminded about this job offer. You can accept or reject it before then.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Remind me at</span>
            </label>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={reminderAt}
              onChange={(e) => setReminderAt(e.target.value)}
              min={new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)}
              disabled={loading}
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
              className="btn btn-primary"
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Setting...
                </>
              ) : (
                <>
                  <i className="fas fa-bell mr-2"></i>
                  Set reminder
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
