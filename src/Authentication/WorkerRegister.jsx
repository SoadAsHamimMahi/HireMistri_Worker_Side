import React, { useState, useContext, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { saveUserToApi } from '../Authentication/saveUser';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = (import.meta.env?.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const TERMS_VERSION = '2026-03-28';
const PRIVACY_VERSION = '2026-03-28';

const BD_MOBILE_REGEX = /^01[3-9]\d{8}$/;
const NID_REGEX = /^\d{10}$|^\d{17}$/;

const SERVICE_CATEGORY_GROUPS = [
  {
    id: 'home-repair-trades',
    title: 'Home Repair & Trades',
    subtitle: 'Typical one-off visits for essential repairs',
    items: [
      { id: 'electrician', label: 'Electrician', description: 'Faults, fittings, DB/MCB, wiring' },
      { id: 'plumber', label: 'Plumber', description: 'Leaks, taps, line fix, motor/tank' },
      { id: 'ac-service', label: 'AC Service & Repair', description: 'Gas refill, cleaning, repair' },
      { id: 'carpenter', label: 'Carpenter', description: 'Doors, shelves, small wood fixes' },
      { id: 'painter', label: 'Painter', description: 'Touch-ups, defined areas' },
      { id: 'mason', label: 'Mason / Civil', description: 'Patches, broken corners, RCC' },
      { id: 'tile-marble', label: 'Tile & Marble Fix', description: 'Replacement, grout repair' },
      { id: 'welder', label: 'Welder / Fabrication', description: 'Gating, railing repair' },
      { id: 'gypsum', label: 'Gypsum / False Ceiling', description: 'Patch or small sections' },
      { id: 'glass-alum', label: 'Glass & Aluminium', description: 'Window/door adjustment' },
    ],
  },
  {
    id: 'install-mounting',
    title: 'Install & Mounting',
    subtitle: 'Professional installation for hardware and units',
    items: [
      { id: 'general-install', label: 'Fan, Light & Appliance', description: 'Standard mounting & wiring' },
      { id: 'mounting-decor', label: 'Curtain, Mirror & Shelves', description: 'Precise wall mounting' },
      { id: 'tv-mount', label: 'TV Wall Mount', description: 'Bracket installation' },
      { id: 'water-filter', label: 'Water Filter / Geyser', description: 'Inlet/outlet setup' },
    ],
  },
  {
    id: 'other',
    title: 'Specialized / Other',
    items: [
      { id: 'cleaning', label: 'Cleaning Service', description: 'Deep or regular cleaning' },
      { id: 'security', label: 'Security Guard', description: 'Premise monitoring' },
      { id: 'gardening', label: 'Gardening', description: 'Lawn & plant care' },
      { id: 'other', label: 'Other', description: 'If not listed above' },
    ],
  },
];

const DISTRICTS = [
  'Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal',
  'Mymensingh', 'Rangpur', 'Gazipur', 'Narayanganj', 'Cumilla', 'Cox\'s Bazar', 'Other',
];

const STEP_LABELS = [
  'Account', 'Profile', 'Photo', 'Documents', 'Payout'
];

export default function WorkerRegister() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  if (!auth) {
    return (
      <section className="p-8 text-center text-red-400">
        AuthProvider not found. Wrap your app with &lt;AuthProvider&gt; in main.jsx.
      </section>
    );
  }

  const { createUser, signInWithGoogle } = auth;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uid, setUid] = useState(null);
  const [firebaseToken, setFirebaseToken] = useState(null);

  // Step 1 — Account
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
  });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Step 2 — Professional Profile
  const [profile, setProfile] = useState({
    bio: '', experienceYears: '', selectedServices: [],
    city: '', district: '',
  });
  const [serviceSearch, setServiceSearch] = useState('');

  const filteredServiceGroups = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return SERVICE_CATEGORY_GROUPS;
    return SERVICE_CATEGORY_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          (it.description && it.description.toLowerCase().includes(q)) ||
          g.title.toLowerCase().includes(q) ||
          (g.subtitle && g.subtitle.toLowerCase().includes(q))
      ),
    })).filter((g) => g.items.length > 0);
  }, [serviceSearch]);

  // Step 3 — Profile Photo
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef();

  // Step 4 — Documents
  const [nidNumber, setNidNumber] = useState('');
  const [nidFrontUrl, setNidFrontUrl] = useState('');
  const [nidBackUrl, setNidBackUrl] = useState('');
  const [nidFrontUploading, setNidFrontUploading] = useState(false);
  const [nidBackUploading, setNidBackUploading] = useState(false);
  const nidFrontRef = useRef();
  const nidBackRef = useRef();

  // Step 5 — Emergency & Payout
  const [emergency, setEmergency] = useState({ name: '', phone: '' });
  const [emergencyNidNumber, setEmergencyNidNumber] = useState('');
  const [emergencyNidFrontUrl, setEmergencyNidFrontUrl] = useState('');
  const [emergencyNidBackUrl, setEmergencyNidBackUrl] = useState('');
  const [emergencyNidFrontUploading, setEmergencyNidFrontUploading] = useState(false);
  const [emergencyNidBackUploading, setEmergencyNidBackUploading] = useState(false);
  const emergencyNidFrontRef = useRef();
  const emergencyNidBackRef = useRef();
  const [payout, setPayout] = useState({ provider: '', number: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(p => ({ ...p, [name]: value }));
  };

  const toggleService = (svc) => {
    setProfile(p => ({
      ...p,
      selectedServices: p.selectedServices.includes(svc)
        ? p.selectedServices.filter(s => s !== svc)
        : [...p.selectedServices, svc],
    }));
  };

  // ── File upload helpers ──────────────────────────────────────────────────
  async function uploadFile(file, endpoint, fieldName, token) {
    const fd = new FormData();
    fd.append(fieldName, file);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uid || !firebaseToken) { toast.error('Please complete account creation first'); return; }
    setPhotoUploading(true);
    try {
      const data = await uploadFile(file, `${API_BASE}/api/users/${uid}/avatar`, 'avatar', firebaseToken);
      setProfilePhotoUrl(data.url);
      toast.success('Profile photo uploaded!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleNidChange(side, e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uid || !firebaseToken) { toast.error('Please complete account creation first'); return; }
    
    let setUploading = side === 'front' ? setNidFrontUploading : setNidBackUploading;
    if (side === 'emergencyFront') setUploading = setEmergencyNidFrontUploading;
    if (side === 'emergencyBack') setUploading = setEmergencyNidBackUploading;

    setUploading(true);
    try {
      const data = await uploadFile(file, `${API_BASE}/api/users/${uid}/nid/${side}`, 'file', firebaseToken);
      if (side === 'front') setNidFrontUrl(data.url);
      else if (side === 'emergencyFront') setEmergencyNidFrontUrl(data.url);
      else if (side === 'emergencyBack') setEmergencyNidBackUrl(data.url);
      else setNidBackUrl(data.url);
      
      const sideLabel = side.includes('emergency') ? `Emergency ${side.includes('Front') ? 'Front' : 'Back'}` : side;
      toast.success(`NID ${sideLabel} photo uploaded!`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  // ── Step validators ──────────────────────────────────────────────────────
  function validateStep1() {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!BD_MOBILE_REGEX.test(form.phone.trim())) return 'Enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    if (!ageConfirmed) return 'You must confirm you are 18 or older.';
    if (!termsAccepted) return 'You must accept the Terms of Service.';
    if (!privacyAccepted) return 'You must accept the Privacy Policy.';
    return null;
  }

  function validateStep2() {
    if (profile.selectedServices.length === 0) return 'Select at least one service category.';
    if (!profile.city.trim()) return 'City is required.';
    if (!profile.district) return 'District is required.';
    return null;
  }

  function validateStep3() {
    if (!profilePhotoUrl) return 'Please upload your profile photo.';
    return null;
  }

  function validateStep4() {
    if (!NID_REGEX.test(nidNumber.trim())) return 'Enter a valid NID number (10 or 17 digits).';
    if (!nidFrontUrl) return 'Please upload the front of your NID card.';
    if (!nidBackUrl) return 'Please upload the back of your NID card.';
    return null;
  }

  function validateStep5() {
    if (!emergency.name.trim()) return 'Emergency contact name is required.';
    if (!BD_MOBILE_REGEX.test(emergency.phone.trim())) return 'Enter a valid emergency contact number.';
    if (!NID_REGEX.test(emergencyNidNumber.trim())) return 'Enter a valid Emergency Contact NID number (10 or 17 digits).';
    if (!emergencyNidFrontUrl || !emergencyNidBackUrl) return 'Please upload both front and back emergency contact NID pictures.';
    if (!payout.provider) return 'Select a payout wallet provider.';
    if (!BD_MOBILE_REGEX.test(payout.number.trim())) return 'Enter a valid wallet mobile number.';
    return null;
  }

  // ── Step 1: Create Firebase account ─────────────────────────────────────
  async function handleStep1Next() {
    const err = validateStep1();
    if (err) { toast.error(err); return; }
    if (uid) { setStep(2); return; } // already created, just go next

    setSubmitting(true);
    try {
      const cred = await createUser(form.email.trim(), form.password);
      const user = cred?.user;
      if (!user) throw new Error('Account creation failed.');
      const token = await user.getIdToken();
      setUid(user.uid);
      setFirebaseToken(token);

      await saveUserToApi(user, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        role: 'worker',
        workerAccountStatus: 'draft',
      });

      toast.success('Account created! Continue your profile.');
      setStep(2);
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'Registration failed.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Google Sign-In ───────────────────────────────────────────────────────
  async function handleGoogle() {
    if (!signInWithGoogle) { toast.error('Google sign-in is not configured.'); return; }
    setSubmitting(true);
    try {
      const cred = await signInWithGoogle();
      const user = cred?.user;
      if (!user) throw new Error('Google sign-in failed.');
      const token = await user.getIdToken();
      setUid(user.uid);
      setFirebaseToken(token);

      const names = (user.displayName || '').split(' ');
      setForm(f => ({
        ...f,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
      }));

      await saveUserToApi(user, { role: 'worker', workerAccountStatus: 'draft' });
      toast.success('Google sign-in successful! Continue your profile.');
      // Skip to step 2 — skip password step for Google users
      setStep(2);
    } catch (error) {
      let msg = 'Google sign-in failed.';
      if (error.code === 'auth/popup-closed-by-user') msg = 'Sign-in cancelled.';
      else if (error.code === 'auth/popup-blocked') msg = 'Popup blocked. Please allow popups.';
      else msg = error?.message || msg;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Final submit ─────────────────────────────────────────────────────────
  async function handleFinalSubmit() {
    const err = validateStep5();
    if (err) { toast.error(err); return; }
    if (!uid || !firebaseToken) { toast.error('Session expired. Please refresh and try again.'); return; }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        uid,
        fullLegalName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        city: profile.city.trim(),
        district: profile.district,
        country: 'Bangladesh',
        bio: profile.bio.trim(),
        experienceYears: Number(profile.experienceYears) || 0,
        servicesOffered: profile.selectedServices,
        nidNumber: nidNumber.trim(),
        nidFrontImageUrl: nidFrontUrl,
        nidBackImageUrl: nidBackUrl,
        profileCover: profilePhotoUrl,
        emergencyContactName: emergency.name.trim(),
        emergencyContactPhone: emergency.phone.trim(),
        emergencyContactNidNumber: emergencyNidNumber.trim(),
        emergencyContactNidFrontUrl: emergencyNidFrontUrl,
        emergencyContactNidBackUrl: emergencyNidBackUrl,
        payoutWalletProvider: payout.provider,        payoutWalletNumber: payout.number.trim(),
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        ageConfirmedAt: now,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      };

      const res = await fetch(`${API_BASE}/api/workers/registration/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data.error || 'Submission failed.');

      navigate('/registration/pending');
    } catch (error) {
      toast.error(error.message || 'Registration submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function nextStep() {
    const validators = [null, validateStep1, validateStep2, validateStep3, validateStep4, validateStep5];
    const err = validators[step]?.();
    if (err) { toast.error(err); return; }
    setStep(s => Math.min(5, s + 1));
  }

  function prevStep() {
    setStep(s => Math.max(1, s - 1));
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-primary/10 border border-primary/30">
            <span className="material-symbols-outlined text-primary text-sm">work</span>
            <span className="text-primary text-sm font-bold uppercase tracking-wider">Worker Registration</span>
          </div>
          <h1 className="text-3xl font-bold text-base-content mb-2">Join Hire Mistri</h1>
          <p className="text-base-content/50">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-bold">Sign in</Link>
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  i + 1 < step ? 'bg-primary text-primary-content' :
                  i + 1 === step ? 'bg-primary text-primary-content ring-4 ring-primary/30' :
                  'bg-base-300 text-base-content/40'
                }`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block font-medium ${i + 1 === step ? 'text-primary' : 'text-base-content/40'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-base-300 rounded-full mt-2">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 shadow-lg shadow-primary/20"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-base-200 border border-base-300 rounded-3xl p-8 shadow-xl">

          {/* ── STEP 1: Account ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-base-content mb-4">Account Setup</h2>

              {/* Google Sign-in */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={submitting || !!uid}
                className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-3 font-medium text-slate-200 transition-all duration-200 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg width="20" height="20" viewBox="0 0 48 48"><g><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></g></svg>
                {uid ? '✓ Account Created' : submitting ? 'Creating…' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-slate-500 text-sm">or with email</span>
                <div className="flex-1 h-px bg-slate-700" />
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
                  label={<>I agree to the <a href="#" className="text-[#1DC66C] underline">Terms of Service</a> (v{TERMS_VERSION})</>} />
                <CheckItem checked={privacyAccepted} onChange={setPrivacyAccepted}
                  label={<>I agree to the <a href="#" className="text-[#1DC66C] underline">Privacy Policy</a> (v{PRIVACY_VERSION})</>} />
              </div>

              <StepButton onClick={uid ? () => setStep(2) : handleStep1Next} loading={submitting} label={uid ? 'Next →' : 'Create Account & Continue →'} />
            </div>
          )}

          {/* ── STEP 2: Profile ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-white mb-4">Service Profile</h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Service Categories <span className="text-red-400">*</span></label>
                
                {/* Search Input */}
                <div className="relative mb-4">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Search — electrician, plumber, AC..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-800/50 border border-slate-700 text-white outline-none focus:border-[#1DC66C] transition-all"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                  />
                </div>

                {/* Grouped Categories */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredServiceGroups.length > 0 ? (
                    filteredServiceGroups.map((group) => (
                      <details key={group.id} className="group bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden" open={!!serviceSearch}>
                        <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-700/30 transition-colors list-none">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{group.title}</span>
                            {group.subtitle && <span className="text-[10px] text-slate-500 uppercase tracking-wider">{group.subtitle}</span>}
                          </div>
                          <span className="material-symbols-outlined text-slate-500 group-open:rotate-180 transition-transform">expand_more</span>
                        </summary>
                        <div className="p-3 pt-0 flex flex-wrap gap-2">
                          {group.items.map((item) => {
                            const val = `${group.id}:${item.id}`;
                            const isSelected = profile.selectedServices.includes(val);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                title={item.description}
                                onClick={() => toggleService(val)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                  isSelected
                                    ? 'bg-[#1DC66C] text-white border-[#1DC66C] shadow-lg shadow-[#1DC66C]/20'
                                    : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-500'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                      </details>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                      <p className="text-sm">No matches found. Try another word or pick 'Other'.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" name="city" value={profile.city} onChange={handleProfileChange} placeholder="e.g. Dhaka" />
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">District <span className="text-red-400">*</span></label>
                  <select
                    value={profile.district}
                    onChange={e => setProfile(p => ({ ...p, district: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-100 text-sm outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <option value="" className="bg-[#111111] text-slate-100">Select district…</option>
                    {DISTRICTS.map(d => <option key={d} value={d} className="bg-[#111111] text-slate-100">{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Years of Experience</label>
                <select
                  value={profile.experienceYears}
                  onChange={e => setProfile(p => ({ ...p, experienceYears: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-100 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="" className="bg-[#111111] text-slate-100">Select…</option>
                  {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} className="bg-[#111111] text-slate-100">{n === 0 ? 'Less than 1 year' : `${n}+ years`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Short Bio</label>
                <textarea
                  rows={3}
                  value={profile.bio}
                  onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell clients about your skills and work style…"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-100 text-sm outline-none resize-none placeholder-slate-500"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <BackButton onClick={prevStep} />
                <StepButton onClick={nextStep} label="Next →" />
              </div>
            </div>
          )}

          {/* ── STEP 3: Profile Photo ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-4">Profile Photo</h2>
              <p className="text-slate-400 text-sm">Upload a clear, professional photo of yourself. This builds trust with clients.</p>
              <div className="flex flex-col items-center gap-6">
                <div
                  className="w-36 h-36 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer group relative"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '2px dashed rgba(255,255,255,0.2)' }}
                  onClick={() => photoRef.current?.click()}
                >
                  {profilePhotoUrl ? (
                    <>
                      <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl">edit</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-slate-500">
                      <span className="material-symbols-outlined text-5xl block mb-2">{photoUploading ? 'hourglass_empty' : 'add_a_photo'}</span>
                      <span className="text-xs">{photoUploading ? 'Uploading…' : 'Click to upload'}</span>
                    </div>
                  )}
                </div>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  disabled={photoUploading}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
                  style={{ background: 'rgba(29,198,108,0.15)', border: '1px solid rgba(29,198,108,0.4)' }}
                >
                  {photoUploading ? 'Uploading…' : profilePhotoUrl ? 'Change Photo' : 'Choose Photo'}
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <BackButton onClick={prevStep} />
                <StepButton onClick={nextStep} label="Next →" />
              </div>
            </div>
          )}

          {/* ── STEP 4: Documents ── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-1">Identity Verification</h2>
              <p className="text-slate-400 text-sm">We need your NID (National Identity Card) to verify your identity and ensure platform safety.</p>

              <Input
                label="NID Number"
                value={nidNumber}
                onChange={e => setNidNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="10 or 17 digit NID number"
                type="text"
              />

              <div className="grid grid-cols-2 gap-4">
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

              <div className="rounded-xl p-4 text-sm text-amber-300"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                🔒 Your NID information is encrypted and only accessible to our verification team.
              </div>

              <div className="flex gap-3 pt-2">
                <BackButton onClick={prevStep} />
                <StepButton onClick={nextStep} label="Next →" />
              </div>
            </div>
          )}

          {/* ── STEP 5: Emergency & Payout ── */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white mb-1">Emergency & Payout</h2>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Contact Name" value={emergency.name} onChange={e => setEmergency(em => ({ ...em, name: e.target.value }))} placeholder="Family member name" />
                  <Input label="Contact Phone" value={emergency.phone} onChange={e => setEmergency(em => ({ ...em, phone: e.target.value }))} placeholder="01XXXXXXXXX" type="tel" />
                </div>
                <div className="mt-4">
                  <Input 
                    label="Emergency Contact NID Number" 
                    value={emergencyNidNumber} 
                    onChange={e => setEmergencyNidNumber(e.target.value.replace(/\D/g, ''))} 
                    placeholder="10 or 17 digit NID number" 
                    type="text" 
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
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

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">Payout Wallet</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {['bkash', 'nagad', 'rocket'].map(provider => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setPayout(p => ({ ...p, provider }))}
                      className={`py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
                        payout.provider === provider
                          ? 'text-white'
                          : 'text-slate-400 border border-slate-700'
                      }`}
                      style={payout.provider === provider ? {
                        background: provider === 'bkash' ? '#E2136E' : provider === 'nagad' ? '#F4821F' : '#8B228B',
                        border: 'none',
                      } : {}}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
                {payout.provider && (
                  <Input
                    label={`${payout.provider.charAt(0).toUpperCase() + payout.provider.slice(1)} Number`}
                    value={payout.number}
                    onChange={e => setPayout(p => ({ ...p, number: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                    type="tel"
                  />
                )}
              </div>

              <div className="rounded-xl p-4 text-sm text-slate-300"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-medium mb-1">📋 What happens next?</p>
                <p className="text-slate-400 text-xs">Your application will be reviewed by our team within 24–48 hours. You'll receive an email confirmation once your account is approved.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <BackButton onClick={prevStep} />
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 px-6 rounded-xl text-primary-content bg-primary hover:bg-primary/90 font-bold text-base transition-all duration-200 disabled:opacity-60 shadow-lg shadow-primary/20 hover:shadow-xl"
                >
                  {submitting ? 'Submitting…' : '🚀 Submit Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, placeholder, name, disabled }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl text-slate-100 text-sm outline-none transition-all placeholder-slate-500 disabled:opacity-50"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        onFocus={e => (e.target.style.borderColor = 'rgba(29,198,108,0.5)')}
        onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
      />
    </div>
  );
}

function CheckItem({ checked, onChange, label }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${checked ? 'bg-[#1DC66C]' : 'bg-slate-700 border border-slate-600'}`}
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <span className="text-sm text-slate-300 leading-tight" onClick={() => onChange(!checked)}>{label}</span>
    </label>
  );
}

function StepButton({ onClick, loading, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex-1 py-3 px-6 rounded-xl text-white font-bold text-base transition-all duration-200 disabled:opacity-60"
      style={{ background: 'linear-gradient(135deg, #1DC66C, #16a85a)' }}
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
      className="px-5 py-3 rounded-xl text-slate-400 font-medium transition-all hover:text-white"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      ← Back
    </button>
  );
}

function NidUpload({ label, url, uploading, inputRef, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label} <span className="text-red-400">*</span></label>
      <div
        className="h-32 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group relative"
        style={{ background: 'rgba(255,255,255,0.04)', border: url ? '2px solid rgba(29,198,108,0.4)' : '2px dashed rgba(255,255,255,0.15)' }}
        onClick={() => inputRef.current?.click()}
      >
        {url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="material-symbols-outlined text-white text-2xl">edit</span>
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500">
            <span className="material-symbols-outlined text-3xl block mb-1">{uploading ? 'hourglass_empty' : 'id_card'}</span>
            <span className="text-xs">{uploading ? 'Uploading…' : 'Click to upload'}</span>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onChange} />
    </div>
  );
}
