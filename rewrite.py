import os

with open('src/routes/EditProfile.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We need to rewrite the entire returned component.
# We'll split the file at '  if (loading) {' and keep the top part.

top_part, bottom_part = code.split('  if (loading) {', 1)

new_render = """  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300 page-bg bg-[#f9f9f7]">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-emerald-500 mb-4"></i>
          <p className="text-gray-500 font-bold tracking-widest text-[10px] uppercase">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-gray-900 selection:bg-emerald-200 font-sans pb-20">
      <div className="relative mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-24 max-w-[1400px]">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* ── Fixed Glass Sidebar ── */}
          <aside className="lg:sticky lg:top-24 space-y-6 animate-in fade-in slide-in-from-left-4 duration-1000">
            {/* Profile Brief Card */}
            <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6 flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <div 
                  {...getRootProps()}
                  className={`w-24 h-24 mask mask-squircle overflow-hidden bg-gray-50 border-gray-100 ring-1 ring-white/10 shadow-2xl relative cursor-pointer ${isDragActive ? 'ring-emerald-500 scale-105' : ''}`}
                >
                  <input {...getInputProps()} />
                  <img
                    src={profile.profileCover || "https://i.pravatar.cc/150?img=3"}
                    alt="Profile"
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                    onError={(e) => (e.target.src = "https://i.pravatar.cc/150?img=3")}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <i className="fas fa-camera text-white text-lg"></i>
                  </div>
                </div>
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-lg ${profile.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                {saving && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] rounded-2xl z-20 mask mask-squircle">
                    <span className="loading loading-spinner loading-sm text-emerald-400"></span>
                  </div>
                )}
              </div>

              <h2 className="text-xl font-bold text-gray-900 tracking-tight truncate w-full">
                {fullName}
              </h2>
              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-1">
                Certified Professional
              </p>
              
              <div className="mt-4 w-full flex flex-col gap-2">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Availability</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={!!profile.isAvailable} onChange={(e) => update("isAvailable", e.target.checked)} />
                    <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Navigation Sidebar */}
            <nav className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-2 space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: 'fa-grid-2' },
                { id: 'edit', label: 'Account Settings', icon: 'fa-user-gear' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden group ${
                    tab === t.id 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <i className={`fas ${t.icon} text-lg w-5 text-center ${tab === t.id ? 'text-white' : 'group-hover:text-emerald-500'}`}></i>
                  <span className="tracking-tight">{t.label}</span>
                  {tab === t.id && (
                    <span className="absolute right-3 w-1 h-4 bg-white rounded-full"></span>
                  )}
                </button>
              ))}
            </nav>

            {/* Verification Status Banner */}
            <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-5">
              <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-4">
                Trust & Safety
              </h4>
              <div className="space-y-3">
                <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  user?.emailVerified || profile.emailVerified 
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                    : 'bg-rose-50 border-rose-100 text-rose-500 cursor-pointer hover:bg-rose-100'
                }`} onClick={!(user?.emailVerified || profile.emailVerified) ? handleSendVerificationEmail : undefined}>
                  <div className="flex items-center gap-3">
                    <i className={`fas ${user?.emailVerified || profile.emailVerified ? 'fa-badge-check' : 'fa-triangle-exclamation'} text-lg`}></i>
                    <span className="text-[11px] font-black uppercase tracking-tight">
                      {user?.emailVerified || profile.emailVerified ? 'Identity Verified' : 'Verify Email'}
                    </span>
                  </div>
                  {!(user?.emailVerified || profile.emailVerified) && (
                    <i className="fas fa-arrow-right text-xs"></i>
                  )}
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border bg-gray-50 border-gray-100 text-gray-500">
                  <div className="flex items-center gap-3">
                    <i className="fas fa-shield-check text-lg"></i>
                    <span className="text-[11px] font-black uppercase tracking-tight">
                      Background Checked
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ===================== RIGHT MAIN ===================== */}
          <main className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-1000 delay-150">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Completed Jobs', value: stats?.workerCompletedJobs ?? 0, icon: 'fa-circle-check', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Active Orders', value: stats?.workerActiveOrders ?? 0, icon: 'fa-briefcase', color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Response Rate', value: (stats?.workerResponseRate ?? 0) + '%', icon: 'fa-bolt', color: 'text-yellow-500', bg: 'bg-yellow-50' },
                { label: 'Avg Response', value: stats?.workerResponseTimeHours ? stats.workerResponseTimeHours + 'h' : '0h', icon: 'fa-clock', color: 'text-indigo-500', bg: 'bg-indigo-50' }
              ].map((stat, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-5 group hover:border-gray-300 transition-all duration-500 relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                    <h4 className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</h4>
                  </div>
                  <div className="absolute top-1/2 -right-4 -translate-y-1/2 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700">
                    <i className={`fas ${stat.icon} text-6xl`}></i>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center text-xs absolute top-4 right-4`}>
                    <i className={`fas ${stat.icon}`}></i>
                  </div>
                </div>
              ))}
            </div>

            {/* OVERVIEW TAB */}
            {tab === "overview" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* 1. About Me Section */}
                <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <i className="fas fa-id-badge text-indigo-500"></i> Professional Overview
                  </h3>
                  <div className="p-5 bg-white rounded-2xl border border-gray-200 min-h-[120px] relative overflow-hidden group">
                    <i className="fas fa-quote-left absolute top-4 right-4 text-gray-100 text-5xl group-hover:text-gray-200 transition-all"></i>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium relative z-10 italic">
                      "{aboutText}"
                    </p>
                  </div>
                </div>

                {/* 2. Identity & Skills */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <i className="fas fa-address-card text-blue-500"></i> Identity & Contact
                    </h3>
                    <div className="space-y-4">
                      <DetailItem label="Full Legal Name" value={profile.fullLegalName || fullName} bold />
                      <DetailItem label="Phone Number" value={profile.phone} icon="call" />
                      <DetailItem label="Email Address" value={profile.email} icon="mail" />
                      <DetailItem label="Work Location" value={[profile.city, profile.district].filter(v => v && v !== 'N/A').join(', ') || 'Dhaka, Bangladesh'} icon="location_on" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <i className="fas fa-wrench text-amber-500"></i> Skills & Experience
                    </h3>
                    <div className="space-y-6">
                      <DetailItem label="Years of Experience" value={profile.experienceYears ? `${profile.experienceYears} Years` : 'Not specified'} bold />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Services Offered</p>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(profile.servicesOffered) && profile.servicesOffered.length > 0 ? (
                            profile.servicesOffered.map((slug, i) => (
                              <div key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                {decodeServiceSlug(slug)}
                              </div>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400 italic font-black uppercase tracking-widest">No services listed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Emergency & Payout */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <i className="fas fa-truck-medical text-rose-500"></i> Emergency Contact
                    </h3>
                    <div className="space-y-4">
                      <DetailItem label="Contact Person" value={profile.emergencyContactName} bold />
                      <DetailItem label="Phone Number" value={profile.emergencyContactPhone} icon="call" />
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                      <i className="fas fa-wallet text-emerald-500"></i> Payout Method
                    </h3>
                    <div className="space-y-4">
                      <DetailItem label="Provider" value={profile.payoutWalletProvider} chip />
                      <DetailItem label="Wallet Number" value={profile.payoutWalletNumber} icon="account_circle" />
                    </div>
                  </div>
                </div>

                {/* Portfolio Preview */}
                <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-3">
                      <i className="fas fa-images text-purple-500"></i> Work Portfolio
                    </h3>
                    <button onClick={() => setTab("edit")} className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1">
                      Manage <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>

                  {profile.portfolio?.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {profile.portfolio.slice(0, 4).map((item, i) => (
                        <div key={i} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden group relative border border-gray-200">
                          <img src={item.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                            <p className="text-white text-[9px] font-black uppercase tracking-widest line-clamp-2">
                              {item.caption || "Work Preview"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <i className="fas fa-image text-3xl text-gray-300 mb-3"></i>
                      <p className="text-xs text-gray-500 font-bold mb-4">No portfolio items yet</p>
                      <button onClick={() => setTab("edit")} className="bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 hover:text-emerald-600 transition-all">
                        Upload Work
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EDIT PROFILE TAB */}
            {tab === "edit" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
                
                {/* 👤 PERSONAL INFO GLASS CARD */}
                <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-8">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <i className="fas fa-user-circle text-blue-500"></i> Personal Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: "First Name", name: "firstName" },
                      { label: "Last Name", name: "lastName" },
                      { label: "Full Legal Name", name: "fullLegalName" },
                      { label: "Email", name: "email", type: "email" },
                      { label: "Phone", name: "phone", type: "tel" },
                      { label: "District / Area", name: "district" },
                      { label: "City", name: "city" },
                      { label: "Professional Headline", name: "headline" },
                      { label: "Years of Experience", name: "experienceYears", type: "number" },
                    ].map((f) => (
                      <div key={f.name} className="relative group">
                        <input
                          type={f.type || "text"}
                          name={f.name}
                          placeholder={f.label}
                          value={profile[f.name] || ""}
                          onChange={handleChange}
                          className="w-full bg-gray-50 border-gray-100 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-transparent peer"
                          id={f.name}
                        />
                        <label htmlFor={f.name} className="absolute left-5 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-600 peer-focus:font-black peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase">{f.label}</label>
                      </div>
                    ))}
                    
                    <div className="relative group md:col-span-2">
                      <textarea
                        name="bio"
                        placeholder="Professional Bio"
                        value={profile.bio || ""}
                        onChange={handleChange}
                        rows={4}
                        className="w-full bg-gray-50 border-gray-100 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-transparent peer"
                        id="bio"
                      />
                      <label htmlFor="bio" className="absolute left-5 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-600 peer-focus:font-black peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase">Professional Bio</label>
                    </div>
                  </div>
                </div>

                {/* SERVICES SETTINGS */}
                <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-8">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <i className="fas fa-toolbox text-amber-500"></i> Service Offerings
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-3 text-gray-500">Select Services You Provide</label>
                      <div className="flex flex-wrap gap-2">
                        {serviceCategories.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              profile.servicesOffered?.includes(opt) 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20' 
                                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              const v = profile.servicesOffered || [];
                              if (v.includes(opt)) update("servicesOffered", v.filter(x => x !== opt));
                              else update("servicesOffered", [...v, opt]);
                            }}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* EMERGENCY & PAYOUT SETTINGS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-8">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <i className="fas fa-truck-medical text-rose-500"></i> Emergency Contact
                    </h3>
                    <div className="space-y-6">
                      <div className="relative group">
                        <input
                          type="text"
                          name="emergencyContactName"
                          placeholder="Contact Name"
                          value={profile.emergencyContactName || ""}
                          onChange={handleChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-transparent peer"
                          id="emergencyContactName"
                        />
                        <label htmlFor="emergencyContactName" className="absolute left-5 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-600 peer-focus:font-black peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase">Contact Name</label>
                      </div>
                      <div className="relative group">
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          placeholder="Phone Number"
                          value={profile.emergencyContactPhone || ""}
                          onChange={handleChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-transparent peer"
                          id="emergencyContactPhone"
                        />
                        <label htmlFor="emergencyContactPhone" className="absolute left-5 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-600 peer-focus:font-black peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase">Phone Number</label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-8">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                      <i className="fas fa-wallet text-emerald-500"></i> Payout Details
                    </h3>
                    <div className="space-y-6">
                      <div className="relative group">
                        <input
                          type="text"
                          name="payoutWalletProvider"
                          placeholder="Wallet Provider (bkash/nagad)"
                          value={profile.payoutWalletProvider || ""}
                          onChange={handleChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-transparent peer"
                          id="payoutWalletProvider"
                        />
                        <label htmlFor="payoutWalletProvider" className="absolute left-5 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-600 peer-focus:font-black peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase">Provider (bkash/nagad)</label>
                      </div>
                      <div className="relative group">
                        <input
                          type="text"
                          name="payoutWalletNumber"
                          placeholder="Wallet Number"
                          value={profile.payoutWalletNumber || ""}
                          onChange={handleChange}
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-transparent peer"
                          id="payoutWalletNumber"
                        />
                        <label htmlFor="payoutWalletNumber" className="absolute left-5 top-4 text-gray-400 text-sm transition-all pointer-events-none peer-focus:-top-2 peer-focus:left-4 peer-focus:text-[10px] peer-focus:text-emerald-600 peer-focus:font-black peer-focus:uppercase peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:left-4 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:text-emerald-600 peer-[:not(:placeholder-shown)]:font-black peer-[:not(:placeholder-shown)]:uppercase">Wallet Number</label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SHOWCASE GALLERY EDIT */}
                <div className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-8">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <i className="fas fa-photo-film text-purple-500"></i> Showcase Gallery
                  </h3>
                  
                  <div
                    {...getPortfolioRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-8 ${isDragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300'}`}
                  >
                    <input {...getPortfolioInputProps()} />
                    <i className="fas fa-cloud-arrow-up text-4xl text-gray-400 mb-4"></i>
                    <p className="text-sm font-bold text-gray-600 mb-1">Click or drag photos here to upload</p>
                    <p className="text-xs text-gray-400">Supports high-res JPG & PNG</p>
                  </div>

                  {profile.portfolio?.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {profile.portfolio.map((item, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group shadow-sm">
                          <div className="relative aspect-[4/3]">
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => removePortfolioItem(idx)}
                              className="absolute top-3 right-3 w-8 h-8 bg-white/90 text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white flex items-center justify-center shadow-sm"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                          <div className="p-4">
                            <input
                              placeholder="Add caption..."
                              className="w-full bg-gray-50 border-gray-200 border text-xs font-semibold rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                              value={item.caption || ""}
                              onChange={(e) => updatePortfolioCaption(idx, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 💾 ACTION FOOTER */}
                <div className="flex items-center justify-between bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-6 bg-emerald-600/5 border-emerald-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <i className="fas fa-shield-check"></i>
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase tracking-tight">Data Security</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Your info is protected</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleReset} className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-all">
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 border-none text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-3 active:scale-95"
                    >
                      {saving ? <span className="loading loading-spinner loading-xs"></span> : <i className="fas fa-cloud-arrow-up"></i>}
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
"""

with open('src/routes/EditProfile.jsx', 'w', encoding='utf-8') as f:
    f.write(top_part + new_render)
