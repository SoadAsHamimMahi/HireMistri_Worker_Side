import { useState, useEffect, useContext } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { AuthContext } from '../Authentication/AuthProvider';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const RATING_CATEGORIES = [
  { key: 'qualityOfWork', label: 'Work Clarity', icon: 'fas fa-list-check' },
  { key: 'punctuality', label: 'Punctuality', icon: 'fas fa-clock' },
  { key: 'communication', label: 'Communication', icon: 'fas fa-comments' },
  { key: 'professionalism', label: 'Professionalism', icon: 'fas fa-user-tie' },
  { key: 'valueForMoney', label: 'Payment Fairness', icon: 'fas fa-money-bill-wave' },
  { key: 'cleanliness', label: 'Work Environment', icon: 'fas fa-house' },
];

export default function RatingModal({
  isOpen,
  onClose,
  jobId,
  applicationId,
  workerId,
  clientId,
  clientName,
  jobTitle,
  onSuccess
}) {
  const { isDarkMode } = useDarkMode();
  const { user } = useContext(AuthContext) || {};
  const [ratings, setRatings] = useState({
    qualityOfWork: 0,
    punctuality: 0,
    communication: 0,
    professionalism: 0,
    valueForMoney: 0,
    cleanliness: 0,
  });
  const [overallRating, setOverallRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    if (!isOpen || !applicationId || !user?.uid) return;

    setExistingReview(null);
    setRatings({
      qualityOfWork: 0,
      punctuality: 0,
      communication: 0,
      professionalism: 0,
      valueForMoney: 0,
      cleanliness: 0,
    });
    setOverallRating(0);
    setReviewText('');
    setError('');

    (async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/reviews/application/${applicationId}?reviewerId=${encodeURIComponent(user.uid)}`,
          { headers: { Accept: 'application/json' } }
        );
        if (response.ok) {
          const review = await response.json();
          setExistingReview(review);
          setRatings(review.ratings || {});
          setOverallRating(review.overallRating || 0);
          setReviewText(review.reviewText || '');
        }
      } catch {
        setExistingReview(null);
      }
    })();
  }, [isOpen, applicationId, user?.uid]);

  useEffect(() => {
    const values = Object.values(ratings).filter((v) => v > 0);
    if (!values.length) return setOverallRating(0);
    const avg = values.reduce((sum, r) => sum + r, 0) / values.length;
    setOverallRating(Math.round(avg * 10) / 10);
  }, [ratings]);

  const handleSubmit = async () => {
    const hasRatings = Object.values(ratings).some((v) => v > 0);
    if (!hasRatings) return setError('Please rate at least one category');
    if (!user?.uid) return setError('Please log in to submit a review');
    try {
      setSubmitting(true);
      setError('');

      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          jobId,
          applicationId,
          workerId: workerId || user.uid,
          clientId,
          reviewerId: user.uid,
          reviewerRole: 'worker',
          revieweeId: clientId,
          revieweeRole: 'client',
          ratings,
          overallRating,
          reviewText: reviewText.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit review');
      }

      const data = await res.json();
      if (onSuccess) onSuccess(data.review);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className={`relative bg-base-200 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'dark' : ''}`}>
        <div className="sticky top-0 bg-base-200 border-b border-base-300 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-base-content">{existingReview ? 'Your Review' : 'Rate Client'}</h3>
            <p className="text-sm text-base-content/70 mt-1">{clientName || 'Client'} • {jobTitle || 'Job'}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle" disabled={submitting}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error ? (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-triangle"></i>
              <span>{error}</span>
            </div>
          ) : null}

          {existingReview ? (
            <div className="alert alert-info">
              <i className="fas fa-info-circle"></i>
              <span>You&apos;ve already reviewed this client for this job.</span>
            </div>
          ) : null}

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-base-content">Rate by Category</h4>
            {RATING_CATEGORIES.map((category) => (
              <div key={category.key} className="bg-base-100 rounded-lg p-4 border border-base-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-base-content">
                    <i className={`${category.icon} text-primary mr-2`}></i>
                    {category.label}
                  </span>
                  <span className="text-sm text-base-content/70">{ratings[category.key] || 0}/5</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => !existingReview && setRatings((prev) => ({ ...prev, [category.key]: star }))}
                      className={`text-2xl ${star <= (ratings[category.key] || 0) ? 'text-yellow-400' : 'text-base-content/30'} ${existingReview ? '' : 'hover:text-yellow-400'}`}
                      disabled={submitting || !!existingReview}
                    >
                      <i className="fas fa-star"></i>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-primary/10 rounded-lg p-4 border border-primary/20 flex items-center justify-between">
            <span className="font-semibold text-base-content">Overall Rating</span>
            <span className="text-2xl font-bold text-primary">{overallRating.toFixed(1)} / 5.0</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-base-content mb-2">Written Review (Optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => !existingReview && setReviewText(e.target.value)}
              className="textarea textarea-bordered w-full min-h-[120px] resize-none"
              disabled={submitting || !!existingReview}
              maxLength={1000}
              placeholder="Share your experience with this client..."
            />
            <p className="text-xs text-base-content/60 mt-1 text-right">{reviewText.length}/1000</p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-base-300">
            <button onClick={onClose} className="btn btn-outline" disabled={submitting}>Cancel</button>
            <button onClick={handleSubmit} className="btn btn-primary" disabled={submitting || overallRating === 0 || !!existingReview}>
              {submitting ? 'Submitting...' : existingReview ? 'Already reviewed' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
