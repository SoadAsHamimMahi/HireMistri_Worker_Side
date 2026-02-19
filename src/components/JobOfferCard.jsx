import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import JobOfferAcceptModal from './JobOfferAcceptModal';
import JobOfferRejectModal from './JobOfferRejectModal';
import JobOfferRemindLaterModal from './JobOfferRemindLaterModal';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Task 2.1: Expiration Display Component
const ExpirationDisplay = ({ expiresAt }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  useEffect(() => {
    if (!expiresAt) return;
    
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;
      
      if (diff <= 0) {
        setTimeRemaining({ expired: true });
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining({ 
        expired: false,
        hours,
        minutes,
        isExpiringSoon: hours < 24
      });
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [expiresAt]);
  
  if (!timeRemaining) return null;
  
  if (timeRemaining.expired) {
    return (
      <span className="badge badge-error badge-sm">
        <i className="fas fa-clock mr-1"></i>
        Expired
      </span>
    );
  }
  
  return (
    <span className={`badge badge-sm ${timeRemaining.isExpiringSoon ? 'badge-warning' : 'badge-info'}`}>
      <i className="fas fa-clock mr-1"></i>
      {timeRemaining.hours}h {timeRemaining.minutes}m left
      {timeRemaining.isExpiringSoon && ' (Expiring Soon!)'}
    </span>
  );
};

export default function JobOfferCard({ 
  job, 
  workerId,
  onAccept,
  onReject
}) {
  const [loading, setLoading] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRemindLaterModal, setShowRemindLaterModal] = useState(false);
  const acceptTimeoutRef = useRef(null);
  const rejectTimeoutRef = useRef(null);
  
  // Task 2.1: Check if job is expired
  const isExpired = job.expiresAt && new Date(job.expiresAt) <= new Date();
  
  // Task 5.3: Debounce utility for accept
  const debouncedAccept = useCallback(() => {
    if (acceptTimeoutRef.current) {
      clearTimeout(acceptTimeoutRef.current);
    }
    acceptTimeoutRef.current = setTimeout(() => {
      setShowAcceptModal(true);
    }, 300);
  }, []);
  
  // Task 5.3: Debounce utility for reject
  const debouncedReject = useCallback(() => {
    if (rejectTimeoutRef.current) {
      clearTimeout(rejectTimeoutRef.current);
    }
    rejectTimeoutRef.current = setTimeout(() => {
      if (!job._id || !workerId) return;
      setShowRejectModal(true);
    }, 300);
  }, [job._id, workerId]);

  if (!job || !job.isPrivate) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Task 2.3: Optimistic UI Updates
  // Task 5.3: Debounced accept click to prevent rapid clicks
  const handleAcceptClick = debouncedAccept;

  const handleAcceptSuccess = (application) => {
    // Optimistic update - UI already updated in modal
    if (onAccept) {
      onAccept(application);
    }
  };

  // Task 2.2: Replace window.prompt with modal
  // Task 5.3: Debounced reject click to prevent rapid clicks
  const handleReject = debouncedReject;

  const handleRejectSuccess = () => {
    if (onReject) {
      onReject();
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-4 rounded-lg border-2 border-primary/30 shadow-lg space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-lg text-base-content">{job.title}</h3>
            <span className="badge badge-success badge-sm">
              <i className="fas fa-briefcase mr-1"></i>
              Job Offer
            </span>
            <span className="badge badge-info badge-sm">
              <i className="fas fa-lock mr-1"></i>
              Private
            </span>
            {/* Task 2.1: Expiration Display */}
            {job.expiresAt && <ExpirationDisplay expiresAt={job.expiresAt} />}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-base-content/70 mb-2">
            {job.category && (
              <span className="badge badge-outline">
                <i className="fas fa-folder mr-1"></i>
                {job.category}
              </span>
            )}
            {job.budget && (
              <span className="font-semibold text-primary">
                <i className="fas fa-money-bill-wave mr-1"></i>
                {job.budget} {job.currency || 'BDT'}
              </span>
            )}
            {job.location && (
              <span>
                <i className="fas fa-map-marker-alt mr-1"></i>
                {job.location}
              </span>
            )}
            {job.createdAt && (
              <span>
                <i className="fas fa-calendar mr-1"></i>
                {formatDate(job.createdAt)}
              </span>
            )}
          </div>

          {job.description && (
            <p className="text-sm text-base-content/80 line-clamp-3 mb-2">
              {job.description}
            </p>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 pt-2 border-t border-primary/20">
        <div className="flex gap-2">
          <button
            onClick={handleAcceptClick}
            disabled={loading || isExpired}
            className="btn btn-success flex-1"
            title={isExpired ? 'This job offer has expired' : ''}
          >
            <i className="fas fa-check mr-2"></i>
            Accept Job
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="btn btn-error flex-1"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <i className="fas fa-times mr-2"></i>
                Reject
              </>
            )}
          </button>
        </div>
        {/* Task 6.1: Accept Later / Remind me later */}
        {!isExpired && (
          <button
            type="button"
            onClick={() => setShowRemindLaterModal(true)}
            disabled={loading}
            className="btn btn-ghost btn-sm w-full text-base-content/70"
          >
            <i className="fas fa-bell mr-2"></i>
            Remind me later
          </button>
        )}
      </div>

      {/* Accept Modal */}
      <JobOfferAcceptModal
        job={job}
        workerId={workerId}
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        onSuccess={handleAcceptSuccess}
      />

      {/* Task 2.2: Reject Modal */}
      <JobOfferRejectModal
        job={job}
        workerId={workerId}
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onSuccess={handleRejectSuccess}
      />

      {/* Task 6.1: Remind me later Modal */}
      <JobOfferRemindLaterModal
        job={job}
        workerId={workerId}
        isOpen={showRemindLaterModal}
        onClose={() => setShowRemindLaterModal(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
