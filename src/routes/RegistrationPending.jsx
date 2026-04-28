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
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-6 font-sans selection:bg-primary/20">
      <div className="w-full max-w-xl">
        {/* Institutional Branding */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-base-200 border border-base-300 shadow-sm animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
               <span className="material-symbols-outlined text-white text-xl">security</span>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none mb-1">EMERALD LEDGER</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-base-content/30 leading-none">Vetted Talent Protocol</p>
            </div>
          </div>
        </div>

        {/* Status Card - Precision Engineering */}
        <div className="bg-base-100 border border-base-300 rounded-[3rem] p-10 md:p-14 text-center shadow-[0_30px_100px_rgba(0,0,0,0.05)] relative overflow-hidden animate-in zoom-in-95 duration-500">
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          {/* Status Hexagon Icon */}
          <div className="flex justify-center mb-10 relative z-10">
            <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center rotate-45 border-2 transition-all"
              style={{ backgroundColor: `${cfg.color}10`, borderColor: `${cfg.color}30` }}>
              <div className="-rotate-45">
                <span className="material-symbols-outlined text-6xl" style={{ color: cfg.color }}>
                  {cfg.icon}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <h1 className="text-3xl md:text-4xl font-heading font-black text-base-content tracking-tight uppercase leading-tight">
              {cfg.title}
            </h1>
            <div className="inline-block px-4 py-1.5 rounded-full bg-base-200 border border-base-300">
               <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: cfg.color }}>{cfg.subtitle}</p>
            </div>
            <p className="text-base font-medium text-base-content/50 leading-relaxed max-w-sm mx-auto mt-4 italic">
              {cfg.description}
            </p>
          </div>

          {/* Rejection reason - Alert Style */}
          {status === 'rejected' && rejectionReason && (
            <div className="mt-10 rounded-3xl p-6 text-left border border-error/20 bg-error/5 relative overflow-hidden animate-in slide-in-from-bottom-4">
               <div className="absolute top-0 left-0 w-1 h-full bg-error"></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-error mb-2">Technical Discrepancy Found</p>
               <p className="text-sm font-medium text-base-content/80">{rejectionReason}</p>
            </div>
          )}

          {/* Timeline - Logic Flow */}
          {status === 'pending_review' && (
            <div className="mt-12 space-y-6 text-left">
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-base-content/20 ml-2">VERIFICATION PROTOCOL</h3>
              <div className="space-y-4">
                {[
                  { icon: 'task_alt', color: 'var(--p)', text: 'Identity & Credentials Submitted', status: 'done' },
                  { icon: 'clinical_notes', color: '#F59E0B', text: 'Admin Manual Audit (24-48h)', status: 'active' },
                  { icon: 'mail', color: 'currentColor', text: 'Protocol Activation Email', status: 'pending' },
                  { icon: 'rocket_launch', color: 'currentColor', text: 'Full Marketplace Access', status: 'pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5 group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${item.status === 'done' ? 'bg-primary/20 text-primary' : item.status === 'active' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-base-200 text-base-content/20'}`}>
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${item.status === 'pending' ? 'text-base-content/20' : 'text-base-content/70'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions - Tactical Navigation */}
          <div className="mt-12 grid grid-cols-1 gap-4 relative z-10">
            {status === 'draft' && (
              <Link
                to="/register"
                className="btn btn-primary h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20"
              >
                RESUME ONBOARDING →
              </Link>
            )}
            {status === 'rejected' && (
              <Link
                to="/register"
                className="btn btn-error h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-error/20"
              >
                RE-INITIALIZE REGISTRATION
              </Link>
            )}
            <div className="grid grid-cols-2 gap-4">
              <a
                href="mailto:support@hiremistri.com"
                className="btn btn-ghost border-base-300 h-12 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-base-200"
              >
                H-M SUPPORT
              </a>
              <button
                onClick={handleLogout}
                className="btn btn-ghost border-base-300 h-12 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-base-200"
              >
                TERMINATE SESSION
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-base-content/20 mt-12 mb-8">
          © 2024 EMERALD LEDGER PROTOCOL · SYSTEM STATUS: STABLE
        </p>
      </div>
    </div>
  );
}
