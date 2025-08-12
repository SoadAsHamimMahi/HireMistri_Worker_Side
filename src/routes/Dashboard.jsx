import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const stats = [
    { label: 'Jobs Applied', value: 6, icon: 'fas fa-briefcase' },
    { label: 'Active Orders', value: 2, icon: 'fas fa-box' },
    { label: 'Reviews', value: 10, icon: 'fas fa-star' },
  ];

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
        console.error('❌ Failed to fetch browse jobs:', err);
      }
    };

    fetchJobs();
  }, []);

  // 🔍 Extract filter options
  const categories = ['All', ...new Set(jobData.map(job => job.category))];
  const locations = ['All', ...new Set(jobData.map(job => job.location))];

  // 🧠 Apply filters
 const filteredJobs = jobData
  .filter(job => job.status === 'active') // ✅ Only active jobs
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
      job.title
        .toLowerCase()
        .split(/[^a-zA-Z0-9]+/)
        .some(word => word.startsWith(filters.search.toLowerCase()));

    return matchCategory && matchLocation && matchBudget && matchApplicants && matchSearch;
  });

  const handleChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Hi, Rakib! 👋</h2>
        <p className="text-gray-600">Welcome back. Ready to find new jobs today?</p>
      </div>

      {/* 📊 Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-4">
              <i className={`${stat.icon} text-green-500 text-2xl`}></i>
              <div>
                <h4 className="text-lg font-semibold text-gray-800">{stat.value}</h4>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔗 Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Link to="/edit-profile" className="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-100">Edit Profile</Link>
        <Link to="/jobs" className="btn bg-green-500 text-white hover:bg-green-600">Browse Jobs</Link>
        <Link to="/applications" className="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-100">Applications</Link>
        <Link to="/orders" className="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-100">My Orders</Link>
      </div>

      {/* 🔘 Availability Toggle */}
      <div className="mb-10">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="toggle toggle-success" />
          <span className="text-sm text-gray-700 font-medium">Available for work</span>
        </label>
      </div>

      {/* 🔍 Filters */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">📢 New Jobs Near You</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="select select-bordered w-full"
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {categories.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <select
              className="select select-bordered w-full"
              onChange={(e) => handleChange('location', e.target.value)}
            >
              {locations.map(loc => <option key={loc}>{loc}</option>)}
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium mb-1">Budget</label>
            <select
              className="select select-bordered w-full"
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
            <label className="block text-sm font-medium mb-1">Applicants</label>
            <select
              className="select select-bordered w-full"
              onChange={(e) => handleChange('applicants', e.target.value)}
            >
              <option value="All">All Jobs</option>
              <option value="With">With Applicants</option>
              <option value="None">No Applicants</option>
            </select>
          </div>

          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Search by Title</label>
            <input
              type="text"
              placeholder="Search..."
              className="input input-bordered w-full"
              onChange={(e) => handleChange('search', e.target.value)}
            />
          </div>
        </div>

        {/* Job Cards */}
        <div className="space-y-6">
          {filteredJobs.map(job => (
            <div
              key={job.id || job._id}
              className="bg-white border rounded-xl shadow-md flex flex-col md:flex-row gap-4 p-4"
            >
              <div className="md:w-1/3">
                <img
                  src={job.images?.[0] || 'https://via.placeholder.com/150'}
                  alt={job.title}
                  className="rounded-lg w-full h-36 object-cover"
                />
              </div>
              <div className="md:w-2/3 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">📍 {job.location}</p>
                    <p className="text-sm text-gray-600">📂 {job.category}</p>
                    <p className="text-sm text-gray-500">🗓️ Posted on: {job.date}</p>
                  </div>
                  <span className="text-green-600 font-semibold text-sm whitespace-nowrap mt-1">৳{job.budget}</span>
                </div>

                {job.applicants?.length > 0 && (
                  <div className="mt-3 bg-gray-50 p-3 rounded-md border">
                    <p className="text-sm font-medium mb-2 text-gray-700">👷 Applicants:</p>
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

                <div className="mt-4">
                  <button className="btn btn-sm bg-green-500 text-white hover:bg-green-600 px-5">Apply</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
