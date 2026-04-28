const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/Jobs.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const returnStartMarker = '  return (\r\n    <div className="flex flex-col min-h-screen bg-base-100';
let startIndex = content.indexOf(returnStartMarker);

if (startIndex === -1) {
  startIndex = content.indexOf('  return (\n    <div className="flex flex-col min-h-screen bg-base-100');
}

const returnEndMarker = '  );\r\n};\r\n\r\n// Isolated Map Component';
let endIndex = content.indexOf(returnEndMarker);

if (endIndex === -1) {
  endIndex = content.indexOf('  );\n};\n\n// Isolated Map Component');
}


if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find the return block in Jobs.jsx');
  console.log('Start Index:', startIndex);
  console.log('End Index:', endIndex);
  process.exit(1);
}

const newReturnBlock = `  return (
    <div className="min-h-screen bg-[#f9f9f7] pb-20 pt-8">
      <div className="max-w-[90%] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Find Jobs</h1>
            <p className="text-gray-500 font-medium mt-1">Browse available jobs and send applications to clients.</p>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={\`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all \${viewMode === 'list' ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-gray-500 hover:text-gray-900'}\`}
            >
              <span className="material-symbols-outlined text-[20px]">view_list</span>
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={\`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all \${viewMode === 'map' ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-gray-500 hover:text-gray-900'}\`}
            >
              <span className="material-symbols-outlined text-[20px]">map</span>
              Map View
            </button>
          </div>
        </div>

        {/* Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Filters */}
          <div className="w-full lg:w-[320px] shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Filters</h3>
                <button
                  onClick={() => handleSelectSearch({ category: 'All', location: 'All', budgetMin: '', budgetMax: '', search: '', useRadius: false, sortBy: 'newest' })}
                  className="text-sm text-brand font-bold hover:text-brand-hover transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Search Skills</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-xl">search</span>
                    <input
                      type="text"
                      placeholder="e.g. Electrician..."
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      value={filters.search || ''}
                      onChange={e => handleChange('search', e.target.value)}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all appearance-none cursor-pointer"
                    value={filters.category || 'All'}
                    onChange={e => handleChange('category', e.target.value)}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all appearance-none cursor-pointer"
                    value={filters.location || 'All'}
                    onChange={e => handleChange('location', e.target.value)}
                  >
                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>

                {/* Budget */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Budget Range (৳)</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      value={filters.budgetMin || ''}
                      onChange={e => handleChange('budgetMin', e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      value={filters.budgetMax || ''}
                      onChange={e => handleChange('budgetMax', e.target.value)}
                    />
                  </div>
                </div>

                {/* Radius */}
                {workerLocation && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-bold text-gray-700">Search by Distance</label>
                      <input 
                        type="checkbox" 
                        className="toggle toggle-sm rounded-full accent-brand" 
                        checked={filters.useRadius || false} 
                        onChange={e => handleChange('useRadius', e.target.checked)} 
                      />
                    </div>
                    {filters.useRadius && (
                      <div className="space-y-3">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          className="w-full accent-brand"
                          value={filters.radius || 10}
                          onChange={e => handleChange('radius', e.target.value)}
                        />
                        <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>1km</span>
                          <span className="text-brand">{filters.radius || 10}km</span>
                          <span>100km</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-brand">
                <span className="loading loading-spinner loading-lg"></span>
                <p className="mt-4 font-bold text-gray-600">Loading jobs...</p>
              </div>
            ) : jobData.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
                 <div className="w-20 h-20 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-search text-3xl text-brand"></i>
                 </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Found</h3>
                 <p className="text-gray-500 font-medium">Try adjusting your filters or search keywords.</p>
                 <button onClick={() => handleSelectSearch({ category: 'All', location: 'All', budgetMin: '', budgetMax: '', search: '', useRadius: false, sortBy: 'newest' })} className="mt-6 bg-brand hover:bg-brand-hover text-white font-bold py-2.5 px-6 rounded-lg transition-colors">
                    Clear All Filters
                 </button>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentJobs.map((job) => {
                    const jobId = (typeof job._id === 'string' && job._id) || (job._id && job._id.$oid) || job.id;
                    return (
                      <div key={jobId} className="group bg-white border border-gray-100 rounded-2xl p-6 transition-all hover:shadow-lg hover:border-brand-light flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <span className="bg-brand-light text-brand text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-sm border border-brand-light">
                              {job.category || 'GENERAL'}
                            </span>
                            <div className="flex items-center gap-2">
                              {/* <button className="text-gray-400 hover:text-brand transition-colors">
                                <BookmarkButton jobId={jobId} />
                              </button> */}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 text-lg mb-3 line-clamp-2 h-14 leading-tight group-hover:text-brand transition-colors">
                            {job.title}
                          </h3>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                              <span className="material-symbols-outlined text-lg text-brand">location_on</span>
                              <span className="truncate">{job.location || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-gray-400 uppercase tracking-tight">{formatRelativeTime(job.createdAt || job.date)}</span>
                              <span className="text-brand text-lg font-black">{formatBudgetDisplay(job)}</span>
                            </div>
                          </div>
                        </div>

                        <Link
                          to={\`/jobs/\${jobId}\`}
                          className="flex items-center justify-between font-bold text-sm text-brand hover:text-brand-hover transition-colors pt-4 border-t border-gray-50 group/link"
                        >
                          View Job Details
                          <i className="fas fa-arrow-right group-hover/link:translate-x-1 transition-transform"></i>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                      let p = i + 1;
                      if (pageCount > 5 && page > 3) p = page - 3 + i + 1;
                      if (p > pageCount) return null;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={\`w-10 h-10 rounded-xl text-sm font-bold transition-all \${page === p ? 'bg-brand text-white shadow-md shadow-brand/20' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}\`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                      disabled={page === pageCount}
                      className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              viewMode === 'map' && (
                <div className="h-[700px] w-full rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">
                  <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl border border-gray-100 shadow-lg">
                    <p className="text-sm font-bold text-gray-900">{jobsWithCoords.length} Jobs on Map</p>
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
      </div>
    </div>`;

const newMapBlock = `// Isolated Map Component - Clean Light Style
const JobMap = ({ jobsWithCoords, mapCenter, workerLocation, getJobLatLng }) => {
  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      className="h-full w-full z-0"
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; CARTO'
      />
      {workerLocation && (
        <Marker position={workerLocation}>
          <Popup>
            <div className="font-bold text-xs text-brand text-center">YOUR LOCATION</div>
          </Popup>
        </Marker>
      )}
      {jobsWithCoords.map((job) => {
        const jobId = (typeof job._id === 'string' && job._id) || (job._id && job._id.$oid) || job.id;
        const coords = getJobLatLng(job);
        return (
          <Marker key={jobId} position={coords}>
            <Popup className="clean-popup">
              <div className="p-1 min-w-[200px]">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-[10px] font-bold text-brand uppercase">{job.category || 'General'}</span>
                </div>
                <h4 className="font-bold text-sm text-gray-900 leading-tight mb-2">{job.title}</h4>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 mb-3">
                  <p className="text-sm font-black text-gray-900">৳{job.budget?.toLocaleString() || 'N/A'}</p>
                </div>
                <Link
                  to={\`/jobs/\${jobId}\`}
                  className="block w-full text-center bg-brand hover:bg-brand-hover text-white rounded-lg font-bold text-xs py-2 transition-colors"
                >
                  View Details
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
`;

const finalContent = content.substring(0, startIndex) + newReturnBlock + '\n' + newMapBlock;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Successfully patched Jobs.jsx');
