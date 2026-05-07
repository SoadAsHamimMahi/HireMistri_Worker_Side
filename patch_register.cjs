const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'Authentication', 'WorkerRegister.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Use regex to find the start of the return statement
const returnMatch = content.match(/  \/\/ ── Render ─+\r?\n  return \(/);

if (!returnMatch) {
  throw new Error("Could not find Render marker");
}

const topPart = content.substring(0, returnMatch.index);

const bottomPart = `  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f9f9f7] flex flex-col lg:flex-row">
      <Toaster position="top-right" />
      
      {/* Left Side: Hero Panel (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/3 bg-brand p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 -left-12 w-64 h-64 bg-white opacity-10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand">
              <i className="fas fa-tools text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">HireMistri</h2>
          </div>
          
          <h1 className="text-4xl font-black text-white leading-tight mb-6">
            Earn more,<br />work smarter.
          </h1>
          
          <div className="space-y-6 mt-12">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                <i className="fas fa-check"></i>
              </div>
              <p className="text-white/90 font-medium">Verified clients only</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                <i className="fas fa-wallet"></i>
              </div>
              <p className="text-white/90 font-medium">Fast mobile payouts</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                <i className="fas fa-shield-alt"></i>
              </div>
              <p className="text-white/90 font-medium">Insured jobs</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-12">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <i className="fas fa-info-circle"></i>
              {step === 1 && "Account Setup"}
              {step === 2 && "Service Profile"}
              {step === 3 && "Profile Photo"}
              {step === 4 && "Identity Verification"}
              {step === 5 && "Emergency & Payout"}
            </h3>
            <p className="text-white/80 text-sm">
              {step === 1 && "Your information is securely stored. We use this to create your worker portal access."}
              {step === 2 && "Select the services you offer. This helps us match you with the right clients."}
              {step === 3 && "A professional photo builds trust and increases your chances of getting hired."}
              {step === 4 && "We verify all workers to ensure safety for both clients and tradespeople on the platform."}
              {step === 5 && "Set up your payout details to receive payments directly to your mobile wallet."}
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-brand/10 border border-brand/30">
              <span className="material-symbols-outlined text-brand text-sm">work</span>
              <span className="text-brand text-sm font-bold uppercase tracking-wider">Worker Registration</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Hire Mistri</h1>
          </div>

          {/* Login Link (Top Right Desktop, Center Mobile) */}
          <div className="text-center lg:text-right mb-8">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-brand hover:underline font-bold">Sign in</Link>
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-10">
            <div className="flex justify-between items-center relative z-10">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-2 bg-[#f9f9f7] px-2" style={{ flex: 1 }}>
                  <div className={\`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 \${
                    i + 1 < step ? 'bg-brand text-white shadow-sm' :
                    i + 1 === step ? 'bg-brand text-white ring-4 ring-brand/20 shadow-md' :
                    'bg-white text-gray-400 border-2 border-gray-200'
                  }\`}>
                    {i + 1 < step ? <i className="fas fa-check"></i> : i + 1}
                  </div>
                  <span className={\`text-xs hidden sm:block font-bold \${i + 1 === step ? 'text-brand' : 'text-gray-400'}\`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div className="h-1 bg-gray-200 rounded-full -mt-11 sm:-mt-14 relative z-0 mx-6">
              <div
                className="h-full bg-brand rounded-full transition-all duration-500"
                style={{ width: \`\${((step - 1) / 4) * 100}%\` }}
              />
            </div>
          </div>

          {/* Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 sm:p-10 shadow-sm mt-12 sm:mt-16">

            {/* ── STEP 1: Account ── */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Account Setup</h2>

                {/* Google Sign-in */}
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={submitting || !!uid}
                  className="w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 shadow-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></g></svg>
                  {uid ? '✓ Account Created' : submitting ? 'Creating…' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-gray-400 text-sm font-medium">or with email</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" name="firstName" value={form.firstName} onChange={handleChange} placeholder="Rahim" />
                  <Input label="Last Name" name="lastName" value={form.lastName} onChange={handleChange} placeholder="Uddin" />
                </div>
                <Input label="Mobile Number" name="phone" value={form.phone} onChange={handleChange} placeholder="01XXXXXXXXX" type="tel" />
                <Input label="Email Address" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" type="email" disabled={!!uid} />
                {!uid && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Password" name="password" value={form.password} onChange={handleChange} placeholder="Min 6 chars" type="password" />
                    <Input label="Confirm Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" type="password" />
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <CheckItem checked={ageConfirmed} onChange={setAgeConfirmed} label="I confirm I am 18 years of age or older." />
                  <CheckItem checked={termsAccepted} onChange={setTermsAccepted}
                    label={<>I agree to the <a href="#" className="text-brand hover:text-brand-hover underline">Terms of Service</a> (v{TERMS_VERSION})</>} />
                  <CheckItem checked={privacyAccepted} onChange={setPrivacyAccepted}
                    label={<>I agree to the <a href="#" className="text-brand hover:text-brand-hover underline">Privacy Policy</a> (v{PRIVACY_VERSION})</>} />
                </div>

                <StepButton onClick={uid ? () => setStep(2) : handleStep1Next} loading={submitting} label={uid ? 'Next →' : 'Create Account & Continue →'} />
              </div>
            )}

            {/* ── STEP 2: Profile ── */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Service Profile</h2>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Service Categories <span className="text-red-500">*</span></label>
                  
                  {/* Search Input */}
                  <div className="relative mb-4">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                    <input
                      type="text"
                      placeholder="Search — electrician, plumber, AC..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 text-gray-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                    />
                  </div>

                  {/* Grouped Categories */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredServiceGroups.length > 0 ? (
                      filteredServiceGroups.map((group) => (
                        <details key={group.id} className="group bg-gray-50 rounded-xl border border-gray-200 overflow-hidden" open={!!serviceSearch}>
                          <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors list-none">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{group.title}</span>
                              {group.subtitle && <span className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">{group.subtitle}</span>}
                            </div>
                            <span className="material-symbols-outlined text-gray-400 group-open:rotate-180 transition-transform">expand_more</span>
                          </summary>
                          <div className="p-4 pt-0 flex flex-wrap gap-2">
                            {group.items.map((item) => {
                              const val = \`\${group.id}:\${item.id}\`;
                              const isSelected = profile.selectedServices.includes(val);
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  title={item.description}
                                  onClick={() => toggleService(val)}
                                  className={\`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 border \${
                                    isSelected
                                      ? 'bg-brand text-white border-brand shadow-md shadow-brand/20'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand/50'
                                  }\`}
                                >
                                  {item.label}
                                </button>
                              );
                            })}
                          </div>
                        </details>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                        <p className="text-sm">No matches found. Try another word or pick 'Other'.</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <Input label="City" name="city" value={profile.city} onChange={handleProfileChange} placeholder="e.g. Dhaka" />
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">District <span className="text-red-500">*</span></label>
                    <select
                      value={profile.district}
                      onChange={e => setProfile(p => ({ ...p, district: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-50 border border-gray-200 text-sm outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="">Select district…</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Years of Experience</label>
                  <select
                    value={profile.experienceYears}
                    onChange={e => setProfile(p => ({ ...p, experienceYears: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-50 border border-gray-200 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  >
                    <option value="">Select…</option>
                    {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n === 0 ? 'Less than 1 year' : \`\${n}+ years\`}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Short Bio</label>
                  <textarea
                    rows={3}
                    value={profile.bio}
                    onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell clients about your skills and work style…"
                    className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-50 border border-gray-200 text-sm outline-none resize-none placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div className="flex gap-4 pt-6">
                  <BackButton onClick={prevStep} />
                  <StepButton onClick={nextStep} label="Next →" />
                </div>
              </div>
            )}

            {/* ── STEP 3: Profile Photo ── */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Profile Photo</h2>
                <p className="text-gray-500 text-sm mb-6">Upload a clear, professional photo of yourself. This builds trust with clients.</p>
                <div className="flex flex-col items-center gap-6">
                  <div
                    className={\`w-40 h-40 rounded-full overflow-hidden flex items-center justify-center cursor-pointer group relative border-4 \${profilePhotoUrl ? 'border-brand' : 'border-dashed border-gray-300 bg-gray-50 hover:border-brand/50'}\`}
                    onClick={() => photoRef.current?.click()}
                  >
                    {profilePhotoUrl ? (
                      <>
                        <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="material-symbols-outlined text-white text-3xl">edit</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 group-hover:text-brand transition-colors">
                        <span className="material-symbols-outlined text-5xl block mb-2">{photoUploading ? 'hourglass_empty' : 'add_a_photo'}</span>
                        <span className="text-xs font-bold uppercase tracking-wider">{photoUploading ? 'Uploading…' : 'Click to upload'}</span>
                      </div>
                    )}
                  </div>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={photoUploading}
                    className="px-6 py-2.5 rounded-full text-sm font-bold text-brand bg-brand-light border border-brand/20 hover:bg-brand/10 hover:border-brand/30 transition-all"
                  >
                    {photoUploading ? 'Uploading…' : profilePhotoUrl ? 'Change Photo' : 'Choose Photo'}
                  </button>
                </div>
                <div className="flex gap-4 pt-6">
                  <BackButton onClick={prevStep} />
                  <StepButton onClick={nextStep} label="Next →" />
                </div>
              </div>
            )}

            {/* ── STEP 4: Documents ── */}
            {step === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Identity Verification</h2>
                <p className="text-gray-500 text-sm mb-6">We need your NID (National Identity Card) to verify your identity and ensure platform safety.</p>

                <Input
                  label="NID Number"
                  value={nidNumber}
                  onChange={e => setNidNumber(e.target.value.replace(/\\D/g, ''))}
                  placeholder="10 or 17 digit NID number"
                  type="text"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <NidUpload
                    label="NID Front"
                    url={nidFrontUrl}
                    uploading={nidFrontUploading}
                    inputRef={nidFrontRef}
                    onChange={e => handleNidChange('front', e)}
                  />
                  <NidUpload
                    label="NID Back"
                    url={nidBackUrl}
                    uploading={nidBackUploading}
                    inputRef={nidBackRef}
                    onChange={e => handleNidChange('back', e)}
                  />
                </div>

                <div className="rounded-xl p-4 mt-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 flex gap-3 items-start">
                  <i className="fas fa-lock text-amber-500 mt-1"></i>
                  <p>Your NID information is encrypted and only accessible to our verification team.</p>
                </div>

                <div className="flex gap-4 pt-6">
                  <BackButton onClick={prevStep} />
                  <StepButton onClick={nextStep} label="Next →" />
                </div>
              </div>
            )}

            {/* ── STEP 5: Emergency & Payout ── */}
            {step === 5 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Emergency & Payout</h2>

                <div>
                  <h3 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-wider">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Contact Name" value={emergency.name} onChange={e => setEmergency(em => ({ ...em, name: e.target.value }))} placeholder="Family member name" />
                    <Input label="Contact Phone" value={emergency.phone} onChange={e => setEmergency(em => ({ ...em, phone: e.target.value }))} placeholder="01XXXXXXXXX" type="tel" />
                  </div>
                  <div className="mt-4">
                    <Input 
                      label="Emergency Contact NID Number" 
                      value={emergencyNidNumber} 
                      onChange={e => setEmergencyNidNumber(e.target.value.replace(/\\D/g, ''))} 
                      placeholder="10 or 17 digit NID number" 
                      type="text" 
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NidUpload
                      label="Contact NID (Front)"
                      url={emergencyNidFrontUrl}
                      uploading={emergencyNidFrontUploading}
                      inputRef={emergencyNidFrontRef}
                      onChange={e => handleNidChange('emergencyFront', e)}
                    />
                    <NidUpload
                      label="Contact NID (Back)"
                      url={emergencyNidBackUrl}
                      uploading={emergencyNidBackUploading}
                      inputRef={emergencyNidBackRef}
                      onChange={e => handleNidChange('emergencyBack', e)}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xs font-black text-gray-400 mb-4 uppercase tracking-wider">Payout Wallet</h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {['bkash', 'nagad', 'rocket'].map(provider => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setPayout(p => ({ ...p, provider }))}
                        className={\`py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all border-2 \${
                          payout.provider === provider
                            ? 'text-white border-transparent shadow-md'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }\`}
                        style={payout.provider === provider ? {
                          background: provider === 'bkash' ? '#E2136E' : provider === 'nagad' ? '#F4821F' : '#8B228B',
                        } : {}}
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                  {payout.provider && (
                    <Input
                      label={\`\${payout.provider.charAt(0).toUpperCase() + payout.provider.slice(1)} Number\`}
                      value={payout.number}
                      onChange={e => setPayout(p => ({ ...p, number: e.target.value }))}
                      placeholder="01XXXXXXXXX"
                      type="tel"
                    />
                  )}
                </div>

                <div className="rounded-xl p-5 mt-8 bg-blue-50 border border-blue-100 flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <i className="fas fa-clipboard-check"></i>
                  </div>
                  <div>
                    <p className="font-bold text-blue-900 mb-1">What happens next?</p>
                    <p className="text-blue-800/80 text-sm">Your application will be reviewed by our team within 24–48 hours. You'll receive an email confirmation once your account is approved.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <BackButton onClick={prevStep} />
                  <button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={submitting}
                    className="flex-1 py-3.5 px-6 rounded-xl text-white bg-brand hover:bg-brand-hover font-black uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-60 shadow-md shadow-brand/20"
                  >
                    {submitting ? 'Submitting…' : 'Submit Registration'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder, name, disabled }) {
  return (
    <div>
      {label && <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl text-gray-900 bg-gray-50 border border-gray-200 text-sm outline-none transition-all placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50 disabled:bg-gray-100"
      />
    </div>
  );
}

function CheckItem({ checked, onChange, label }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group mb-3">
      <div
        onClick={() => onChange(!checked)}
        className={\`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border-2 \${checked ? 'bg-brand border-brand' : 'bg-white border-gray-300 group-hover:border-brand/50'}\`}
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-sm text-gray-600 font-medium leading-tight select-none pt-0.5" onClick={() => onChange(!checked)}>{label}</span>
    </label>
  );
}

function StepButton({ onClick, loading, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex-1 py-3.5 px-6 rounded-xl text-white bg-brand hover:bg-brand-hover font-black uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-60 shadow-md shadow-brand/20"
    >
      {loading ? 'Please wait…' : label}
    </button>
  );
}

function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-6 py-3.5 rounded-xl text-gray-600 bg-white border border-gray-200 font-bold uppercase tracking-widest text-sm transition-all hover:bg-gray-50 hover:text-gray-900"
    >
      Back
    </button>
  );
}

function NidUpload({ label, url, uploading, inputRef, onChange }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label} <span className="text-red-500">*</span></label>
      <div
        className={\`h-36 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer group relative border-2 transition-colors \${url ? 'border-brand bg-brand-light/30' : 'border-dashed border-gray-300 bg-gray-50 hover:border-brand/50 hover:bg-brand-light/10'}\`}
        onClick={() => inputRef.current?.click()}
      >
        {url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="material-symbols-outlined text-white text-3xl">edit</span>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 group-hover:text-brand transition-colors">
            <span className="material-symbols-outlined text-4xl block mb-2">{uploading ? 'hourglass_empty' : 'id_card'}</span>
            <span className="text-xs font-bold uppercase tracking-wider">{uploading ? 'Uploading…' : 'Click to upload'}</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onChange} />
    </div>
  );
}
`;

fs.writeFileSync(filePath, topPart + bottomPart);
console.log('Successfully updated WorkerRegister.jsx');
