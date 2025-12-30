import React, { useRef } from 'react';
import toast from 'react-hot-toast';

export default function ShareButton({ jobId, jobTitle, jobDescription }) {
  const isCopyingRef = useRef(false);
  
  // Generate shareable URL
  const shareUrl = `${window.location.origin}/jobs/${jobId}`;

  const handleCopyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent double clicks
    if (isCopyingRef.current) return;
    isCopyingRef.current = true;

    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    }).finally(() => {
      // Reset after a short delay
      setTimeout(() => {
        isCopyingRef.current = false;
      }, 500);
    });
  };

  return (
    <button
      onClick={handleCopyLink}
      className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
      title="Copy job link"
    >
      <i className="fas fa-link mr-2"></i>
      Copy Link
    </button>
  );
}
