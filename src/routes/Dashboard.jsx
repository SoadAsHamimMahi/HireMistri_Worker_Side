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

  const JOBS_PER_PAGE = 4;

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
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <MdStar className="text-xs" /> 4.9 (120 reviews)
                  </div>
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

          {/* Recommended Jobs */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Recommended Jobs</h3>
              <Link to="/jobs" className="text-[#10b77f] text-xs font-bold hover:underline">View All Jobs</Link>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {paginatedJobs.map((job) => {
                const jobId = job._id?.$oid || job._id || job.id;
                return (
                <div key={jobId} className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-6 hover:border-[#10b77f]/20 transition-all flex flex-col h-full group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-[#10b77f]/10 text-[#10b77f] text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wider">{job.category}</span>
                    <span className="text-lg font-black text-white">৳ {job.budget?.toLocaleString() || job.budget}</span>
                  </div>
                  <h4 className="text-base font-bold mb-6 flex-1 group-hover:text-[#10b77f] transition-colors">{job.title}</h4>
                  <div className="flex items-center gap-4 text-white/30 text-[10px] mb-6">
                    <div className="flex items-center gap-1.5">
                      <MdLocationOn className="text-xs" /> {job.location}
                    </div>
                    <div className="flex items-center gap-1.5 border-x border-white/5 px-4 h-3">
                      <MdGroup className="text-xs" /> {job.applicants?.length || 0} applicants
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MdSchedule className="text-xs" /> 2h ago
                    </div>
                  </div>
                  <Link to={`/jobs/${jobId}`} className="w-full bg-[#10b77f] text-white font-black py-3 rounded-xl text-center hover:bg-[#0da06f] transition-all text-xs uppercase tracking-widest">
                    Apply Now
                  </Link>
                </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pageCount > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20"
                  disabled={page === 1}
                >
                  <MdChevronLeft className="text-xl" />
                </button>
                <div className="flex items-center gap-1.5">
                  {[...Array(pageCount)].map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`h-8 w-8 text-xs font-bold rounded-full transition-all ${page === i + 1 ? 'bg-[#10b77f] text-white' : 'text-white/30 hover:text-white'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 disabled:opacity-20"
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
              <div className="flex items-center gap-2 text-[#10b77f]">
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
