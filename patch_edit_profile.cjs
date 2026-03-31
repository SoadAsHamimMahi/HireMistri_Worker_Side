const fs = require('fs');
const file = 'c:/Projects/Hire-Mistri/Hire_Mistri_WorkerSide/src/routes/EditProfile.jsx';
let content = fs.readFileSync(file, 'utf8');

const newReturnBlock = `  return (
    <div className="min-h-screen text-white bg-[#0b1121]">
      <Toaster />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Left Column (30%) */}
          <aside className="w-full lg:w-[30%] lg:sticky lg:top-10">
            <div className="glass p-8 rounded-2xl flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div
                  {...getRootProps()}
                  className="w-40 h-40 squircle bg-slate-800 bg-cover bg-center overflow-hidden cursor-pointer group relative ring-4 ring-white/10 transition-all duration-300 hover:ring-primary/50"
                  title="Click or drag to upload photo"
                >
                  <input {...getInputProps()} />
                  <img
                    src={profile.profileCover || "/default-profile.png"}
                    alt="profile"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e)=> (e.currentTarget.src="/default-profile.png")}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white">
                    <div className="text-center">
                      <i className="fas fa-camera text-2xl mb-2"></i>
                      <p className="text-sm font-medium">
                        {isDragActive ? "Drop here" : "Upload"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Status Indicator */}
                {profile.profileCover && (
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-primary border-4 border-[#0b1121] rounded-full shadow-lg shadow-primary/20 flex items-center justify-center">
                    <i className="fas fa-check text-[#0b1121] text-[10px]"></i>
                  </div>
                )}
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2">{fullName}</h1>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-8">
                Premium Worker
              </div>
              
              <div className="space-y-3 w-full mb-8">
                {user?.emailVerified || profile.emailVerified ? (
                  <div className="flex items-center gap-3 glass px-4 py-3 rounded-xl">
                    <span className="material-symbols-outlined text-primary text-xl">verified</span>
                    <span className="text-sm font-medium text-slate-200">Email Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 glass px-4 py-3 rounded-xl border border-warning/50">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-warning text-xl">warning</span>
                      <span className="text-sm font-medium text-slate-200">Not Verified</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                    >
                      {sendingVerification ? "Sending..." : "Verify"}
                    </button>
                  </div>
                )}
                {profile.createdAt && (
                  <div className="flex items-center gap-3 glass px-4 py-3 rounded-xl">
                    <span className="material-symbols-outlined text-primary text-xl">security</span>
                    <span className="text-sm font-medium text-slate-200">Background Checked</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="glass p-4 rounded-xl text-left">
                  <p className="text-2xl font-bold text-white">{stats?.averageRating?.toFixed(1) || "0.0"}</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Rating</p>
                </div>
                <div className="glass p-4 rounded-xl text-left">
                  <p className="text-2xl font-bold text-white">{stats?.workerCompletedJobs || 0}</p>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Jobs Done</p>
                </div>
              </div>
              
              <div className="w-full pt-6 border-t border-white/5">
                <div className="flex items-center justify-between glass p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={\`w-2.5 h-2.5 rounded-full \${profile.isAvailable ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(29,198,108,0.5)]' : 'bg-slate-400'}\`}></div>
                    <span className="text-sm font-semibold">{profile.isAvailable ? 'Available for work' : 'Not Available'}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={!!profile.isAvailable}
                      onChange={(e) => update("isAvailable", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* Right Column (70%) */}
          <main className="w-full lg:w-[70%] space-y-8">
            {/* KPI Row */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32">
                <span className="material-symbols-outlined text-primary text-2xl">task_alt</span>
                <div>
                  <p className="text-2xl font-bold">{stats?.workerCompletedJobs || 0}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Completed Jobs</p>
                </div>
              </div>
              <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32">
                <span className="material-symbols-outlined text-primary text-2xl">pending_actions</span>
                <div>
                  <p className="text-2xl font-bold">{stats?.workerActiveOrders || 0}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Orders</p>
                </div>
              </div>
              <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32">
                <span className="material-symbols-outlined text-primary text-2xl">bolt</span>
                <div>
                  <p className="text-2xl font-bold">{stats?.workerResponseRate || 0}%</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Response Rate</p>
                </div>
              </div>
              <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32">
                <span className="material-symbols-outlined text-primary text-2xl">schedule</span>
                <div>
                  <p className="text-2xl font-bold">{stats?.workerResponseTimeHours ? stats?.workerResponseTimeHours + 'h' : '0h'}</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Avg Response</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center p-1.5 glass rounded-2xl w-fit flex-wrap gap-1">
              <button 
                className={\`px-6 sm:px-8 py-3 rounded-xl text-sm font-bold transition-all \${tab === "overview" ? "bg-primary text-background-dark" : "text-slate-400 hover:text-white"}\`}
                onClick={() => setTab("overview")}
              >
                Overview
              </button>
              <button 
                className={\`px-6 sm:px-8 py-3 rounded-xl text-sm font-bold transition-all \${tab === "edit" ? "bg-primary text-background-dark" : "text-slate-400 hover:text-white"}\`}
                onClick={() => setTab("edit")}
              >
                Edit Profile
              </button>
              <button 
                className={\`px-6 sm:px-8 py-3 rounded-xl text-sm font-bold transition-all \${tab === "password" ? "bg-primary text-background-dark" : "text-slate-400 hover:text-white"}\`}
                onClick={() => setTab("password")}
              >
                Security
              </button>
            </nav>

            {/* TAB CONTENT */}
            <div>
              {/* =============== OVERVIEW =============== */}
              {tab === "overview" && (
                <div className="space-y-8">
                  {/* About Me Section */}
                  <section className="glass p-8 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4">About Me</h2>
                    <p className="text-slate-300 leading-relaxed text-base max-w-4xl whitespace-pre-wrap">
                      {aboutText || "No bio provided yet."}
                    </p>
                    
                    <div className="mt-10 grid md:grid-cols-2 gap-12">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-5">Services & Area</h3>
                        <div className="flex flex-wrap gap-3">
                          {profile.servicesOffered?.categories?.map((cat, i) => (
                            <span key={\`cat-\${i}\`} className="glass px-5 py-2.5 rounded-xl text-sm font-medium">{cat}</span>
                          ))}
                          {profile.servicesOffered?.tags?.map((tag, i) => (
                            <span key={\`tag-\${i}\`} className="glass px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300">{tag}</span>
                          ))}
                          {profile.serviceArea?.cities?.length > 0 && (
                            <span className="bg-primary/10 border border-primary/30 px-5 py-2.5 rounded-xl text-sm font-bold text-primary flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg">location_on</span>
                              {profile.serviceArea.cities.join(", ")}
                              {profile.serviceArea.radiusKm && \` (\${profile.serviceArea.radiusKm}km)\`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-5">Pricing</h3>
                        <div className="flex items-center gap-10 flex-wrap">
                          <div>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Hourly Rate</p>
                            <p className="text-2xl font-bold text-white">{profile.pricing?.hourlyRate ? \`\${profile.pricing.currency || 'BDT'} \${profile.pricing.hourlyRate}\` : 'N/A'}</p>
                          </div>
                          <div className="w-px h-10 bg-white/10 hidden sm:block"></div>
                          <div>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">Starting Price</p>
                            <p className="text-2xl font-bold text-white">{profile.pricing?.startingPrice ? \`\${profile.pricing.currency || 'BDT'} \${profile.pricing.startingPrice}\` : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Portfolio Preview */}
                  {profile.portfolio?.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold border-none">Portfolio Preview</h2>
                        <button onClick={() => setTab("edit")} className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">
                          Edit Portfolio <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {profile.portfolio.slice(0, 4).map((item, i) => (
                          <div key={i} className="aspect-square glass rounded-2xl overflow-hidden group cursor-pointer relative">
                            <div 
                              className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
                              style={{ backgroundImage: \`url('\${item.url}')\` }}
                            ></div>
                            {item.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-xs p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                {item.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Certifications & Languages */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {profile.certifications?.length > 0 && (
                      <section className="glass p-6 rounded-2xl">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Certifications</h3>
                        <div className="space-y-4">
                          {profile.certifications.map((cert, i) => (
                            <div key={i} className="flex items-center gap-4 group">
                              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20 shrink-0">
                                <span className="material-symbols-outlined text-primary text-2xl">workspace_premium</span>
                              </div>
                              <div>
                                <p className="font-bold text-base text-white">{cert.title}</p>
                                {(cert.issuer || cert.year) && (
                                  <p className="text-sm text-slate-500">
                                    {cert.issuer ? \`Issued by \${cert.issuer}\` : ''}
                                    {cert.issuer && cert.year ? ' • ' : ''}
                                    {cert.year ? cert.year : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {profile.languages?.length > 0 && (
                      <section className="glass p-6 rounded-2xl">
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Languages</h3>
                        <div className="flex flex-wrap gap-4">
                          {profile.languages.map((lang, i) => (
                            <div key={i} className="flex items-center gap-3 glass px-5 py-2.5 rounded-xl border-white/5 bg-white/[0.02]">
                              <span className="text-xs font-black px-1.5 py-0.5 bg-primary/20 rounded text-primary">
                                {lang.substring(0, 2).toUpperCase()}
                              </span>
                              <span className="text-sm font-semibold">{lang}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                </div>
              )}

              {/* ========================= EDIT PROFILE ========================= */}
              {tab === "edit" && (
                <div className="space-y-8 glass p-8 rounded-2xl">`;

const lines = content.split('\\n');
let startIndex = lines.findIndex(l => l.includes('  return ('));
let editIndex = lines.findIndex(l => l.includes('{tab === "edit" && (')) + 1;
if(lines[editIndex].includes('div className="space-y-8"')) editIndex++;

let passStart = lines.findIndex(l => l.includes('{tab === "password" && (')) + 1;
let passIndex = passStart;
if(lines[passIndex].includes('<div className="space-y-6"')) passIndex++;

let footerIndex = lines.findIndex(l => l.includes('</PageContainer>')) - 2; // to drop the extra divs

let newContent = [
  ...lines.slice(0, startIndex),
  ...newReturnBlock.split('\\n'),
  ...lines.slice(editIndex, passStart - 1),
  '              {/* ========================= CHANGE PASSWORD ========================= */}',
  '              {tab === "password" && (',
  '                <div className="space-y-6 glass p-8 rounded-2xl">',
  ...lines.slice(passIndex, footerIndex),
  '            </div>',
  '          </main>',
  '        </div>',
  '      </div>',
  '    </div>',
  '  );',
  '}'
].join('\\n');

fs.writeFileSync(file, newContent);
console.log("Success");
