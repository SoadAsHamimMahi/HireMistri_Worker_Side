import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useDarkMode } from '../contexts/DarkModeContext';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

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
    location: 'All',
    budget: 'All',
    applicants: 'All',
    search: '',
    status: 'active', // Do not add sort control
  });
  const [page, setPage] = useState(1);

  // Filters to params helper
  const buildQueryParams = () => {
    const params = {};
    if (filters.category && filters.category !== 'All') params.category = filters.category;
    if (filters.location && filters.location !== 'All') params.location = filters.location;
    if (filters.budget && filters.budget !== 'All') params.budget = filters.budget;
    if (filters.applicants && filters.applicants !== 'All') params.applicants = filters.applicants;
    if (filters.search && filters.search.trim() !== '') params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    params.sort = 'newest';
    return params;
  };

  // Fetch jobs when filters change
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

  // Get worker geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWorkerLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  // Dynamic options from server data
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(jobData.map(j => j.category).filter(Boolean)))],
    [jobData]
  );
  const locations = useMemo(
    () => ['All', ...Array.from(new Set(jobData.map(j => j.location).filter(Boolean)))],
    [jobData]
  );
  // Jobs paginate in UI as before
  const JOBS_PER_PAGE = 9;
  const pageCount = Math.max(1, Math.ceil(jobData.length / JOBS_PER_PAGE));
  const start = (page - 1) * JOBS_PER_PAGE;
  const currentJobs = jobData.slice(start, start + JOBS_PER_PAGE);

  const handleChange = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  };

  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Extract job coordinates helper
  const getJobLatLng = (job) => {
    if (!job) return null;
    const lat = job.lat ?? job.latitude ?? job?.locationLat ?? job?.location?.lat ?? job?.coordinates?.lat;
    const lng = job.lng ?? job.longitude ?? job?.locationLng ?? job?.location?.lng ?? job?.coordinates?.lng;
    if (typeof lat === 'number' && typeof lng === 'number') return [lat, lng];
    return null;
  };

  // Get jobs with valid coordinates
  const jobsWithCoords = useMemo(() => {
    return jobData.filter(job => getJobLatLng(job) !== null);
  }, [jobData]);

  // Calculate map center (average of job locations or default)
  const mapCenter = useMemo(() => {
    if (jobsWithCoords.length > 0) {
      const coords = jobsWithCoords.map(j => getJobLatLng(j));
      const avgLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
      const avgLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
      return [avgLat, avgLng];
    }
    return workerLocation || [23.8103, 90.4125]; // Default to Dhaka, Bangladesh
  }, [jobsWithCoords, workerLocation]);

  // Haversine distance calculation in km
  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-2xl font-bold flex items-center text-primary hover:underline"
      >
        ← Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-base-content">🛠️ Available Jobs</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-base-content opacity-80 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <i className="fas fa-list mr-2"></i>List View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-base-content opacity-80 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <i className="fas fa-map mr-2"></i>Map View
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-base-content opacity-80">Category</label>
          <select
            className="select select-bordered w-full"
            value={filters.category}
            onChange={e => handleChange('category', e.target.value)}
          >
            {categories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </div>
        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-base-content opacity-80">Location</label>
          <select
            className="select select-bordered w-full"
            value={filters.location}
            onChange={e => handleChange('location', e.target.value)}
          >
            {locations.map(loc => <option key={loc}>{loc}</option>)}
          </select>
        </div>
        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-base-content opacity-80">Budget</label>
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
          <label className="block text-sm font-medium text-base-content opacity-80">Applicants</label>
          <select
            className="select select-bordered w-full"
            value={filters.applicants}
            onChange={e => handleChange('applicants', e.target.value)}
          >
            <option value="All">All Jobs</option>
            <option value="With">With Applicants</option>
            <option value="None">No Applicants</option>
          </select>
        </div>
        {/* Search by title */}
        <div className="lg:col-span-2">
          <label className="block text-sm font-medium text-base-content opacity-80">Search by Title</label>
          <input
            type="text"
            placeholder="Search..."
            className="input input-bordered w-full"
            value={filters.search}
            onChange={e => handleChange('search', e.target.value)}
          />
        </div>
      </div>

      {/* Job Cards or Map View */}
      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading jobs...</div>
      ) : jobData.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          No jobs match your filters.
        </div>
      ) : viewMode === 'map' ? (
        /* Map View */
        <div key="map-view-container" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="h-[600px] w-full relative">
            {jobsWithCoords.length > 0 ? (
              <MapContainer
                key={`map-${viewMode}-${jobsWithCoords.length}`}
                center={mapCenter}
                zoom={12}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url={isDarkMode ? 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                />
                {workerLocation && (
                  <Marker position={workerLocation}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-semibold">📍 Your Location</div>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {jobsWithCoords.map((job) => {
                  const jobId =
                    (typeof job._id === 'string' && job._id) ||
                    (job._id && job._id.$oid) ||
                    job.id;
                  const coords = getJobLatLng(job);
                  if (!coords) return null;

                  const distance = workerLocation
                    ? getDistanceKm(workerLocation[0], workerLocation[1], coords[0], coords[1])
                    : null;

                  return (
                    <Marker key={jobId} position={coords}>
                      <Popup>
                        <div className="text-sm min-w-[200px]">
                          <div className="font-semibold mb-1">{job.title || 'Untitled Job'}</div>
                          <div className="text-gray-600 mb-2">{job.location || 'N/A'}</div>
                          <div className="text-base-content opacity-80 mb-1">
                            📂 {job.category || 'General'}
                          </div>
                          <div className="text-primary font-semibold mb-2">৳{job.budget || 0}</div>
                          {distance !== null && (
                            <div className="text-blue-600 mb-2">📍 {distance} km away</div>
                          )}
                          <Link
                            to={`/jobs/${jobId}`}
                            className="inline-block mt-2 px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 text-center text-xs"
                          >
                            View Details
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <i className="fas fa-map-marked-alt text-4xl mb-2"></i>
                  <p>No jobs with location data available</p>
                  <button
                    onClick={() => setViewMode('list')}
                    className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                  >
                    Switch to List View
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Showing {jobsWithCoords.length} job{jobsWithCoords.length !== 1 ? 's' : ''} on map
              </span>
              {workerLocation && (
                <span className="text-blue-600 dark:text-blue-400">
                  <i className="fas fa-map-marker-alt mr-1"></i>Your location is shown
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
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
                    <h3 className="text-lg font-semibold text-base-content">{job.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">📍 {job.location}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">📂 {job.category}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">🗓️ Posted on: {job.date}</p>
                    <span className="text-primary font-semibold text-sm">৳{job.budget}</span>

                    {job.applicants?.length > 0 && (
                      <div className="mt-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-md border dark:border-gray-600">
                        <p className="text-sm font-medium text-base-content opacity-80">👷 Applicants:</p>
                        <ul className="text-sm space-y-1">
                          {job.applicants.map((a, i) => (
                            <li key={i} className="flex justify-between">
                              <span className="text-base-content opacity-80">✅ {a.name}</span>
                              <span className="text-base-content opacity-70">৳{a.price} – ⭐ {a.rating}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Link
                      to={`/jobs/${jobId}`}
                      className="btn btn-sm btn-primary mt-3 w-full text-center"
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
        </>
      )}
    </div>
  );
};

export default Jobs;
