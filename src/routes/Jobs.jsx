import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Pagination from '@mui/material/Pagination';
import { useDarkMode } from '../contexts/DarkModeContext';

const JOBS_PER_PAGE = 9;

const Jobs = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  const [jobData, setJobData] = useState([]);
  const [filters, setFilters] = useState({
    category: 'All',
    location: 'All',
    budget: 'All',
    applicants: 'All',
    search: '',
  });

  const [page, setPage] = useState(1);

  // Fetch jobs
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/browse-jobs');
        setJobData(res.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch jobs:', err);
      }
    })();
  }, []);

  // Dynamic filter options
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(jobData.map(j => j.category).filter(Boolean)))],
    [jobData]
  );

  const locations = useMemo(
    () => ['All', ...Array.from(new Set(jobData.map(j => j.location).filter(Boolean)))],
    [jobData]
  );

  // Apply filters
  const filteredJobs = useMemo(() => {
    const out = (jobData || [])
      .filter(j => (j.status || 'active').toLowerCase() === 'active')
      .filter(j => {
        const matchCategory = filters.category === 'All' || j.category === filters.category;
        const matchLocation = filters.location === 'All' || j.location === filters.location;
        const matchBudget =
          filters.budget === 'All' ||
          (filters.budget === '0-500' && Number(j.budget) <= 500) ||
          (filters.budget === '501-1000' && Number(j.budget) > 500 && Number(j.budget) <= 1000) ||
          (filters.budget === '1001+' && Number(j.budget) > 1000);
        const matchApplicants =
          filters.applicants === 'All' ||
          (filters.applicants === 'With' && (j.applicants?.length || 0) > 0) ||
          (filters.applicants === 'None' && (!j.applicants || j.applicants.length === 0));
        const q = filters.search.trim().toLowerCase();
        const matchSearch = !q || (j.title || '').toLowerCase().includes(q);

        return matchCategory && matchLocation && matchBudget && matchApplicants && matchSearch;
      });

    return out;
  }, [jobData, filters]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Slice for current page
  const pageCount = Math.max(1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE));
  const start = (page - 1) * JOBS_PER_PAGE;
  const currentJobs = filteredJobs.slice(start, start + JOBS_PER_PAGE);

  const handleChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-2xl font-bold flex items-center text-green-500 hover:underline"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">🛠️ Available Jobs</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
          <select
            className="select select-bordered w-full"
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
          >
            {categories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
          <select
            className="select select-bordered w-full"
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
          >
            {locations.map(loc => <option key={loc}>{loc}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Budget</label>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Applicants</label>
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

        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search by Title</label>
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered w-full"
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>
      </div>

      {/* Job Cards */}
      {currentJobs.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          No jobs match your filters.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentJobs.map(job => {
              const jobId =
                (typeof job._id === 'string' && job._id) ||
                (job._id && job._id.$oid) ||
                job.id;

              return (
                <div
                  key={jobId}
                  className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
                >
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

          {/* Pagination controls */}
          <div className="flex justify-center mt-8">
            {/* If you want a fixed 9 pages no matter what, use: <Pagination count={9} color="primary" /> */}
            <Pagination
              count={pageCount}          // total pages based on filteredJobs
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
        </>
      )}
    </div>
  );
};

export default Jobs;
