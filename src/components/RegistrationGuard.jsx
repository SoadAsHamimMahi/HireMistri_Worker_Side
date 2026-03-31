import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useProfile } from '../contexts/ProfileContext';

/**
 * RegistrationGuard
 * Wraps dashboard/protected routes and redirects based on workerAccountStatus.
 *
 *  not logged in         → /login
 *  draft or no status    → /register
 *  pending_review        → /registration/pending
 *  rejected              → /registration/pending
 *  approved              → render children normally
 */
export default function RegistrationGuard({ children }) {
  const { user, loading: authLoading } = useContext(AuthContext) || {};
  const { profile } = useProfile();
  const location = useLocation();

  // Still loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#1DC66C] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Profile not yet fetched — if profile is null and user is valid, wait
  if (user && profile === null) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#1DC66C] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const status = profile?.workerAccountStatus;
  const userRole = profile?.role;

  // Non-workers (clients) pass through without restriction
  if (userRole && userRole !== 'worker') return <>{children}</>;

  // Workers: gate by account status
  if (!status || status === 'draft') {
    return <Navigate to="/register" replace />;
  }

  if (status === 'pending_review' || status === 'rejected') {
    return <Navigate to="/registration/pending" replace />;
  }

  // status === 'approved' or unknown — allow through
  return <>{children}</>;
}
