import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ Import navigation
import JobCardList from './JobCardList';

const Jobs = () => {
  const navigate = useNavigate(); // ✅ Hook for navigation

  const [filters, setFilters] = useState({
    category: 'All',
    location: 'All',
    budget: 'All',
    applicants: 'All',
    search: '',
  });

  const handleChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  const categories = ['All', 'Technician', 'Plumber', 'Mechanic', 'Electrician'];
  const locations = ['All', 'Dhanmondi', 'Mirpur', 'Banani', 'Uttara', 'Mohakhali'];

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

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('category', e.target.value)}>
            {categories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('location', e.target.value)}>
            {locations.map(loc => <option key={loc}>{loc}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('budget', e.target.value)}>
            <option value="All">All Budgets</option>
            <option value="0-500">৳0–500</option>
            <option value="501-1000">৳501–1000</option>
            <option value="1001+">৳1001+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Applicants</label>
          <select className="select select-bordered w-full" onChange={(e) => handleChange('applicants', e.target.value)}>
            <option value="All">All Jobs</option>
            <option value="With">With Applicants</option>
            <option value="None">No Applicants</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search by Title</label>
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered w-full"
            onChange={(e) => handleChange('search', e.target.value)}
          />
        </div>
      </div>

      {/* Job List */}
      <JobCardList filters={filters} />
    </div>
  );
};

export default Jobs;
