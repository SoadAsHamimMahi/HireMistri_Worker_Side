import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Jobs = () => {
  const navigate = useNavigate();

  const [jobData, setJobData] = useState([]);
  const [filters, setFilters] = useState({
    category: 'All',
    location: 'All',
    budget: 'All',
    applicants: 'All',
    search: '',
  });

  // ✅ Fetch jobs from backend
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/browse-jobs');
        setJobData(res.data);
      } catch (err) {
        console.error('❌ Failed to fetch jobs:', err);
      }
    };
    fetchJobs();
  }, []);

  // ✅ Dynamic filters
  const categories = ['All', ...new Set(jobData.map(job => job.category))];
  const locations = ['All', ...new Set(jobData.map(job => job.location))];

  // ✅ Apply filters
  const filteredJobs = jobData
    .filter(job => job.status === 'active')
    .filter(job => {
      const matchCategory = filters.category === 'All' || job.category === filters.category;
      const matchLocation = filters.location === 'All' || job.location === filters.location;
      const matchBudget =
        filters.budget === 'All' ||
        (filters.budget === '0-500' && job.budget <= 500) ||
        (filters.budget === '501-1000' && job.budget > 500 && job.budget <= 1000) ||
        (filters.budget === '1001+' && job.budget > 1000);
      const matchApplicants =
        filters.applicants === 'All' ||
        (filters.applicants === 'With' && job.applicants?.length > 0) ||
        (filters.applicants === 'None' && (!job.applicants || job.applicants.length === 0));
      const matchSearch =
        filters.search.trim() === '' ||
        job.title.toLowerCase().includes(filters.search.toLowerCase());

      return matchCategory && matchLocation && matchBudget && matchApplicants && matchSearch;
    });

  const handleChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 🔙 Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-2xl font-bold flex items-center text-green-500 hover:underline"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">🛠️ Available Jobs</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('category', e.target.value)}>
            {categories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Location</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('location', e.target.value)}>
            {locations.map(loc => <option key={loc}>{loc}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Budget</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('budget', e.target.value)}>
            <option value="All">All Budgets</option>
            <option value="0-500">৳0–500</option>
            <option value="501-1000">৳501–1000</option>
            <option value="1001+">৳1001+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Applicants</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('applicants', e.target.value)}>
            <option value="All">All Jobs</option>
            <option value="With">With Applicants</option>
            <option value="None">No Applicants</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium">Search by Title</label>
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered w-full"
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>
      </div>

      {/* Job Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map(job => {
          const jobId =
            (typeof job._id === 'string' && job._id) ||
            (job._id && job._id.$oid) ||
            job.id;

          return (
            <div
              key={jobId}
              className="bg-white border rounded-xl shadow-md overflow-hidden hover:shadow-lg transition"
            >
              {/* Job Image */}
              <img
                src={job.images?.[0] || 'https://via.placeholder.com/300x200'}
                alt={job.title}
                className="w-full h-40 object-cover"
              />

              {/* Job Info */}
              <div className="p-4 flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                <p className="text-sm text-gray-600">📍 {job.location}</p>
                <p className="text-sm text-gray-600">📂 {job.category}</p>
                <p className="text-sm text-gray-500">🗓️ Posted on: {job.date}</p>
                <span className="text-green-600 font-semibold text-sm">৳{job.budget}</span>

                {/* Applicants */}
                {job.applicants?.length > 0 && (
                  <div className="mt-2 bg-gray-50 p-2 rounded-md border">
                    <p className="text-sm font-medium text-gray-700">👷 Applicants:</p>
                    <ul className="text-sm space-y-1">
                      {job.applicants.map((a, i) => (
                        <li key={i} className="flex justify-between">
                          <span>✅ {a.name}</span>
                          <span>৳{a.price} – ⭐ {a.rating}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Apply button */}
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
    </div>
  );
};

export default Jobs;
