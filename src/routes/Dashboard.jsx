import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toISOString().slice(0, 10);
}

function JobCard({ job }) {
  const jobId = job.mongoId || job.id || String(job._id || job._id?.$oid || '');
  const image = Array.isArray(job.images) && job.images.length > 0 ? job.images[0] : null;
  const category = job.category || job.categories?.[0] || 'Worker';
  const budget = job.budget ?? job.price ?? '';
  const location = job.location || job.locationString || 'Not specified';

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return 'Recently';
    const posted = new Date(dateStr);
    const diffDays = Math.floor((new Date() - posted) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Posted today';
    if (diffDays === 1) return 'Posted yesterday';
    return `Posted ${diffDays} days ago`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group overflow-hidden">
      {/* Image Section */}
      <div className="relative h-44 overflow-hidden bg-gray-50">
        {image ? (
          <img
            src={image}
            alt={job.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f4f6f9]">
            <i className="fas fa-tools text-gray-300 text-5xl"></i>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-brand-hover text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-sm border border-brand-light">
            {category}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-gray-900 text-base mb-3 line-clamp-2 h-12 leading-tight group-hover:text-brand-hover transition-colors">
          {job.title}
        </h3>

        <div className="space-y-2.5 mb-5 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <i className="fas fa-map-marker-alt text-gray-500 w-3.5"></i>
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-gray-500 uppercase tracking-tight">{getRelativeTime(job.createdAt || job.date)}</span>
            <span className="text-brand-hover text-lg font-black">৳{budget}</span>
          </div>
        </div>

        <Link
          to={`/jobs/${jobId}`}
          className="flex items-center justify-between font-bold text-sm text-brand-hover hover:text-brand-hover transition-colors pt-4 border-t border-gray-50 group/link"
        >
          View Details
          <i className="fas fa-arrow-right group-hover/link:translate-x-1 transition-transform"></i>
        </Link>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="h-40 bg-gray-50 rounded-xl mb-4"></div>
      <div className="h-5 bg-gray-100 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-gray-50 rounded w-1/2 mb-6"></div>
      <div className="h-10 bg-gray-50 rounded-lg w-full"></div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;

  const [jobData, setJobData] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/users/${uid}`);
        setProfile(data || {});
      } catch (e) {
        console.warn('Could not load user profile:', e);
      }
    })();
  }, [uid]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/browse-jobs`);
        setJobData(res.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch browse jobs:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!uid) { setMyApps([]); return; }
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/my-applications/${uid}`, {
          headers: { Accept: 'application/json' },
        });
        setMyApps(Array.isArray(data) ? data : []);
      } catch (e) {
        setMyApps([]);
      }
    })();

    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/reviews/worker/${uid}`);
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Could not fetch reviews:', err);
      }
    })();
  }, [uid]);

  const kpis = useMemo(() => {
    const normalized = (myApps || []).map(a => ({
      status: (a.status || 'pending').toLowerCase(),
      payout: a.payout ?? a.earning ?? a.price ?? a.budget ?? 0,
    }));
    const completed = normalized.filter(a => a.status === 'completed');
    const active = normalized.filter(a => a.status === 'accepted' || a.status === 'active');
    const totalEarnings = completed.reduce((sum, a) => sum + (Number(a.payout) || 0), 0);
    const acceptedNum = normalized.filter(a => a.status === 'accepted').length;
    const appliedNum = Math.max(1, normalized.length);
    const responseRate = Math.min(100, Math.round((acceptedNum / appliedNum) * 100));

    return { activeCount: active.length, completedCount: completed.length, totalEarnings, responseRate };
  }, [myApps]);

  const filteredJobs = useMemo(() => {
    return jobData.filter((job) => (job.status || 'active').toLowerCase() === 'active').slice(0, 8);
  }, [jobData]);

  const displayName = profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}` : (user?.displayName || 'Worker');
  const avatar = profile?.profileCover || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=16a34a&color=fff`;

  return (
    <div className="bg-[#f8f9fa] min-h-screen text-gray-900 pb-20 font-sans">
      <div className="w-full max-w-[83.333%] mx-auto">
        {/* Header Section */}
        <div className="pt-10 mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Welcome back, {displayName}! 👋
          </h1>
          
          <div className="flex items-center gap-4 bg-white p-2.5 pr-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 rounded-xl border border-gray-200 overflow-hidden">
              <img src={avatar} alt="User" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight truncate max-w-[200px]">{user?.email}</p>
              <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Worker Account</p>
            </div>
          </div>
        </div>

        {/* Due Balance Warning & Block Banners */}
        {profile?.isApplyBlocked ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm animate-pulse">
            <div className="p-3 bg-red-100 text-red-600 rounded-xl shrink-0">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="text-red-700 font-bold mb-1 text-lg">Account Blocked — Action Required</h3>
              <p className="text-sm text-red-600 mb-4 font-medium">Your due balance (৳{profile.dueBalance}) has exceeded the limit. You cannot apply to new jobs until dues are cleared.</p>
              <Link to="/earnings" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors shadow-sm">Pay Dues Now</Link>
            </div>
          </div>
        ) : profile?.dueBalance > 0 ? (
          <div className="bg-green-50 border border-brand-light rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm">
            <div className="p-3 bg-brand-light text-brand-hover rounded-xl shrink-0">
              <i className="fas fa-wallet text-2xl"></i>
            </div>
            <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-brand-hover font-bold mb-1 text-lg">Pending Platform Due</h3>
                <p className="text-sm text-brand-hover font-medium">You have an outstanding balance of <strong>৳{profile.dueBalance}</strong>. Pay anytime from your Earnings page.</p>
              </div>
              <Link to="/earnings" className="shrink-0 bg-brand hover:bg-brand-hover text-white font-bold px-6 py-2.5 rounded-lg transition-colors shadow-sm text-center">View & Pay</Link>
            </div>
          </div>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Active Jobs', val: kpis.activeCount, icon: 'fa-briefcase', color: 'bg-brand' },
            { label: 'Completed Jobs', val: kpis.completedCount, icon: 'fa-check-double', color: 'bg-brand/90' },
            { label: 'Total Earnings', val: `৳ ${kpis.totalEarnings.toLocaleString()}`, icon: 'fa-wallet', color: 'bg-brand/80' },
            { label: 'Response Rate', val: `${kpis.responseRate}%`, icon: 'fa-bolt', color: 'bg-brand/70' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${stat.color} shadow-lg shadow-brand/10`}>
                <i className={`fas ${stat.icon} text-lg`}></i>
              </div>
              <div>
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { title: 'Find New Jobs', desc: 'Browse available jobs and send applications to clients.', icon: 'fa-search', path: '/jobs' },
            { title: 'My Applications', desc: 'Track the status of your sent applications and job offers.', icon: 'fa-file-alt', path: '/dashboard/applications' },
            { title: 'Edit Profile', desc: 'Update your skills, experience, and contact information.', icon: 'fa-user-edit', path: '/edit-profile' }
          ].map((action, i) => (
            <Link key={i} to={action.path} className="group">
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-brand-light text-center flex flex-col items-center h-full">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-brand-hover mb-6 transition-colors group-hover:bg-brand group-hover:text-white">
                  <i className={`fas ${action.icon} text-2xl`}></i>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-brand-hover transition-colors">{action.title}</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recommended Jobs */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-gray-900">Recommended Jobs</h2>
            <Link to="/jobs" className="bg-brand hover:bg-brand-hover text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-brand/20">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-search text-3xl text-gray-300"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600 font-medium mb-8">There are no open jobs at the moment. Check back later!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredJobs.map((job) => (
                <JobCard key={job.mongoId || job.id || job._id?.$oid || job._id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
