// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import { useDarkMode } from '../contexts/DarkModeContext';
import JobRecommendations from '../components/JobRecommendations';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// safe, defensive tokenizer used for "near you" matching
function tokens(s = '') {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

export default function Dashboard() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;
  const { isDarkMode } = useDarkMode();

  const stats = [
    { label: 'Jobs Applied', value: 6, icon: 'fas fa-briefcase' },
    { label: 'Active Orders', value: 2, icon: 'fas fa-box' },
    { label: 'Reviews', value: 10, icon: 'fas fa-star' },
  ];

  const [jobData, setJobData] = useState([]);
  const [myApps, setMyApps] = useState([]); // worker-specific applications
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState(1);
  const [reportRange, setReportRange] = useState('weekly'); // 'weekly' | 'monthly'

  const [filters, setFilters] = useState({
    category: 'All',
    location: 'All',   // will be replaced with Address Line 1 or city after profile loads
    budget: 'All',
    applicants: 'All',
    search: '',
  });

  const JOBS_PER_PAGE = 6; // Show 6 jobs per page in dashboard

  /* Load worker profile (to suggest Address Line 1) */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/users/${uid}`);
        setProfile(data || {});
        const suggestedLoc =
          (data?.address1 && data.address1.trim()) ||
          (data?.city && data.city.trim()) ||
          'All';
        if (suggestedLoc && suggestedLoc !== 'All') {
          setFilters((prev) => ({ ...prev, location: suggestedLoc }));
        }
      } catch (e) {
        console.warn('Could not load user profile for location suggestion:', e);
      }
    })();
  }, [uid]);

  /* Load jobs */
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

  /* Load my applications (per-user metrics) */
  useEffect(() => {
    if (!uid) { setMyApps([]); return; }
    let ignore = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/my-applications/${uid}`, {
          headers: { Accept: 'application/json' },
        });
        if (!ignore) setMyApps(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('❌ Failed to load my applications:', e?.response?.data || e.message);
        if (!ignore) setMyApps([]);
      }
    })();
    return () => { ignore = true; };
  }, [uid]);

  /* ---------- Metrics & Reports ---------- */
  // Normalize date from job object
  const parseJobDate = (job) => {
    // prefer createdAt; fallback to date string
    const createdAt = job?.createdAt;
    if (createdAt) return new Date(createdAt);
    if (job?.date) return new Date(job.date);
    return null;
  };

  // Derive KPIs from available data
  const kpis = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const normalized = (myApps || []).map(a => ({
      status: (a.status || 'pending').toLowerCase(),
      createdAt: a.createdAt || a.updatedAt || a.appliedAt || a.acceptedAt || a.completedAt || null,
      payout: a.payout ?? a.earning ?? a.price ?? a.budget ?? 0,
    }));

    const completed = normalized.filter(a => a.status === 'completed');
    const active = normalized.filter(a => a.status === 'accepted' || a.status === 'active');

    const totalEarnings = completed.reduce((sum, a) => sum + (Number(a.payout) || 0), 0);
    const completedThisWeek = completed.filter(a => a.createdAt && new Date(a.createdAt) >= startOfWeek).length;

    // Response Rate = accepted / total applications (simple approximation)
    const accepted = normalized.filter(a => a.status === 'accepted').length;
    const applied = Math.max(1, normalized.length);
    const responseRate = Math.min(100, Math.round((accepted / applied) * 100));

    return {
      activeCount: active.length,
      completedCount: completed.length,
      totalEarnings,
      completedThisWeek,
      responseRate,
    };
  }, [myApps]);

  // Build data series for charts: jobs completed and earnings by week/month
  function groupByKey(items, keyFn) {
    const map = new Map();
    for (const item of items) {
      const key = keyFn(item);
      if (!key) continue;
      map.set(key, (map.get(key) || []).concat(item));
    }
    return map;
  }

  const report = useMemo(() => {
    const completed = (myApps || [])
      .filter(a => (a.status || '').toLowerCase() === 'completed')
      .map(a => ({
        createdAt: a.createdAt || a.updatedAt || a.completedAt || a.acceptedAt || null,
        payout: a.payout ?? a.earning ?? a.price ?? a.budget ?? 0,
      }));

    if (reportRange === 'monthly') {
      // last 6 months
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });

      const groups = groupByKey(completed, j => {
        const d = j.createdAt ? new Date(j.createdAt) : null;
        if (!d) return null;
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });

      const series = months.map(m => {
        const list = groups.get(m) || [];
        const jobs = list.length;
        const earnings = list.reduce((s, j) => s + Number(j.payout || 0), 0);
        return { label: m, jobs, earnings };
      });
      return series;
    }

    // weekly: last 8 weeks
    const now = new Date();
    const startOfWeek = (d) => {
      const c = new Date(d);
      c.setDate(c.getDate() - c.getDay());
      c.setHours(0, 0, 0, 0);
      return c;
    };
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (7 * (7 - i)));
      const s = startOfWeek(d);
      const iso = s.toISOString().slice(0, 10);
      return iso;
    });

    const groups = groupByKey(completed, j => {
      const d = j.createdAt ? new Date(j.createdAt) : null;
      if (!d) return null;
      return startOfWeek(d).toISOString().slice(0, 10);
    });

    const series = weeks.map(w => {
      const list = groups.get(w) || [];
      const jobs = list.length;
      const earnings = list.reduce((s, j) => s + Number(j.payout || 0), 0);
      return { label: w, jobs, earnings };
    });
    return series;
  }, [myApps, reportRange]);

  // Mini bar chart without external deps
  const MiniBar = ({ data, metric }) => {
    const max = Math.max(1, ...data.map(d => d[metric] || 0));
    return (
      <div className="w-full">
        <div className="flex items-end gap-2 h-32">
          {data.map((d, i) => {
            const value = d[metric] || 0;
            const height = Math.max(4, Math.round((value / max) * 112)); // 28 * 4px
            return (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-primary-500/80 dark:bg-primary-400/80 rounded-t"
                  style={{ height }}
                  title={`${d.label}: ${value}`}
                />
                <div className="mt-2 text-[10px] text-base-content opacity-60 truncate w-full text-center">
                  {reportRange === 'weekly' ? d.label.slice(5) : d.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* Dropdown options */
  const categories = useMemo(() => {
    const set = new Set(['All']);
    jobData.forEach((j) => j?.category && set.add(j.category));
    return Array.from(set);
  }, [jobData]);

  const baseLocations = useMemo(() => {
    const set = new Set(['All']);
    jobData.forEach((j) => j?.location && set.add(j.location));
    return Array.from(set);
  }, [jobData]);

  // Ensure Address Line 1 is present in the list so <select value> can show it
  const locations = useMemo(() => {
    const list = [...baseLocations];
    const addr1 = (profile?.address1 || '').trim();
    if (addr1 && !list.includes(addr1)) list.splice(1, 0, addr1);
    return list;
  }, [baseLocations, profile?.address1]);

  /* Filtering */
  const filteredJobs = useMemo(() => {
    const selectedLoc = (filters.location || '').trim();
    const isAddr1Selected =
      selectedLoc &&
      profile?.address1 &&
      selectedLoc.toLowerCase() === profile.address1.toLowerCase();

    const addrTokens = isAddr1Selected ? tokens(profile.address1) : [];

    return jobData
      .filter((job) => (job.status || 'active').toLowerCase() === 'active')
      .filter((job) => {
        // Category
        const matchCategory =
          filters.category === 'All' || job.category === filters.category;

        // Location
        let matchLocation = true;
        if (filters.location !== 'All') {
          if (isAddr1Selected) {
            // partial/nearby match using tokens from Address Line 1
            const haystack = [
              job.location,
              job.city,
              job.address1,
              job.address2,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            matchLocation = addrTokens.some((t) => haystack.includes(t));
          } else {
            // exact dropdown match (case-insensitive)
            matchLocation =
              (job.location || '').trim().toLowerCase() === selectedLoc.toLowerCase();
          }
        }

        // Budget
        const b = Number(job.budget) || 0;
        const matchBudget =
          filters.budget === 'All' ||
          (filters.budget === '0-500' && b <= 500) ||
          (filters.budget === '501-1000' && b > 500 && b <= 1000) ||
          (filters.budget === '1001+' && b > 1000);

        // Applicants
        const apps = job.applicants?.length || 0;
        const matchApplicants =
          filters.applicants === 'All' ||
          (filters.applicants === 'With' && apps > 0) ||
          (filters.applicants === 'None' && apps === 0);

        // Search
        const q = (filters.search || '').trim().toLowerCase();
        const matchSearch = !q || (job.title || '').toLowerCase().includes(q);

        return (
          matchCategory &&
          matchLocation &&
          matchBudget &&
          matchApplicants &&
          matchSearch
        );
      });
  }, [jobData, filters, profile?.address1]);

  // Pagination logic
  const pageCount = Math.ceil(filteredJobs.length / JOBS_PER_PAGE);
  const paginatedJobs = useMemo(() => {
    const startIndex = (page - 1) * JOBS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [filteredJobs, page, JOBS_PER_PAGE]);

  const handleChange = (type, value) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
    setPage(1); // Reset to first page when filters change
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Card */}
          <div className="text-center mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-base-content mb-4">
              Welcome back, Worker! 👋
            </h1>
            <p className="text-xl text-base-content opacity-80 max-w-2xl mx-auto">
              Ready to find your next job opportunity? Discover amazing local jobs that match your skills.
            </p>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content opacity-70 mb-1">Active Jobs</p>
                  <p className="text-3xl font-heading font-bold text-base-content">{kpis.activeCount}</p>
                </div>
                <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-full">
                  <i className="fas fa-briefcase text-primary-600 dark:text-primary-400 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.05s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content opacity-70 mb-1">Completed (Total)</p>
                  <p className="text-3xl font-heading font-bold text-base-content">{kpis.completedCount}</p>
                </div>
                <div className="p-3 bg-primary/20 rounded-full">
                  <i className="fas fa-check-circle text-primary text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content opacity-70 mb-1">Earnings</p>
                  <p className="text-3xl font-heading font-bold text-base-content">৳{kpis.totalEarnings}</p>
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                  <i className="fas fa-coins text-yellow-600 dark:text-yellow-400 text-xl" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-base-content opacity-70 mb-1">Response Rate</p>
                  <p className="text-3xl font-heading font-bold text-base-content">{kpis.responseRate}%</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <i className="fas fa-reply text-blue-600 dark:text-blue-400 text-xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-heading font-semibold text-base-content">Performance Report</h3>
                <p className="text-sm text-base-content opacity-70">Overview of completed jobs and earnings</p>
              </div>
              <div className="join">
                <button className={`join-item btn btn-sm ${reportRange === 'weekly' ? 'btn-primary text-white' : ''}`} onClick={() => setReportRange('weekly')}>Weekly</button>
                <button className={`join-item btn btn-sm ${reportRange === 'monthly' ? 'btn-primary text-white' : ''}`} onClick={() => setReportRange('monthly')}>Monthly</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-medium text-base-content opacity-80 mb-2">Jobs Completed</p>
                {report.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-base-content opacity-60">No data</div>
                ) : (
                  <MiniBar data={report} metric="jobs" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-base-content opacity-80 mb-2">Earnings</p>
                {report.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-base-content opacity-60">No data</div>
                ) : (
                  <MiniBar data={report} metric="earnings" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Link to="/edit-profile" className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-user-edit text-blue-600 dark:text-blue-400 text-xl"></i>
              </div>
              <h3 className="font-heading font-semibold text-base-content mb-1">Edit Profile</h3>
              <p className="text-sm text-base-content opacity-70">Update your info</p>
            </div>
          </Link>
          
          <Link to="/jobs" className="group bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-search text-white text-xl"></i>
              </div>
              <h3 className="font-heading font-semibold text-white mb-1">Browse Jobs</h3>
              <p className="text-sm text-white/80">Find opportunities</p>
            </div>
          </Link>
          
          <Link to="/applications" className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-file-alt text-orange-600 dark:text-orange-400 text-xl"></i>
              </div>
              <h3 className="font-heading font-semibold text-base-content mb-1">Applications</h3>
              <p className="text-sm text-base-content opacity-70">Track your apps</p>
            </div>
          </Link>
          
          <Link to="/orders" className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <i className="fas fa-shopping-bag text-purple-600 dark:text-purple-400 text-xl"></i>
              </div>
              <h3 className="font-heading font-semibold text-base-content mb-1">My Orders</h3>
              <p className="text-sm text-base-content opacity-70">View your work</p>
            </div>
          </Link>
        </div>

      {/* Availability Toggle */}
      <div className="mb-10">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="toggle toggle-success" />
          <span className="text-sm text-base-content opacity-80 font-medium">Available for work</span>
        </label>
      </div>

      {/* Job Recommendations */}
      <div className="mb-10">
        <JobRecommendations limit={5} />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-base-content mb-4">📢 New Jobs Near You</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Category</label>
            <select
              className="select select-bordered w-full"
              value={filters.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Location (defaults to Address Line 1) */}
          <div>
            <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Location</label>
            <select
              className="select select-bordered w-full"
              value={filters.location}
              onChange={(e) => handleChange('location', e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Budget</label>
            <select
              className="select select-bordered w-full"
              value={filters.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
            >
              <option value="All">All Budgets</option>
              <option value="0-500">৳0–500</option>
              <option value="501-1000">৳501–1000</option>
              <option value="1001+">৳1001+</option>
            </select>
          </div>

          {/* Applicants */}
          <div>
            <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Applicants</label>
            <select
              className="select select-bordered w-full"
              value={filters.applicants}
              onChange={(e) => handleChange('applicants', e.target.value)}
            >
              <option value="All">All Jobs</option>
              <option value="With">With Applicants</option>
              <option value="None">No Applicants</option>
            </select>
          </div>

          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Search by Title</label>
            <input
              type="text"
              placeholder="Search..."
              className="input input-bordered w-full"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
        </div>

        {/* Enhanced Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {paginatedJobs.map((job, index) => {
            const jobId =
              (typeof job._id === 'string' && job._id) ||
              (job._id && job._id.$oid) ||
              job.id;

            return (
              <div 
                key={jobId} 
                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image with Overlay */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={job.images?.[0] || 'https://via.placeholder.com/300x200'}
                    alt={job.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {job.category}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-heading font-bold text-base-content mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {job.title}
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-base-content opacity-80">
                      <i className="fas fa-map-marker-alt w-4 h-4 mr-3 text-primary-500"></i>
                      <span className="text-sm">{job.location}</span>
                    </div>
                    <div className="flex items-center text-base-content opacity-80">
                      <i className="fas fa-tag w-4 h-4 mr-3 text-primary-500"></i>
                      <span className="text-sm">{job.category}</span>
                    </div>
                    <div className="flex items-center text-base-content opacity-60">
                      <i className="fas fa-calendar w-4 h-4 mr-3 text-primary-500"></i>
                      <span className="text-sm">Posted: {job.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-heading font-bold text-primary-600 dark:text-primary-400">৳{job.budget}</span>
                      {job.applicants?.length > 0 && (
                        <span className="text-sm text-base-content opacity-60">
                          {job.applicants.length} applicants
                        </span>
                      )}
                    </div>
                  </div>

                  {job.applicants?.length > 0 && (
                    <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                      <p className="text-sm font-semibold text-base-content opacity-80 mb-3 flex items-center">
                        <i className="fas fa-users w-4 h-4 mr-2 text-primary-500"></i>
                        Recent Applicants:
                      </p>
                      <ul className="space-y-2">
                        {job.applicants.slice(0, 2).map((a, i) => (
                          <li key={i} className="flex justify-between items-center text-sm">
                            <span className="text-base-content opacity-80 font-medium">✅ {a.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-primary-600 dark:text-primary-400 font-semibold">৳{a.price}</span>
                              <div className="flex items-center">
                                <i className="fas fa-star text-yellow-400 w-3 h-3 mr-1"></i>
                                <span className="text-base-content opacity-70">{a.rating}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Button */}
                  <Link 
                    to={`/jobs/${jobId}`} 
                    className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-heading font-semibold py-3 px-6 rounded-xl transition-all duration-200 group-hover:shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>View Details</span>
                    <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex justify-center mt-8">
            <div className="join">
              <button
                className="join-item btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                «
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter(p => {
                  // Show first, last, current, and neighbors
                  return p === 1 || p === pageCount || (p >= page - 1 && p <= page + 1);
                })
                .map((p, idx, arr) => {
                  // Add ellipsis if there's a gap
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <button className="join-item btn btn-disabled" disabled>
                          ...
                        </button>
                      )}
                      <button
                        className={`join-item btn ${page === p ? 'btn-active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
              <button
                className="join-item btn"
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
              >
                »
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
