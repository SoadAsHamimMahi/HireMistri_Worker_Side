// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import { 
  MdDashboard, 
  MdWork, 
  MdPayments, 
  MdEvent, 
  MdSettings, 
  MdLogout, 
  MdSearch, 
  MdNotifications, 
  MdMail, 
  MdStar, 
  MdAssignment, 
  MdTaskAlt, 
  MdAccountBalanceWallet, 
  MdSpeed, 
  MdPerson, 
  MdManageSearch,
  MdAssignmentTurnedIn,
  MdShoppingBag,
  MdLocationOn,
  MdGroup,
  MdSchedule,
  MdChevronLeft,
  MdChevronRight,
  MdConstruction
} from 'react-icons/md';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Dashboard() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;

  const [jobData, setJobData] = useState([]);
  const [myApps, setMyApps] = useState([]); 
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState(1);
  const [reportRange, setReportRange] = useState('weekly'); 
  const [isAvailable, setIsAvailable] = useState(true);
  const [reviews, setReviews] = useState([]);

  const JOBS_PER_PAGE = 6;

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
        const res = await axios.get(`${API_BASE}/api/browse-jobs`);
        setJobData(res.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch browse jobs:', err);
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

    // Fetch reviews
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

  const report = useMemo(() => {
    const mockLabels = reportRange === 'weekly' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return mockLabels.map((l) => ({ label: l, value: Math.floor(Math.random() * 80) + 20 }));
  }, [reportRange]);

  const filteredJobs = useMemo(() => {
    return jobData.filter((job) => (job.status || 'active').toLowerCase() === 'active');
  }, [jobData]);

  const pageCount = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const startIndex = (page - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [filteredJobs, page]);

  return (
    <div className="text-white font-['Inter']">
        <div className="p-8">
          {/* Due Balance Warning & Block Banners */}
          {profile?.isApplyBlocked ? (
            <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-6 flex items-start gap-4 animate-pulse">
              <div className="p-2 bg-red-500/20 text-red-500 rounded-full shrink-0">
                <MdNotifications className="text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-red-500 font-bold mb-1">Account Blocked — Action Required</h3>
                <p className="text-sm text-red-200/70 mb-3">Your due balance (৳{profile.dueBalance}) has exceeded the limit and your grace period has expired. You <strong>cannot apply to new jobs</strong> until dues are cleared.</p>
                <Link to="/earnings" className="inline-block bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Pay Dues Now →</Link>
              </div>
            </div>
          ) : profile?.dueBalance >= 200 ? (
            <div className="bg-amber-500/10 border border-amber-500/50 rounded-2xl p-4 mb-6 flex items-start gap-4">
              <div className="p-2 bg-amber-500/20 text-amber-500 rounded-full shrink-0">
                <MdNotifications className="text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-500 font-bold mb-1">⚠️ High Due Balance Warning</h3>
                <p className="text-sm text-amber-200/70 mb-3">Your due balance of <strong>৳{profile.dueBalance}</strong> is nearing the limit. Pay within 48 hours to avoid account restriction.</p>
                <Link to="/earnings" className="inline-block bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors">Clear Dues →</Link>
              </div>
            </div>
          ) : profile?.dueBalance > 0 ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6 flex items-start gap-4">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-full shrink-0">
                <MdAccountBalanceWallet className="text-xl" />
              </div>
              <div className="flex-1 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-blue-300 font-bold mb-0.5">Pending Platform Due</h3>
                  <p className="text-sm text-white/50">You have an outstanding balance of <strong className="text-white">৳{profile.dueBalance}</strong>. Pay anytime from your Earnings page.</p>
                </div>
                <Link to="/earnings" className="shrink-0 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors">View →</Link>
              </div>
            </div>
          ) : null}

          {/* Welcome Card */}
          <section className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-8 mb-8 flex items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-[#10b77f]/10 rounded-full blur-[120px] pointer-events-none"></div>
            
            <div className="flex items-center gap-6 relative z-10">
              <div className="h-20 w-20 rounded-full border border-[#10b77f]/20 p-1">
                <div className="h-full w-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${user?.photoURL || 'https://via.placeholder.com/100'})` }}></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.displayName || 'Worker'}!</h2>
                <div className="flex items-center gap-3 text-white/40 text-xs mb-3">
                  <span>{profile?.category || 'Expert Provider'}</span>
                  <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                  <span>{profile?.location || profile?.city || 'Dhaka, Bangladesh'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#10b77f]/20 text-[#10b77f] text-[10px] font-bold uppercase px-2 py-0.5 rounded">Top Rated</span>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <MdStar className="text-xs" /> 
                      {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length} reviews)
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-md p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative z-10">
              <div className="text-right">
                <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Availability Status</p>
                <p className="text-[#10b77f] text-xs font-bold mt-0.5">{isAvailable ? 'Open for new jobs' : 'Currently Busy'}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={isAvailable} onChange={() => setIsAvailable(!isAvailable)} />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10b77f]"></div>
              </label>
            </div>
          </section>
          
          {/* Due Balance & Restrictions Banners */}
          {(profile?.dueBalance > 0 || profile?.isApplyBlocked) && (
            <div className="mb-8 space-y-4">
              {profile?.isApplyBlocked ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-red-500/10 transition-all"></div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 shrink-0 shadow-lg shadow-red-500/10">
                      <MdConstruction className="text-2xl animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-red-500 font-bold text-lg">Account Restricted</h4>
                      <p className="text-white/60 text-sm mt-1 max-w-md">Your ability to apply for new jobs has been blocked because your due balance exceeds ৳1,000. Please clear your dues to resume working.</p>
                    </div>
                  </div>
                  <Link to="/earnings" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-xl shadow-red-500/20 hover:scale-[1.02] active:scale-95 shrink-0 relative z-10">
                    Clear Dues Now
                  </Link>
                </div>
              ) : profile?.dueBalance > 0 && (
                <div className="bg-[#10b77f]/5 border border-[#10b77f]/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b77f]/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-[#10b77f]/10 transition-all"></div>
                  <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-[#10b77f]/10 flex items-center justify-center text-[#10b77f] shrink-0">
                      <MdAccountBalanceWallet className="text-2xl" />
                    </div>
                    <div>
                      <h4 className="text-[#10b77f] font-bold text-lg">Outstanding Dues</h4>
                      <p className="text-white/60 text-sm mt-1 max-w-md">You have an outstanding balance of <span className="text-white font-bold">৳ {profile.dueBalance.toLocaleString()}</span>. Keep it below ৳1,000 to avoid account restrictions.</p>
                    </div>
                  </div>
                  <Link to="/earnings" className="bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 font-bold py-3 px-6 rounded-xl transition-all shrink-0 relative z-10">
                    View Wallet & Pay
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Stats Grid */}
          <section className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 hover:border-[#10b77f]/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Active Jobs</span>
                <MdAssignment className="text-[#10b77f] text-xl" />
              </div>
              <p className="text-2xl font-bold mb-1">{kpis.activeCount.toString().padStart(2, '0')}</p>
              <p className="text-[10px] text-[#10b77f] font-bold flex items-center gap-1">
                <span>↑</span> +2 this week
              </p>
            </div>
            
            <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 hover:border-[#10b77f]/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Completed Jobs</span>
                <MdTaskAlt className="text-[#10b77f] text-xl" />
              </div>
              <p className="text-2xl font-bold mb-1">{kpis.completedCount}</p>
              <p className="text-[10px] text-[#10b77f] font-bold flex items-center gap-1">
                <span>↑</span> +12% vs last month
              </p>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 hover:border-[#10b77f]/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Earnings</span>
                <MdAccountBalanceWallet className="text-[#10b77f] text-xl" />
              </div>
              <p className="text-2xl font-bold mb-1">৳ {kpis.totalEarnings.toLocaleString()}</p>
              <p className="text-[10px] text-[#10b77f] font-bold flex items-center gap-1">
                <span>↑</span> +8% increase
              </p>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-2xl p-5 hover:border-[#10b77f]/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wider">Response Rate</span>
                <MdSpeed className="text-[#10b77f] text-xl" />
              </div>
              <p className="text-2xl font-bold mb-1">{kpis.responseRate}%</p>
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider">No change</p>
            </div>
          </section>

          {/* Performance and Quick Actions */}
          <section className="grid grid-cols-12 gap-6 mb-12">
            <div className="col-span-8 bg-[#151515] border border-white/5 rounded-[1.5rem] p-8 relative">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold">Earnings Performance</h3>
                <div className="bg-white/[0.03] p-1 rounded-xl flex border border-white/5">
                  <button 
                    onClick={() => setReportRange('weekly')}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${reportRange === 'weekly' ? 'bg-[#10b77f] text-white' : 'text-white/40'}`}
                  >
                    Weekly
                  </button>
                  <button 
                    onClick={() => setReportRange('monthly')}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${reportRange === 'monthly' ? 'bg-[#10b77f] text-white' : 'text-white/40'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              <div className="flex items-end justify-between h-36 gap-4 px-2">
                {report.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div className="w-full bg-[#10b77f]/10 rounded-t-lg transition-all group-hover:bg-[#10b77f]/30 relative" style={{ height: `${d.value}%` }}>
                      <div className="absolute inset-x-0 top-0 h-1 bg-[#10b77f] rounded-t-lg opacity-40"></div>
                    </div>
                    <span className="mt-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-4 grid grid-cols-2 gap-4">
              <Link to="/edit-profile" className="bg-[#151515] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[#10b77f]/5 transition-all group">
                <div className="p-3 rounded-full bg-[#10b77f]/10 text-[#10b77f] group-hover:scale-110 transition-transform">
                  <MdPerson className="text-xl" />
                </div>
                <span className="text-[11px] font-bold text-white/70">Edit Profile</span>
              </Link>
              <Link to="/jobs" className="bg-[#151515] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[#10b77f]/5 transition-all group">
                <div className="p-3 rounded-full bg-[#10b77f]/10 text-[#10b77f] group-hover:scale-110 transition-transform">
                  <MdSearch className="text-xl" />
                </div>
                <span className="text-[11px] font-bold text-white/70">Browse Jobs</span>
              </Link>
              <Link to="/dashboard/applications" className="bg-[#151515] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[#10b77f]/5 transition-all group">
                <div className="p-3 rounded-full bg-[#10b77f]/10 text-[#10b77f] group-hover:scale-110 transition-transform">
                  <MdAssignmentTurnedIn className="text-xl" />
                </div>
                <span className="text-[11px] font-bold text-white/70">Applications</span>
              </Link>
              <Link to="/dashboard/orders" className="bg-[#151515] border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-[#10b77f]/5 transition-all group">
                <div className="p-3 rounded-full bg-[#10b77f]/10 text-[#10b77f] group-hover:scale-110 transition-transform">
                  <MdShoppingBag className="text-xl" />
                </div>
                <span className="text-[11px] font-bold text-white/70">My Orders</span>
              </Link>
            </div>
          </section>

          {/* Client Reviews Section */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Client Reviews & Ratings</h3>
                <p className="text-white/30 text-xs mt-0.5">What people are saying about your service</p>
              </div>
            </div>
            {reviews.length === 0 ? (
              <div className="bg-[#151515] border border-white/5 rounded-2xl p-8 text-center">
                <MdStar className="text-4xl text-white/10 mx-auto mb-3" />
                <p className="font-bold text-white/50 mb-1">No reviews yet</p>
                <p className="text-xs text-white/30">Complete jobs to start collecting client ratings.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {reviews.slice(0, 6).map((rev, idx) => (
                  <div key={idx} className="bg-[#151515] border border-white/5 rounded-2xl p-5 hover:border-[#10b77f]/20 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <MdStar key={s} className={`text-sm ${s <= rev.rating ? 'text-amber-500' : 'text-white/10'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-white/30">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-white/70 italic mb-4 line-clamp-3">"{rev.comment}"</p>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold uppercase">
                        {rev.clientName ? rev.clientName[0] : 'C'}
                      </div>
                      <span className="truncate">{rev.clientName || 'Anonymous Client'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recommended Jobs */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold">Recommended Jobs</h3>
                <p className="text-white/30 text-xs mt-0.5">{filteredJobs.length} jobs available for you</p>
              </div>
              <Link to="/jobs" className="text-[#1ec86d] text-xs font-bold hover:underline flex items-center gap-1">
                View All Jobs <MdChevronRight className="text-base" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedJobs.map((job) => {
                const jobId = job._id?.$oid || job._id || job.id;
                const coverImage = Array.isArray(job.images) && job.images.length > 0 ? job.images[0] : null;
                return (
                  <div key={jobId} className="bg-[#151515] border border-white/5 rounded-2xl overflow-hidden hover:border-[#1ec86d]/30 hover:shadow-lg hover:shadow-[#1ec86d]/5 transition-all flex flex-col group">

                    {/* Cover image / placeholder banner */}
                    <div className="relative h-36 overflow-hidden bg-[#0f0f0f] shrink-0">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={job.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1ec86d]/10 via-[#0f0f0f] to-[#0a0a0a]">
                          <MdConstruction className="text-5xl text-[#1ec86d]/20" />
                        </div>
                      )}
                      {/* Budget badge */}
                      <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-black px-2.5 py-1 rounded-lg">
                        ৳ {Number(job.budget)?.toLocaleString() || job.budget}
                      </span>
                      {/* Category badge */}
                      <span className="absolute bottom-3 left-3 bg-[#1ec86d]/20 text-[#1ec86d] text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider backdrop-blur-sm border border-[#1ec86d]/20">
                        {job.category}
                      </span>
                    </div>

                    {/* Card body */}
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="text-sm font-bold mb-3 flex-1 group-hover:text-[#1ec86d] transition-colors line-clamp-2 leading-snug">
                        {job.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white/30 text-[10px] mb-4">
                        <span className="flex items-center gap-1">
                          <MdLocationOn className="text-xs shrink-0" />
                          <span className="truncate max-w-[120px]">{job.location || 'N/A'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MdGroup className="text-xs shrink-0" />
                          {job.applicants?.length || 0} applied
                        </span>
                        <span className="flex items-center gap-1">
                          <MdSchedule className="text-xs shrink-0" />
                          2h ago
                        </span>
                      </div>
                      <Link
                        to={`/jobs/${jobId}`}
                        className="w-full bg-[#1ec86d] text-black font-black py-2.5 rounded-xl text-center hover:bg-[#19b363] transition-all text-[10px] uppercase tracking-widest"
                      >
                        Apply Now
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pageCount > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                  disabled={page === 1}
                >
                  <MdChevronLeft className="text-xl" />
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(pageCount)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`h-8 w-8 text-xs font-bold rounded-full transition-all ${page === i + 1 ? 'bg-[#1ec86d] text-black' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                  disabled={page === pageCount}
                >
                  <MdChevronRight className="text-xl" />
                </button>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="pt-8 border-t border-white/5 flex items-center justify-between text-white/20 text-[9px] uppercase tracking-widest font-bold">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[#1ec86d]">
                <MdConstruction className="text-xs" />
                <span>Hire Mistri Worker Portal</span>
              </div>
              <div className="flex items-center gap-6 lowercase">
                <Link to="/support" className="hover:text-white">Support Center</Link>
                <Link to="/terms" className="hover:text-white">Terms of Service</Link>
                <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
                <Link to="/trust" className="hover:text-white">Trust & Safety</Link>
              </div>
            </div>
            <span>© 2024 Hire Mistri Ltd.</span>
          </footer>
        </div>
    </div>
  );
}
