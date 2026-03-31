import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useProfile } from '../contexts/ProfileContext';

export default function RegistrationPending() {
  const { user, logOut } = useContext(AuthContext) || {};
  const { profile } = useProfile();
  const navigate = useNavigate();

  const status = profile?.workerAccountStatus;
  const rejectionReason = profile?.registrationRejectionReason;
  const workerName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'there';

  // If approved, redirect immediately
  React.useEffect(() => {
    if (status === 'approved') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  const handleLogout = async () => {
    if (logOut) await logOut();
    navigate('/login');
  };

  const statusConfig = {
    draft: {
      icon: 'edit_note',
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.25)',
      title: 'Complete Your Registration',
      subtitle: 'Your registration is not yet submitted.',
      description: 'You need to complete all steps of the registration form before your account can be reviewed.',
    },
    pending_review: {
      icon: 'schedule',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.25)',
      title: 'Application Under Review',
      subtitle: 'We\'ve received your registration!',
      description: 'Our team is reviewing your information and documents. This typically takes 24–48 hours. You\'ll receive an email once your account is approved.',
    },
    rejected: {
      icon: 'cancel',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.25)',
      title: 'Application Not Approved',
      subtitle: 'Your registration could not be approved at this time.',
      description: 'Please review the reason below and contact our support team if you have any questions or would like to re-submit with corrected information.',
    },
  };

  const cfg = statusConfig[status] || statusConfig.pending_review;

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(29,198,108,0.1)', border: '1px solid rgba(29,198,108,0.3)' }}>
            <span className="text-[#1DC66C] font-bold text-lg">HM</span>
            <span className="text-slate-300 text-sm">Hire Mistri</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}>
              <span className="material-symbols-outlined text-5xl" style={{ color: cfg.color }}>
                {cfg.icon}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{cfg.title}</h1>
          <p className="font-semibold mb-3" style={{ color: cfg.color }}>{cfg.subtitle}</p>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{cfg.description}</p>

          {/* Rejection reason */}
          {status === 'rejected' && rejectionReason && (
            <div className="rounded-xl p-4 mb-6 text-left"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p className="text-amber-400 text-sm font-semibold mb-1">Reason from admin:</p>
              <p className="text-amber-300 text-sm">{rejectionReason}</p>
            </div>
          )}

          {/* Timeline for pending */}
          {status === 'pending_review' && (
            <div className="rounded-xl p-4 mb-6 text-left space-y-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { icon: 'check_circle', color: '#1DC66C', text: 'Registration submitted' },
                { icon: 'schedule', color: '#F59E0B', text: 'Under admin review (24–48 hours)' },
                { icon: 'radio_button_unchecked', color: '#4B5563', text: 'Account approval email sent' },
                { icon: 'radio_button_unchecked', color: '#4B5563', text: 'Start applying for jobs!' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl" style={{ color: item.color }}>{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {status === 'draft' && (
              <Link
                to="/register"
                className="block w-full py-3 rounded-xl text-white font-bold text-center transition-all"
                style={{ background: 'linear-gradient(135deg, #1DC66C, #16a85a)' }}
              >
                Continue Registration →
              </Link>
            )}
            {(status === 'rejected') && (
              <Link
                to="/register"
                className="block w-full py-3 rounded-xl text-white font-bold text-center transition-all"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
              >
                Re-submit Registration →
              </Link>
            )}
            <a
              href="mailto:support@hiremistri.com"
              className="block w-full py-3 rounded-xl font-medium text-center transition-all text-slate-300"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Contact Support
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Hire Mistri © {new Date().getFullYear()} · All rights reserved
        </p>
      </div>
    </div>
  );
}
