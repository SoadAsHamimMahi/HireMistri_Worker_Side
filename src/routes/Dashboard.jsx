// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import Pagination from '@mui/material/Pagination';
import { useDarkMode } from '../contexts/DarkModeContext';

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
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState(1);

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
    <div className="p-6 w-5/6 mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Hi, Worker! 👋</h2>
        <p className="text-gray-600 dark:text-gray-300">Welcome back. Ready to find new jobs today?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <i className={`${stat.icon} text-green-500 text-2xl`} />
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white">{stat.value}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link to="/edit-profile" className="btn btn-outline border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Edit Profile
        </Link>
        <Link to="/jobs" className="btn bg-green-500 text-white hover:bg-green-600">
          Browse Jobs
        </Link>
        <Link to="/applications" className="btn btn-outline border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          Applications
        </Link>
        <Link to="/orders" className="btn btn-outline border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
          My Orders
        </Link>
      </div>

      {/* Availability Toggle */}
      <div className="mb-10">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="toggle toggle-success" />
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Available for work</span>
        </label>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">📢 New Jobs Near You</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Category</label>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Location</label>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Budget</label>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Applicants</label>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Search by Title</label>
            <input
              type="text"
              placeholder="Search..."
              className="input input-bordered w-full"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
        </div>

        {/* Jobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedJobs.map((job) => {
            const jobId =
              (typeof job._id === 'string' && job._id) ||
              (job._id && job._id.$oid) ||
              job.id;

            return (
              <div key={jobId} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
                <img
                  src={job.images?.[0] || 'https://via.placeholder.com/300x200'}
                  alt={job.title}
                  className="w-full h-40 object-cover"
                />
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{job.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">📍 {job.location}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">📂 {job.category}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">🗓️ Posted on: {job.date}</p>
                  <span className="text-green-600 font-semibold text-sm">৳{job.budget}</span>

                  {job.applicants?.length > 0 && (
                    <div className="mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-md border dark:border-gray-600">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">👷 Applicants:</p>
                      <ul className="text-sm space-y-1">
                        {job.applicants.map((a, i) => (
                          <li key={i} className="flex justify-between">
                            <span className="text-gray-700 dark:text-gray-300">✅ {a.name}</span>
                            <span className="text-gray-600 dark:text-gray-400">৳{a.price} – ⭐ {a.rating}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Link
                    to={`/jobs/${jobId}`}
                    className="btn btn-sm bg-green-500 text-white hover:bg-green-600 mt-3 w-full text-center"
                  >
                    Apply
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex justify-center mt-8">
            <Pagination
              count={pageCount}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              siblingCount={1}
              boundaryCount={1}
              sx={{
                '& .MuiPaginationItem-root': {
                  color: isDarkMode ? 'white' : 'rgba(0, 0, 0, 0.87)',
                  '&.Mui-selected': {
                    backgroundColor: '#10b981',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#059669',
                    },
                  },
                  '&:hover': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                  },
                },
                '& .MuiPaginationItem-icon': {
                  color: isDarkMode ? 'white' : 'rgba(0, 0, 0, 0.87)',
                },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
