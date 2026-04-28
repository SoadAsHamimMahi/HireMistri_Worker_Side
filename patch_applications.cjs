const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/routes/Applications.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const returnStartMarker = '  return (\n    <div className="min-h-screen text-white">';
let startIndex = content.indexOf(returnStartMarker);

if (startIndex === -1) {
  startIndex = content.indexOf('  return (\r\n    <div className="min-h-screen text-white">');
}

if (startIndex === -1) {
  console.error('Could not find the return block start in Applications.jsx');
  process.exit(1);
}

const newReturnBlock = `  return (
    <div className="min-h-screen bg-[#f9f9f7] pb-20 pt-8">
      <div className="max-w-[90%] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Applications</h1>
            <p className="text-gray-500 font-medium mt-1">Track and manage your job applications and ongoing work.</p>
          </div>
          <button
            className="md:hidden flex items-center px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-lg font-bold transition-colors shadow-md shadow-brand/20 w-fit"
            onClick={() => setFiltersOpen(o => !o)}
            aria-expanded={filtersOpen}
            aria-controls="filters"
          >
            <FunnelIcon className="w-5 h-5 mr-2" />
            Filters
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1">Total</p>
              <p className="text-3xl font-black text-gray-900">{applications.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
              <i className="fas fa-briefcase text-xl text-gray-400"></i>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1">Pending</p>
              <p className="text-3xl font-black text-gray-900">{applications.filter(a => a.status === 'pending').length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
              <i className="fas fa-clock text-xl text-amber-500"></i>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-brand-light bg-brand-light/30 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1">Accepted</p>
              <p className="text-3xl font-black text-brand">{applications.filter(a => a.status === 'accepted').length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center border border-brand-light shadow-sm">
              <i className="fas fa-check-circle text-xl text-brand"></i>
            </div>
          </div>
          <div className="p-5 rounded-2xl border border-gray-100 bg-white shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1">Rejected</p>
              <p className="text-3xl font-black text-gray-900">{applications.filter(a => a.status === 'rejected').length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
              <i className="fas fa-times-circle text-xl text-red-500"></i>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside
            id="filters"
            className={\`
              \${filtersOpen ? 'block' : 'hidden'}
              lg:block lg:col-span-1
            \`}
          >
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900 text-lg">Filters</h3>
                <button
                  className="lg:hidden text-gray-400 hover:text-gray-900 transition-colors"
                  onClick={() => setFiltersOpen(false)}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Search Title</label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      placeholder="e.g. AC Repair"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all appearance-none cursor-pointer"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                  >
                    {statuses.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all appearance-none cursor-pointer"
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                  >
                    {categories.map(cat => <option key={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Applications List */}
          <main className="lg:col-span-3 min-w-0 space-y-8">
            {!authReady ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm flex flex-col items-center justify-center">
                <span className="loading loading-spinner loading-lg text-brand mb-4"></span>
                <p className="font-bold text-gray-500">Checking sign-in...</p>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm flex flex-col items-center justify-center">
                <span className="loading loading-spinner loading-lg text-brand mb-4"></span>
                <p className="font-bold text-gray-500">Loading applications...</p>
              </div>
            ) : err ? (
              <div className="bg-red-50 rounded-2xl border border-red-100 p-12 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Applications</h3>
                <p className="text-gray-600 font-medium">{err}</p>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                  <i className="fas fa-inbox text-4xl text-gray-300"></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No Applications Found</h3>
                <p className="text-gray-500 font-medium mb-8 max-w-md mx-auto">
                  {searchTerm || statusFilter !== 'All' || categoryFilter !== 'All'
                    ? 'No applications match your current filters.'
                    : 'You haven\\'t applied to any jobs yet. Start browsing jobs to find your next opportunity.'}
                </p>
                <Link to="/jobs" className="bg-brand hover:bg-brand-hover text-white font-bold py-3 px-8 rounded-xl transition-colors inline-flex items-center gap-2 shadow-md shadow-brand/20">
                  <i className="fas fa-search"></i>
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <>
                {/* Active Orders - Quick access when there are accepted applications */}
                {acceptedAppsCount > 0 && statusFilter === 'All' && (
                  <div className="p-6 rounded-2xl border border-brand-light bg-white shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-light rounded-bl-full opacity-50 pointer-events-none"></div>
                    <div className="flex items-center gap-4 mb-6 relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-light border border-brand-light text-brand shadow-sm">
                        <i className="fas fa-user-check text-xl"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-gray-900">Active Orders</h2>
                        <p className="text-sm font-medium text-gray-500">Contact your clients to coordinate the work.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                      {groupedApps.accepted.slice(0, 6).map((app) => {
                        const info = clientDetails[app.clientId] || { name: 'Client', phone: '', email: '' };
                        return (
                          <div key={app._id} className="flex flex-col gap-3 rounded-xl p-4 border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand font-black border border-brand-light/50">
                                {info.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{info.name}</p>
                                <p className="text-xs font-medium text-gray-500 truncate">{app.title || 'Job'}</p>
                              </div>
                            </div>
                            {info.phone && (
                              <a href={\`tel:\${info.phone.replace(/\\s/g, '')}\`} className="w-full flex justify-center items-center gap-2 bg-white border border-gray-200 hover:border-brand hover:text-brand text-gray-700 font-bold text-xs py-2 rounded-lg transition-colors">
                                <i className="fas fa-phone"></i>
                                Call Client
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Applications List - Grouped by status */}
                {['accepted', 'pending', 'completed', 'rejected'].map((statusKey) => {
                  const group = groupedApps[statusKey];
                  if (group.length === 0) return null;
                  
                  const sectionLabels = { accepted: 'Active Orders', pending: 'Pending Proposals', completed: 'Completed Jobs', rejected: 'Rejected' };
                  const sectionIcons = { accepted: 'fa-user-check', pending: 'fa-clock', completed: 'fa-check-double', rejected: 'fa-times-circle' };
                  const sectionColors = { accepted: 'text-brand', pending: 'text-amber-500', completed: 'text-blue-500', rejected: 'text-gray-400' };
                  const badgeColors = {
                    accepted: 'bg-brand-light text-brand border border-brand-light/50',
                    pending: 'bg-amber-50 text-amber-600 border border-amber-100',
                    completed: 'bg-blue-50 text-blue-600 border border-blue-100',
                    rejected: 'bg-gray-100 text-gray-500 border border-gray-200'
                  };

                  return (
                    <div key={statusKey} className="space-y-4">
                      <h3 className={\`flex items-center gap-2 text-lg font-black \${sectionColors[statusKey]}\`}>
                        <i className={\`fas \${sectionIcons[statusKey]}\`}></i>
                        {sectionLabels[statusKey]} <span className="text-sm font-bold bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-sm text-gray-500">{group.length}</span>
                      </h3>
                      <div className="space-y-4">
                        {group.map(app => {
                          const status = (app.status || 'pending').toLowerCase();
                          const isAccepted = status === 'accepted';
                          const badgeClass = badgeColors[status] || badgeColors.pending;
                          
                          return (
                            <div key={app._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                              <div className="p-6 space-y-5">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                  <h3 className="text-xl font-bold text-gray-900 pr-2 group-hover:text-brand transition-colors">
                                    {app.title || 'Untitled Job'}
                                  </h3>
                                  <span className={\`shrink-0 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center w-fit \${badgeClass}\`}>
                                    <i className={\`fas \${sectionIcons[statusKey]} mr-1.5 text-[10px]\`}></i>
                                    {isAccepted ? 'ACTIVE' : (app.status || 'PENDING').toUpperCase()}
                                  </span>
                                </div>

                                {/* Meta row */}
                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500 font-medium">
                                  <span className="flex items-center gap-1.5 min-w-0 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100" title={app.location || undefined}>
                                    <MapPinIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="truncate">{app.location || 'N/A'}</span>
                                  </span>
                                  {app.category && (
                                    <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                      <span className="w-2 h-2 rounded-full bg-brand"></span>
                                      {app.category}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                    <CurrencyBangladeshiIcon className="w-4 h-4 text-gray-400" />
                                    {typeof app.budget === 'number' ? \`৳\${app.budget.toLocaleString()}\` : (app.budget || '৳N/A')}
                                  </span>
                                  <span className="flex items-center gap-1.5 text-gray-400">
                                    <CalendarDaysIcon className="w-4 h-4" />
                                    {fmtDate(app.createdAt)}
                                  </span>
                                </div>

                                {/* Price Negotiation Block */}
                                {(app.proposedPrice || app.counterPrice || app.finalPrice || app.negotiationStatus) && (
                                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-3">
                                    <div className="flex items-center justify-between border-b border-amber-100/50 pb-2">
                                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Price Negotiation</span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-600 uppercase">
                                        {(app.negotiationStatus || (app.counterPrice ? 'COUNTERED' : 'PENDING')).toString()}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      {app.proposedPrice ? (
                                        <div className="bg-white rounded-lg p-3 border border-amber-100 shadow-sm">
                                          <span className="block text-xs font-bold text-gray-400 mb-1">Your Proposed</span>
                                          <span className="font-black text-gray-900">৳{Number(app.proposedPrice).toLocaleString()}</span>
                                        </div>
                                      ) : null}

                                      {app.counterPrice ? (
                                        <div className="bg-white rounded-lg p-3 border border-amber-200 shadow-sm shadow-amber-100">
                                          <span className="block text-xs font-bold text-amber-500 mb-1">Client Counter</span>
                                          <span className="font-black text-amber-600">৳{Number(app.counterPrice).toLocaleString()}</span>
                                        </div>
                                      ) : null}

                                      {app.finalPrice ? (
                                        <div className="bg-brand-light rounded-lg p-3 border border-brand-light shadow-sm">
                                          <span className="block text-xs font-bold text-brand mb-1">Final Agreed</span>
                                          <span className="font-black text-brand">৳{Number(app.finalPrice).toLocaleString()}</span>
                                        </div>
                                      ) : null}
                                    </div>

                                    {app.status === 'pending' && app.counterPrice && !['accepted', 'cancelled'].includes((app.negotiationStatus || '').toLowerCase()) ? (
                                      <div className="pt-2 flex flex-wrap gap-2">
                                        <button
                                          className="flex-1 bg-brand hover:bg-brand-hover text-white font-bold text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
                                          disabled={negotiatingApplicationId === app._id}
                                          onClick={() => handleCounterDecision(app, 'accept')}
                                        >
                                          {negotiatingApplicationId === app._id ? <span className="loading loading-spinner loading-xs"></span> : <i className="fas fa-check"></i>}
                                          Accept Counter
                                        </button>
                                        <button
                                          className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 font-bold text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                          disabled={negotiatingApplicationId === app._id}
                                          onClick={() => handleCounterDecision(app, 'decline')}
                                        >
                                          <i className="fas fa-times"></i>
                                          Decline
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                )}

                                {/* Proposal Expander */}
                                {app.proposalText && (
                                  <div className="space-y-2">
                                    {expandedProposal[app._id] ? (
                                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                                        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-200">
                                          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Your Cover Letter</span>
                                          <button type="button" className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors" onClick={() => toggleProposal(app._id)}>Close</button>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{app.proposalText}</p>
                                      </div>
                                    ) : (
                                      <button type="button" className="flex items-center gap-2 text-sm font-bold text-brand hover:text-brand-hover transition-colors" onClick={() => toggleProposal(app._id)}>
                                        <i className="fas fa-file-alt"></i>
                                        Read Cover Letter
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Actions Bar */}
                                <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-3">
                                  <Link to={\`/jobs/\${app.jobId}\`} className="bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                    <i className="fas fa-eye"></i> View Job
                                  </Link>

                                  {app.status?.toLowerCase() === 'accepted' && app.clientId && (
                                    <>
                                      <button onClick={() => navigate(\`/client/\${app.clientId}\`)} className="bg-white border border-gray-200 hover:border-brand hover:text-brand text-gray-700 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                        <i className="fas fa-user"></i> View Client
                                      </button>
                                      {(() => {
                                        const info = clientDetails[app.clientId] || { phone: '', email: '' };
                                        return (info.phone || info.email) ? (
                                          <>
                                            {info.phone && (
                                              <a href={\`tel:\${info.phone.replace(/\\s/g, '')}\`} className="bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                                <i className="fas fa-phone"></i> Call
                                              </a>
                                            )}
                                            {info.email && (
                                              <a href={\`mailto:\${info.email}\`} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                                                <i className="fas fa-envelope"></i> Email
                                              </a>
                                            )}
                                          </>
                                        ) : null;
                                      })()}
                                      <button
                                        className="ml-auto bg-brand hover:bg-brand-hover text-white font-bold text-sm py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-brand/20 disabled:opacity-50"
                                        disabled={completingApplicationId === app._id || !!app.completedByWorkerAt}
                                        onClick={() => handleMarkComplete(app)}
                                      >
                                        {completingApplicationId === app._id ? <span className="loading loading-spinner loading-xs"></span> : <i className="fas fa-check-double"></i>}
                                        {app.completedByWorkerAt ? 'Completion Pending' : 'Mark Complete'}
                                      </button>
                                    </>
                                  )}

                                  {app.status?.toLowerCase() === 'pending' && (
                                    <>
                                      <button className="bg-white border border-gray-200 hover:border-brand hover:text-brand text-gray-700 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm" onClick={() => handleEditClick(app)} disabled={isSaving}>
                                        <i className="fas fa-edit"></i> Edit Proposal
                                      </button>
                                      <button className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm" onClick={() => handleCancelClick(app)} disabled={isCancelling}>
                                        {isCancelling && cancellingApplicationId === app._id ? <span className="loading loading-spinner loading-xs"></span> : <i className="fas fa-times"></i>}
                                        Withdraw
                                      </button>
                                    </>
                                  )}

                                  {app.status?.toLowerCase() === 'rejected' && (
                                    <button className="bg-white border border-gray-200 hover:border-brand hover:text-brand text-gray-700 font-bold text-sm py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm" onClick={() => handleReapply(app)}>
                                      <i className="fas fa-redo"></i> Reapply
                                    </button>
                                  )}

                                  {app.status?.toLowerCase() === 'completed' && (
                                    <button
                                      className="bg-brand hover:bg-brand-hover text-white font-bold text-sm py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-brand/20"
                                      onClick={() => {
                                        setSelectedApplicationForRating(app);
                                        setRatingModalOpen(true);
                                      }}
                                    >
                                      <i className="fas fa-star"></i> Rate Client
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-100">
                <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
              </div>
              <h3 className="text-xl font-black text-gray-900">Withdraw Application?</h3>
              <p className="text-gray-500 font-medium">Are you sure you want to withdraw your application for <span className="font-bold text-gray-900">"{cancellingApplicationTitle}"</span>? This action cannot be undone.</p>
              
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
                  onClick={handleCancelCancel}
                  disabled={isCancelling}
                >
                  Keep It
                </button>
                <button
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-md shadow-red-500/20"
                  onClick={handleCancelConfirm}
                  disabled={isCancelling}
                >
                  {isCancelling ? <span className="loading loading-spinner loading-sm"></span> : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Proposal Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900">Edit Cover Letter</h3>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors" onClick={handleEditCancel}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <label className="block text-sm font-bold text-gray-700 mb-2">Cover Letter</label>
              <textarea
                className="w-full h-48 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all resize-none"
                placeholder="Why are you the best fit for this job?"
                value={editProposalText}
                onChange={(e) => setEditProposalText(e.target.value)}
              ></textarea>
              <p className="text-xs text-gray-500 font-bold mt-2 text-right">
                 {editProposalText.length} characters (min 50)
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-6 rounded-xl transition-colors"
                onClick={handleEditCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className="bg-brand hover:bg-brand-hover text-white font-bold py-2.5 px-8 rounded-xl transition-colors flex items-center gap-2 shadow-md shadow-brand/20"
                onClick={handleSaveProposal}
                disabled={isSaving || editProposalText.trim().length < 50}
              >
                {isSaving ? <span className="loading loading-spinner loading-sm"></span> : 'Save Updates'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModalOpen && selectedApplicationForRating && (
        <RatingModal
          isOpen={ratingModalOpen}
          onClose={() => {
            setRatingModalOpen(false);
            setSelectedApplicationForRating(null);
          }}
          applicationId={selectedApplicationForRating._id?.toString() || selectedApplicationForRating._id}
          workerId={user?.uid}
          clientId={selectedApplicationForRating.clientId}
          clientName={clientDetails[selectedApplicationForRating.clientId]?.name || 'Client'}
          jobTitle={selectedApplicationForRating.title || 'Job'}
          onSuccess={() => {
            toast.success('Your review has been submitted.');
          }}
        />
      )}
    </div>
  );
}
`;

const finalContent = content.substring(0, startIndex) + newReturnBlock;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log('Successfully patched Applications.jsx');
