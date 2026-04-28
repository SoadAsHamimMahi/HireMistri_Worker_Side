const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'BrowseClients.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const returnBlockRegex = /return \(\s*<div className="min-h-screen bg-base-100.*?(?=\s*\};\s*export default)/s;

const newReturnBlock = `return (
    <div className="min-h-screen bg-[#f9f9f7] pb-20 pt-8 font-sans">
      {/* Header Section */}
      <div className="max-w-[90%] mx-auto px-4 md:px-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <button
              onClick={() => navigate(-1)}
              className="group flex items-center gap-2 text-brand hover:text-brand-hover text-sm font-bold transition-all mb-4"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span> 
              <span>Back to Hub</span>
            </button>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Browse <span className="text-brand">Clients</span>
            </h1>
            <p className="text-gray-600 font-medium text-sm">
              Connect with vetted entities and discover new opportunities.
            </p>
          </div>
          <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
             <span className="material-symbols-outlined text-brand text-2xl">verified_user</span>
             <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Market Integrity</p>
                <p className="text-xs font-medium text-gray-500">Vetted Entities Only</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-[90%] mx-auto px-4 md:px-8">
        {/* Filter Console */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 group-focus-within:text-brand transition-colors">search</span>
              <input
                type="text"
                placeholder="Search clients..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 py-3 text-sm font-medium text-gray-900 focus:border-brand focus:bg-white outline-none transition-all placeholder:text-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4 w-full lg:w-auto">
               <div className="relative flex-1 lg:w-64">
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 appearance-none cursor-pointer focus:border-brand focus:bg-white outline-none transition-all shadow-sm"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="jobs">High Volume</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 pointer-events-none">unfold_more</span>
               </div>
            </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
             <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-4xl">search_off</span>
             </div>
             <div className="space-y-1">
                <p className="text-base font-bold text-gray-600">No Clients Found</p>
                <p className="text-sm font-medium text-gray-500">Try adjusting your search filters.</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <Link
                to={\`/client/\${client.uid}\`}
                key={client.uid}
                className="group relative bg-white border border-gray-100 rounded-3xl overflow-hidden transition-all hover:shadow-md hover:border-brand-light flex flex-col"
              >
                {/* Hero / Cover */}
                <div className="h-32 w-full overflow-hidden bg-gray-100 relative">
                  {client.profileCover ? (
                    <img
                      src={client.profileCover}
                      alt={client.displayName}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-300">
                       <span className="material-symbols-outlined text-5xl">person</span>
                    </div>
                  )}
                  
                  {/* Verification Badge */}
                  {client.emailVerified && (
                    <div className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-brand flex items-center justify-center shadow-md">
                       <span className="material-symbols-outlined text-white text-sm">verified</span>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4 flex-1 flex flex-col">
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-gray-900 group-hover:text-brand-hover transition-colors line-clamp-1">
                      {client.displayName}
                    </h2>
                    <div className="flex items-center gap-1.5">
                       <span className="material-symbols-outlined text-brand text-sm">location_on</span>
                       <p className="text-xs font-bold text-gray-500">
                         {[client.city, client.country].filter(Boolean).join(', ') || 'Location Not Set'}
                       </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jobs Posted</p>
                       <p className="text-lg font-black text-gray-900">{client.stats?.totalJobsPosted || 0}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</p>
                       <p className="text-lg font-black text-gray-900">{client.stats?.clientJobsCompleted || 0}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex-1 flex flex-col justify-end">
                    <div className="flex items-center justify-between">
                       <div className="px-3 py-1.5 rounded-full bg-brand-light/30 border border-brand-light text-xs font-bold text-brand-hover">
                          Trusted Client
                       </div>
                       <span className="material-symbols-outlined text-gray-400 group-hover:text-brand-hover group-hover:translate-x-1 transition-all">arrow_forward</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );`;

content = content.replace(returnBlockRegex, newReturnBlock + '\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched BrowseClients.jsx');
