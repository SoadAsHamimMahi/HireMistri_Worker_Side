import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useDarkMode } from '../contexts/DarkModeContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import BookmarkButton from '../components/BookmarkButton';
import ShareButton from '../components/ShareButton';
import SearchHistory from '../components/SearchHistory';
import { useSearchHistory } from '../hooks/useSearchHistory';
import {
  MdSearch,
  MdFilterList,
  MdList,
  MdMap,
  MdLocationOn,
  MdPayments,
  MdShare,
  MdBookmark,
  MdBookmarkBorder,
  MdGroup,
  MdSchedule,
  MdChevronLeft,
  MdChevronRight,
  MdConstruction,
  MdNotifications,
  MdCheck,
  MdArrowBack
} from 'react-icons/md';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Relative time: "2 hours ago", "3 days ago"
function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  if (isNaN(d)) return 'Recently';
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return d.toLocaleDateString();
}

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const Jobs = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const [jobData, setJobData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [workerLocation, setWorkerLocation] = useState(null);
  const [filters, setFilters] = useState({
    category: 'All',
    categories: [],
    location: 'All',
    budgetMin: '',
    budgetMax: '',
    applicants: 'All',
    search: '',
    status: 'all',
    skills: [],
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest',
    useRadius: false,
    radius: 10,
    radiusLat: null,
    radiusLng: null,
  });
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (viewMode === 'map') {
      const t = setTimeout(() => setShowMap(true), 150);
      return () => {
        clearTimeout(t);
        setShowMap(false);
      };
    } else {
      setShowMap(false);
    }
  }, [viewMode]);

  const JOBS_PER_PAGE = 8;

  // Get all unique skills from job data
  const allSkills = useMemo(() => {
    const skillSet = new Set();
    jobData.forEach(job => {
      if (Array.isArray(job.skills)) {
        job.skills.forEach(skill => skillSet.add(skill));
      }
    });
    return Array.from(skillSet).sort();
  }, [jobData]);

  // Filters to params helper
  const buildQueryParams = () => {
    const params = {};
    if (filters.category && filters.category !== 'All') params.category = filters.category;
    if (filters.categories && filters.categories.length > 0) {
      params.categories = filters.categories.join(',');
    }
    if (filters.location && filters.location !== 'All') params.location = filters.location;
    if (filters.budgetMin) params.budgetMin = filters.budgetMin;
    if (filters.budgetMax) params.budgetMax = filters.budgetMax;
    if (filters.applicants && filters.applicants !== 'All') params.applicants = filters.applicants;
    if (filters.search && filters.search.trim() !== '') params.search = filters.search.trim();
    if (filters.status && filters.status !== 'All' && filters.status !== 'all') {
      params.status = filters.status;
    } else {
      params.status = 'all';
    }
    if (filters.skills && filters.skills.length > 0) {
      params.skills = filters.skills.join(',');
    }
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    if (filters.useRadius && filters.radiusLat && filters.radiusLng) {
      params.lat = filters.radiusLat;
      params.lng = filters.radiusLng;
      params.radius = filters.radius;
    }
    params.sort = filters.sortBy || 'newest';
    return params;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = buildQueryParams();
        const query = new URLSearchParams(params).toString();
        const res = await axios.get(`${API_BASE}/api/browse-jobs${query ? '?' + query : ''}`);
        setJobData(res.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch jobs:', err);
        setJobData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filters]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setWorkerLocation([pos.coords.latitude, pos.coords.longitude]),
      () => { },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  const categories = useMemo(
    () => ['All', 'Plumbing', 'Electrical', 'Masonry', 'Carpentry', 'Repair', 'Cleaning'],
    []
  );

  const locations = useMemo(
    () => ['All', 'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Gazipur', 'Narayanganj'],
    []
  );

  const pageCount = Math.max(1, Math.ceil(jobData.length / JOBS_PER_PAGE));
  const start = (page - 1) * JOBS_PER_PAGE;
  const currentJobs = jobData.slice(start, start + JOBS_PER_PAGE);

  const { saveSearch } = useSearchHistory();
  const saveSearchTimerRef = useRef(null);

  const handleChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  useEffect(() => {
    if (saveSearchTimerRef.current) clearTimeout(saveSearchTimerRef.current);
    saveSearchTimerRef.current = setTimeout(() => saveSearch(filters), 2000);
    return () => { if (saveSearchTimerRef.current) clearTimeout(saveSearchTimerRef.current); };
  }, [filters, saveSearch]);

  const handleSelectSearch = (savedFilters) => {
    setFilters(savedFilters);
    setPage(1);
  };

  useEffect(() => { setPage(1); }, [filters]);

  const getJobLatLng = (job) => {
    if (!job) return null;
    const lat = job.lat ?? job.latitude ?? job?.locationLat ?? job?.location?.lat ?? job?.coordinates?.lat;
    const lng = job.lng ?? job.longitude ?? job?.locationLng ?? job?.location?.lng ?? job?.coordinates?.lng;
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
    return null;
  };

  const jobsWithCoords = useMemo(() => jobData.filter(job => getJobLatLng(job) !== null), [jobData]);

  const mapCenter = useMemo(() => {
    if (jobsWithCoords.length > 0) {
      const coords = jobsWithCoords.map(j => getJobLatLng(j));
      const avgLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      return [avgLat, avgLng];
    }
    return workerLocation || [23.8103, 90.4125];
  }, [jobsWithCoords, workerLocation]);

  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  const formatRelativeTime = (date) => {
    if (!date) return 'Recently';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Recently';
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return d.toLocaleDateString();
  };

  const formatBudgetDisplay = (job) => {
    const min = job.budgetMin ?? job.budget;
    const max = job.budgetMax ?? job.budget;
    if (min != null && max != null && min !== max) {
      return `৳ ${Number(min).toLocaleString()} - ${Number(max).toLocaleString()}`;
    }
    if (job.budget != null) return `৳ ${Number(job.budget).toLocaleString()}`;
    return '৳ —';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-slate-100 font-['Inter'] selection:bg-primary/30">
      {/* Hero Section */}
      <section className="relative h-[320px] w-full overflow-hidden shrink-0">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=2070&auto=format&fit=crop')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-[#050505]/20"></div>
        <div className="relative flex h-full flex-col justify-center px-6 md:px-12 mx-auto w-full">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-primary text-sm font-bold mb-6 hover:translate-x-[-4px] transition-transform w-fit"
          >
            <MdArrowBack /> Back to Dashboard
          </button>
          <h1 className="text-4xl font-black text-white md:text-5xl lg:text-6xl tracking-tight">
            Find Your Next <span className="text-[#1ec86d]">Job</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400 font-medium">
            Connecting skilled mistris with the best opportunities across Bangladesh. Browse through {jobData.length}+ active listings today.
          </p>
          <div className="mt-8 flex gap-4">
            <button className="rounded-xl bg-[#1ec86d] px-8 py-3 font-bold text-[#050505] hover:scale-105 transition-transform shadow-lg shadow-primary/20">Get Started</button>
            <button className="rounded-xl bg-white/10 px-8 py-3 font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all border border-white/5">How it works</button>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="z-10 bg-[#050505]/80 backdrop-blur-md sticky top-0 border-b border-white/5">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-6 md:px-12">
          <div className="flex items-center gap-1 rounded-3xl border border-white/10 bg-[#1ec86d]/30 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 rounded-3xl px-4 py-2 text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-[#eeebeb]'}`}
            >
              <MdList className="text-xl" /> List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 rounded-3xl px-4 py-2 text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-slate-600 text-white' : 'text-[#eeebeb]'}`}
            >
              <MdMap className="text-xl" /> Map View
            </button>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-slate-100">
              Showing <span className="text-white font-bold">{jobData.length}</span> jobs in {filters.location === 'All' ? 'Bangladesh' : filters.location}
            </span>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 rounded-xl border border-primary/20 bg-[#121212] px-4 py-2 text-sm font-bold lg:hidden text-primary"
            >
              <MdFilterList className="text-xl" /> Filters
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full gap-8 px-6 py-10 md:px-12 flex-1">
        {/* Sidebar Filters */}
        <aside className={`fixed inset-0 z-50 lg:relative lg:inset-auto lg:block lg:w-72 shrink-0 transition-transform duration-300 ${showMobileFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileFilters(false)}></div>
          <div className="relative h-full lg:h-auto lg:sticky lg:top-24 flex flex-col gap-6 rounded-2xl border border-white/5 bg-[#121212] p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between lg:hidden mb-2">
              <h3 className="text-lg font-bold">Filters</h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 hover:bg-white/5 rounded-full"
              >
                <MdChevronLeft className="text-2xl" />
              </button>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-100">Search Keywords</h3>
              <div className="relative group">
                <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-100 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="e.g. Electrician, Roofer"
                  className="w-full rounded-3xl border-white/5 bg-[#050505] pl-10 pr-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-300 transition-all font-medium"
                  value={filters.search}
                  onChange={e => handleChange('search', e.target.value)}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-100">Category</h3>
              <div className="flex flex-col gap-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleChange('category', cat)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${filters.category === cat ? 'text-[#1ec86d]' : 'text-slate-100 hover:text-white'
                      }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${filters.category === cat ? 'border-[#1ec86d] !bg-[#1ec86d]' : 'border-slate-600 bg-transparent'
                      }`}
                    />
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-100">Budget Range (৳)</h3>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-1/2 rounded-3xl border-white/5 bg-[#050505] px-4 py-2.5 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-300 font-medium"
                  value={filters.budgetMin}
                  onChange={e => handleChange('budgetMin', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-1/2 rounded-3xl border-white/5 bg-[#050505] px-4 py-2.5 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary placeholder-slate-300 font-medium"
                  value={filters.budgetMax}
                  onChange={e => handleChange('budgetMax', e.target.value)}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-100">Location</h3>
              <div className="relative">
                <select
                  className="w-full rounded-3xl border-white/5 bg-[#050505] px-4 py-2.5 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary font-medium appearance-none cursor-pointer"
                  value={filters.location}
                  onChange={e => handleChange('location', e.target.value)}
                >
                  {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-100">
                  <MdChevronRight className="rotate-90" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-100">Sort By</h3>
              <div className="relative">
                <select
                  className="w-full rounded-3xl border-white/5 bg-[#050505] px-4 py-2.5 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary font-medium appearance-none cursor-pointer"
                  value={filters.sortBy}
                  onChange={e => handleChange('sortBy', e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  {filters.useRadius && workerLocation && <option value="distance">Distance (Nearest)</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-100">
                  <MdChevronRight className="rotate-90" />
                </div>
              </div>
            </div>

            {workerLocation && (
              <div>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-100">Distance Radius</h3>
                <div className="flex items-center gap-3 mb-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={filters.useRadius} onChange={e => handleChange('useRadius', e.target.checked)} />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <span className="text-sm font-medium text-slate-100">{filters.useRadius ? 'Within range' : 'Use radius'}</span>
                </div>
                {filters.useRadius && (
                  <div className="space-y-3 px-1 animate-in fade-in duration-300">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      value={filters.radius}
                      onChange={e => handleChange('radius', e.target.value)}
                    />
                    <div className="flex justify-between text-[10px] font-bold text-slate-100 uppercase">
                      <span>1km</span>
                      <span className="text-primary">{filters.radius}km</span>
                      <span>100km</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full rounded-3xl bg-[#1ec86d] py-3 text-sm font-bold text-[#050505] hover:bg-[#1ec86d]/90 transition-all shadow-lg shadow-[#1ec86d]/20"
              >
                Apply Filters
              </button>
              <button
                onClick={() => handleSelectSearch({ category: 'All', location: 'All', budgetMin: '', budgetMax: '', search: '', useRadius: false, sortBy: 'newest' })}
                className="w-full text-center py-2 text-sm font-medium text-slate-100 hover:text-primary transition-colors"
              >
                Reset all filters
              </button>
            </div>
          </div>
        </aside>

        {/* Job Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
              <p className="text-sm font-bold text-slate-100 uppercase tracking-widest">Searching tasks...</p>
            </div>
          ) : viewMode === 'list' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {currentJobs.map((job) => {
                  const jobId = (typeof job._id === 'string' && job._id) || (job._id && job._id.$oid) || job.id;
                  return (
                    <div key={jobId} className="group flex flex-col rounded-2xl border border-white/5 bg-[#111111] p-5 shadow-sm hover:border-primary/40 hover:shadow-primary/5 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                      {/* Card top: category badge + action icons */}
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="inline-flex items-center rounded-xl bg-[#1ec86d]/20 border border-[#1ec86d]/30 px-3 py-1 text-[10px] font-bold text-[#1ec86d] uppercase tracking-wider">{job.category}</span>
                        <div className="flex items-center gap-1">
                          <div className="text-slate-100 hover:text-primary transition-all">
                            <ShareButton jobId={jobId} jobTitle={job.title} jobDescription={job.description} />
                          </div>
                          <div className="text-slate-100 hover:text-primary transition-all"><BookmarkButton jobId={jobId} /></div>
                        </div>
                      </div>

                      {/* Job Title */}
                      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-2 min-h-[3rem] relative z-10 leading-snug">
                        {job.title}
                      </h3>

                      {/* Budget + Location */}
                      <div className="mt-3 flex flex-col gap-2 relative z-10">
                        <div className="flex items-center gap-2 text-sm">
                          <MdPayments className="text-primary text-base shrink-0" />
                          <span className="font-bold text-white">{formatBudgetDisplay(job)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <MdLocationOn className="text-primary text-base shrink-0" />
                          <span className="font-medium truncate">{job.location}</span>
                        </div>
                      </div>

                      {/* Footer meta */}
                      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4 relative z-10">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Posted</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">{formatRelativeTime(job.date || job.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Status</p>
                          <p className="text-xs font-bold text-primary flex items-center gap-1 justify-end mt-0.5">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full inline-block"></span>
                            {job.status?.toUpperCase() || 'ACTIVE'}
                          </p>
                        </div>
                      </div>

                      {/* CTA - solid green like Stitch design */}
                      <Link
                        to={`/jobs/${jobId}`}
                        className="mt-4 w-full rounded-3xl border border-[#1ec86d] py-3 font-bold text-[#1ec86d] hover:bg-[#1ec86d]/10 active:scale-[0.98] transition-all text-center text-sm block"
                      >
                        View Details
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12 pb-12">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-3 rounded-full bg-[#121212] border border-white/5 text-slate-100 hover:text-white disabled:opacity-20 transition-all shadow-xl"
                  >
                    <MdChevronLeft className="text-xl" />
                  </button>
                  <div className="flex items-center gap-2 px-6">
                    {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                      let p = i + 1;
                      if (pageCount > 5 && page > 3) p = page - 3 + i + 1;
                      if (p > pageCount) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${page === p ? 'bg-primary text-[#050505]' : 'bg-[#121212] text-slate-100 hover:text-white border border-white/5'}`}
                        >
                          {p.toString().padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="p-3 rounded-full bg-[#121212] border border-white/5 text-slate-100 hover:text-white disabled:opacity-20 transition-all shadow-xl"
                  >
                    <MdChevronRight className="text-xl" />
                  </button>
                </div>
              )}
            </>
          ) : (
            viewMode === 'map' && showMap && !loading && (
              <div key="map-wrapper" className="h-[740px] w-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-500">
                <div className="absolute top-6 left-6 z-[400] bg-[#121212]/90 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/10 shadow-2xl">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Live Map View</p>
                  <p className="text-sm font-black text-white">{jobsWithCoords.length} Positions Marked</p>
                </div>
                <JobMap
                  jobsWithCoords={jobsWithCoords}
                  mapCenter={mapCenter}
                  workerLocation={workerLocation}
                  getJobLatLng={getJobLatLng}
                />
              </div>
            )
          )}
        </div>
      </div>

      {/* Mid-Page CTA - Stitch style */}
      <section className="w-full bg-[#0a0a0a] border-y border-white/5 py-5">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 md:px-12">
          <p className="text-base font-bold text-white">Find work faster with Hire Mistri</p>
          <Link
            to="/dashboard"
            className="rounded-xl border-2 border-primary px-6 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 transition-all"
          >
            Your Job
          </Link>
        </div>
      </section>

      {/* Footer - Stitch style */}
      <footer className="mx-auto w-full px-6 md:px-12 py-12 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-[#050505]">
                <MdConstruction className="text-xl" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Hire Mistri</h2>
            </div>
            <p className="text-sm text-slate-100 font-medium">Get matched to nearby jobs in minutes. Apply directly, chat with clients, and build your reputation with verified reviews.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm text-slate-100">
              <li><Link to="/jobs" className="hover:text-primary transition-colors">Find Jobs</Link></li>
              <li><Link to="/dashboard/applications" className="hover:text-primary transition-colors">My Applications</Link></li>
              <li><Link to="/dashboard/orders" className="hover:text-primary transition-colors">My Orders</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">Support</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-100">
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/support" className="hover:text-primary transition-colors">Help Center</Link></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-white/5 text-[10px] uppercase tracking-[0.2em] font-black text-slate-100">
          <span>© 2024 Hire Mistri. All rights reserved.</span>
          <div className="flex gap-6">
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/support" className="hover:text-primary transition-colors">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Isolated Map Component to prevent "Map container already initialized"
const JobMap = ({ jobsWithCoords, mapCenter, workerLocation, getJobLatLng }) => {
  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      className="h-full w-full z-0"
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO'
      />
      {workerLocation && (
        <Marker position={workerLocation}>
          <Popup>
            <div className="text-center font-bold">You are here</div>
          </Popup>
        </Marker>
      )}
      {jobsWithCoords.map((job) => {
        const jobId = (typeof job._id === 'string' && job._id) || (job._id && job._id.$oid) || job.id;
        const coords = getJobLatLng(job);
        return (
          <Marker key={jobId} position={coords}>
            <Popup className="premium-popup">
              <div className="p-3 min-w-[220px]">
                <span className="text-[10px] font-black text-primary uppercase mb-2 block tracking-wider">{job.category}</span>
                <h4 className="font-bold text-sm mb-3 leading-tight text-white">{job.title}</h4>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                  <p className="text-sm font-black text-white">৳ {job.budget?.toLocaleString()}</p>
                  <span className="text-[10px] text-slate-100 font-bold uppercase">{job.location}</span>
                </div>
                <Link
                  to={`/jobs/${jobId}`}
                  className="block w-full py-2.5 bg-primary text-[#050505] rounded-xl text-center text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all"
                >
                  Explore Opportunity
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default Jobs;

