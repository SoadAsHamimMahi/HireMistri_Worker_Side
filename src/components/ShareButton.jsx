import React, { useRef } from 'react';
import toast from 'react-hot-toast';
import { MdShare } from 'react-icons/md';

export default function ShareButton({ jobId, jobTitle, jobDescription }) {
  const isCopyingRef = useRef(false);
  
  const shareUrl = `${window.location.origin}/jobs/${jobId}`;

  const handleCopyLink = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isCopyingRef.current) return;
    isCopyingRef.current = true;

    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    }).finally(() => {
      setTimeout(() => {
        isCopyingRef.current = false;
      }, 500);
    });
  };

  return (
    <button
      onClick={handleCopyLink}
      className="p-2 rounded-xl hover:bg-white/5 transition-all"
      title="Copy job link"
    >
      <MdShare className="text-lg" />
    </button>
  );
}
