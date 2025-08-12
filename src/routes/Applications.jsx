import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  BriefcaseIcon,
  MapPinIcon,
  CalendarDaysIcon,
  CurrencyBangladeshiIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';

const WORKER_ID = 'user001'; // update to logged-in user id when needed

const statusColors = {
  Pending: 'badge-warning',
  Accepted: 'badge-success',
  Completed: 'badge-primary',
  Rejected: 'badge-error',
};

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchApplicationsWithJobs = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/applications/${WORKER_ID}`);
        const apps = res.data;

        const jobRequests = apps.map(app =>
          axios
            .get(`http://localhost:5000/api/jobs/${app.jobId}`)
            .then(res => res.data)
            .catch(err => {
              console.warn(`❌ Job not found for ${app.jobId}`);
              return null;
            })
        );

        const jobs = await Promise.all(jobRequests);

        const merged = apps.map((app, index) => ({
          ...app,
          ...(jobs[index] || {}) // merge job data if available
        }));

        setApplications(merged);
      } catch (err) {
        console.error("❌ Failed to load applications:", err);
      }
    };

    fetchApplicationsWithJobs();
  }, []);

  useEffect(() => {
    const filtered = applications.filter(app =>
      (statusFilter === 'All' || app.status === statusFilter) &&
      (categoryFilter === 'All' || app.category === categoryFilter) &&
      app.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredApps(filtered);
  }, [applications, statusFilter, categoryFilter, searchTerm]);

  const handleCancel = id => {
    const updated = applications.filter(app => app._id !== id);
    setApplications(updated);
    toast.success('Application cancelled.');
  };

  const handleReapply = job => {
    toast(`Re-applied to: ${job.title}`, { icon: '🔄' });
  };

  const statuses = ['All', 'Pending', 'Accepted', 'Completed', 'Rejected'];
  const categories = ['All', 'Electrician', 'Mechanic', 'Plumber'];

  return (
    <div className="flex gap-6 max-w-7xl mx-auto p-6">
      <Toaster />

      {/* Filters */}
      <aside className="w-full md:w-1/4 space-y-4">
        <h3 className="text-lg font-semibold">🔍 Filters</h3>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select className="select select-bordered w-full" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {statuses.map(status => <option key={status}>{status}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select className="select select-bordered w-full" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            {categories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Search by Title</label>
          <input type="text" className="input input-bordered w-full" placeholder="e.g. AC Repair"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </aside>

      {/* Applications List */}
      <main className="w-full md:w-3/4 space-y-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <BriefcaseIcon className="w-5 h-5" /> My Applications
        </h2>

        {filteredApps.length === 0 ? (
          <p className="text-gray-500">No applications found with current filters.</p>
        ) : (
          filteredApps.map(app => (
            <div key={app._id} className="card bg-base-100 shadow-lg border border-gray-200 rounded-xl">
              <div className="flex justify-between items-start p-4">
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-1">{app.title || 'Untitled Job'}</h3>
                  <div className="flex flex-col gap-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2"><MapPinIcon className="w-4 h-4" /><span>{app.location || 'N/A'}</span></div>
                    <div className="flex items-center gap-2"><CurrencyBangladeshiIcon className="w-4 h-4" /><span>{app.budget || '৳N/A'}</span></div>
                    <div className="flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4" /><span>Applied on: {app.appliedAt}</span></div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <span className="badge badge-outline">{app.category}</span>
                    {app.startDate && <span className="badge badge-info">🎯 Starts: {app.startDate}</span>}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <span className={`badge badge-sm ${statusColors[app.status] || 'badge-ghost'}`}>{app.status}</span>
                  <div className="flex gap-2">
                    {app.status === 'Pending' && <button className="btn btn-xs btn-error" onClick={() => handleCancel(app._id)}>Cancel</button>}
                    {app.status === 'Rejected' && <button className="btn btn-xs btn-accent" onClick={() => handleReapply(app)}>Reapply</button>}
                  </div>
                </div>
              </div>

              {app.status === 'Completed' && app.review && (
                <div className="bg-base-200 px-4 py-3 border-t">
                  <p className="font-medium">⭐ Client Review</p>
                  <p className="text-yellow-500">Rating: {app.review.rating} / 5.0</p>
                  <p className="italic">“{app.review.text}”</p>
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default Applications;
