import React, { useContext, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { AuthContext } from "../Authentication/AuthProvider";
import { useProfile } from "../contexts/ProfileContext";
import PageContainer from "../components/layout/PageContainer";

const base = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

/* ---------------------------- Tiny Tag Input ---------------------------- */
function TagInput({ value = [], onChange, label, placeholder = "Type and press Enter" }) {
  const [t, setT] = useState("");
  const add = () => {
    const v = t.trim();
    if (!v) return;
    if (!value.includes(v)) onChange([...value, v]);
    setT("");
  };
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className="input input-bordered w-full"
          placeholder={placeholder}
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button type="button" className="btn" onClick={add}>Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((s, i) => (
          <span key={i} className="badge badge-outline gap-2">
            {s}
            <button type="button" className="ml-1 text-xs" onClick={() => remove(i)}>✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- Multi-Select ---------------------------- */
function MultiSelect({ value = [], onChange, label, options, placeholder = "Select..." }) {
  const toggle = (option) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`btn btn-sm ${value.includes(opt) ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="mt-2 text-sm text-base-content opacity-70">
          Selected: {value.join(", ")}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */
export default function WorkerProfile() {
  const { user, sendVerificationEmail, reloadUser, updateProfileDisplayName } = useContext(AuthContext) || {};
  const { setProfile: setSharedProfile } = useProfile();
  const uid = user?.uid || null;
  const [sendingVerification, setSendingVerification] = useState(false);

  const [tab, setTab] = useState("overview"); // overview | edit | password
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    phone: "",
    workExperience: "",
    experienceYears: "",
    email: "",
    headline: "",
    bio: "",
    skills: [],
    isAvailable: true,
    profileCover: null,
    address1: "",
    address2: "",
    city: "",
    country: "Bangladesh",
    zip: "",
    // New trust fields
    servicesOffered: { categories: [], tags: [] },
    serviceArea: { cities: [], radiusKm: null },
    certifications: [],
    languages: [],
    pricing: { hourlyRate: null, startingPrice: null, minimumCharge: null, currency: "BDT" },
    portfolio: [],
    emailVerified: false,
  });

  const serviceCategories = ["Plumber", "Electrician", "Carpenter", "Painter", "Mechanic", "AC Repair", "Appliance Repair", "Mason", "Welder", "Other"];
  const languageOptions = ["Bengali", "English", "Hindi", "Urdu", "Arabic"];

  const requiredFields = ["firstName", "lastName", "displayName", "email", "phone", "workExperience"];
  const isValid = useMemo(() => {
    const basicValid = requiredFields.every((f) => String(profile[f] || "").trim() !== "");
    const hasPhoto = !!profile.profileCover;
    return basicValid && hasPhoto; // Require profile photo
  }, [profile]);

  const update = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const handleChange = (e) => update(e.target.name, e.target.value);

  /* ------------------------- Avatar upload ------------------------ */
  const uploadAvatar = async (file) => {
    if (!uid) throw new Error("User ID is required");
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch(`${base}/api/users/${uid}/avatar`, { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Avatar upload failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    const url = data?.url;
    if (!url) throw new Error("No image URL returned");
    return url;
  };

  /* ------------------------- Portfolio upload ------------------------ */
  const uploadPortfolioImage = async (file) => {
    const fd = new FormData();
    fd.append("images", file);
    const res = await fetch(`${base}/api/browse-jobs/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Portfolio upload failed (HTTP ${res.status})`);
    const data = await res.json();
    const url = data?.imageUrls?.[0];
    if (!url) throw new Error("No image URL returned");
    return url;
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles?.[0];
    if (!file) return;
    if (!uid) {
      toast.error("Please log in to upload profile photo");
      return;
    }
    try {
      setSaving(true);
      const url = await uploadAvatar(file);
      // Update local state
      update("profileCover", url);
      // Refresh profile to ensure sync (server already saved it)
      const res = await fetch(`${base}/api/users/${uid}`);
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => ({ ...prev, profileCover: updated.profileCover || url }));
      }
      toast.success("Profile photo updated and saved!");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to upload image");
    } finally {
      setSaving(false);
    }
  };

  const onPortfolioDrop = async (acceptedFiles) => {
    try {
      setSaving(true);
      const uploads = await Promise.all(acceptedFiles.map(uploadPortfolioImage));
      const newPortfolio = uploads.map(url => ({ url, caption: "", createdAt: new Date() }));
      update("portfolio", [...(profile.portfolio || []), ...newPortfolio]);
      toast.success(`${uploads.length} image(s) added to portfolio`);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to upload portfolio images");
    } finally {
      setSaving(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
  });

  const { getRootProps: getPortfolioRootProps, getInputProps: getPortfolioInputProps } = useDropzone({
    onDrop: onPortfolioDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  /* ------------------------------ Load profile ------------------------------ */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        if (uid) {
          const res = await fetch(`${base}/api/users/${uid}`);
          if (res.ok) {
            const data = await res.json();
            if (!ignore) {
              setProfile((prev) => ({
                ...prev,
                ...data,
                skills: Array.isArray(data.skills) ? data.skills : [],
                languages: Array.isArray(data.languages) ? data.languages : [],
                servicesOffered: data.servicesOffered || { categories: [], tags: [] },
                serviceArea: data.serviceArea || { cities: [], radiusKm: null },
                certifications: Array.isArray(data.certifications) ? data.certifications : [],
                portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
                pricing: data.pricing || { hourlyRate: null, startingPrice: null, minimumCharge: null, currency: "BDT" },
                experienceYears: data.experienceYears || data.workExperience || "",
                isAvailable: data.isAvailable ?? true,
                emailVerified: data.emailVerified || false,
              }));
              setStats(data.stats || null);
            }
          } else {
            const saved = JSON.parse(localStorage.getItem("workerProfile") || "null");
            if (saved && !ignore) setProfile((p) => ({ ...p, ...saved }));
          }
        } else {
          const saved = JSON.parse(localStorage.getItem("workerProfile") || "null");
          if (saved && !ignore) setProfile((p) => ({ ...p, ...saved }));
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load profile");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [uid]);

  /* --------------------------------- Save --------------------------------- */
  const saveToServer = async () => {
    const payload = {
      ...profile,
      uid,
      role: "worker",
      email: String(profile.email || "").toLowerCase(),
      isAvailable: !!profile.isAvailable,
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      experienceYears: Number(profile.experienceYears || profile.workExperience || 0) || null,
      updatedAt: new Date(),
    };
    const res = await fetch(`${base}/api/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Save failed (HTTP ${res.status})`);
    }
    return await res.json();
  };

  const handleSave = async () => {
    if (!profile.profileCover) {
      return toast.error("Profile photo is required. Please upload a photo first.");
    }
    if (!isValid) return toast.error("Please fill in all required fields.");
    try {
      setSaving(true);
      if (uid) {
        const updated = await saveToServer();
        setProfile(prev => ({ ...prev, ...updated }));
        setStats(updated.stats || null);
        // Update shared profile context immediately so Navbar shows new name
        setSharedProfile(prev => (prev ? { ...prev, ...updated } : updated));
        // Sync name to Firebase Auth so it updates everywhere (Navbar, etc.)
        const newName = updated.displayName || [updated.firstName, updated.lastName].filter(Boolean).join(' ').trim();
        if (newName && updateProfileDisplayName) {
          try {
            await updateProfileDisplayName(newName);
            await reloadUser();
          } catch (e) {
            console.warn('Could not sync name to Firebase Auth:', e);
          }
        }
        // Notify other listeners (e.g. Navbar event fallback)
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { ...updated, stats: updated.stats } }));
      } else {
        localStorage.setItem("workerProfile", JSON.stringify(profile));
      }
      toast.success("Profile saved successfully!");
      setTab("overview");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProfile({
      firstName: "",
      lastName: "",
      displayName: "",
      phone: "",
      workExperience: "",
      experienceYears: "",
      email: "",
      headline: "",
      bio: "",
      skills: [],
      isAvailable: true,
      profileCover: null,
      address1: "",
      address2: "",
      city: "",
      country: "Bangladesh",
      zip: "",
      servicesOffered: { categories: [], tags: [] },
      serviceArea: { cities: [], radiusKm: null },
      certifications: [],
      languages: [],
      pricing: { hourlyRate: null, startingPrice: null, minimumCharge: null, currency: "BDT" },
      portfolio: [],
      emailVerified: false,
    });
    toast("Profile cleared.", { icon: "🧹" });
  };

  const addCertification = () => {
    update("certifications", [...(profile.certifications || []), { title: "", issuer: "", year: null, proofUrl: "" }]);
  };

  const updateCertification = (index, field, value) => {
    const certs = [...(profile.certifications || [])];
    certs[index] = { ...certs[index], [field]: value };
    update("certifications", certs);
  };

  const removeCertification = (index) => {
    update("certifications", (profile.certifications || []).filter((_, i) => i !== index));
  };

  const removePortfolioItem = (index) => {
    update("portfolio", (profile.portfolio || []).filter((_, i) => i !== index));
  };

  const updatePortfolioCaption = (index, caption) => {
    const portfolio = [...(profile.portfolio || [])];
    portfolio[index] = { ...portfolio[index], caption };
    update("portfolio", portfolio);
  };

  const handleSendVerificationEmail = async () => {
    try {
      setSendingVerification(true);
      await sendVerificationEmail();
      toast.success("Verification email sent! Please check your inbox.");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to send verification email");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      await reloadUser();
      if (user?.emailVerified) {
        // Sync to server
        await fetch(`${base}/api/users/${uid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailVerified: true }),
        });
        update("emailVerified", true);
        toast.success("Email verified!");
      } else {
        toast("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to check verification status");
    }
  };

  /* ------------------------------ Derived fields ----------------------------- */
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.displayName || "—";
  const secondaryLine = profile.phone || uid || "—";
  const addressPretty = [profile.address1, profile.address2, profile.city, profile.country, profile.zip]
    .filter(Boolean).join(", ");

  const aboutText =
    (profile.bio && profile.bio.trim()) ||
    (profile.headline && profile.headline.trim()) ||
    "This worker hasn't written an about section yet. Add a short intro in Edit Profile.";

  const fieldOfInterest = profile.skills?.[0] || "—";

  if (loading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="min-h-screen page-bg">
      <Toaster />

      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-base-content mb-4">
              My Profile
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Manage your professional information and showcase your skills to potential employers.
            </p>
          </div>
        </div>
      </div>

      <PageContainer className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Profile Card */}
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-3xl p-6 flex flex-col items-center border border-gray-100 dark:border-gray-700">
            <div className="relative mb-4">
              <div
                {...getRootProps()}
                className={`relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary-200 dark:ring-primary-800 cursor-pointer group transition-all duration-300 hover:ring-primary-400 dark:hover:ring-primary-600 ${!profile.profileCover ? 'ring-red-300 dark:ring-red-700' : ''}`}
                title="Click or drag to upload photo"
              >
                <input {...getInputProps()} />
                <img
                  src={profile.profileCover || "/default-profile.png"}
                  alt="profile"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e)=> (e.currentTarget.src="/default-profile.png")}
                />
                <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white`}>
                  <div className="text-center">
                    <i className="fas fa-camera text-2xl mb-2"></i>
                    <p className="text-sm font-medium">
                      {isDragActive ? "Drop to upload" : "Click to upload"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Status Indicator */}
              {profile.profileCover && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                  <i className="fas fa-check text-white text-sm"></i>
                </div>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-heading font-bold text-base-content mb-2">{fullName}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{secondaryLine}</p>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {user?.emailVerified || profile.emailVerified ? (
                  <span className="badge badge-success gap-1">
                    <i className="fas fa-check-circle"></i>Email Verified
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="badge badge-warning gap-1">
                      <i className="fas fa-exclamation-triangle"></i>Email Not Verified
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-primary"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                      title="Send verification email"
                    >
                      {sendingVerification ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-envelope"></i> Verify
                        </>
                      )}
                    </button>
                  </div>
                )}
                {profile.createdAt && (
                  <span className="badge badge-outline gap-1 text-xs">
                    <i className="fas fa-calendar"></i>Member since {new Date(profile.createdAt).getFullYear()}
                  </span>
                )}
              </div>
              
              {/* Profile Stats */}
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-lg font-heading font-bold text-primary-600 dark:text-primary-400">
                    {stats?.averageRating?.toFixed(1) || "0.0"}
                  </div>
                  <div className="text-xs text-base-content opacity-70">Rating</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-lg font-heading font-bold text-primary-600 dark:text-primary-400">
                    {stats?.workerCompletedJobs || 0}
                  </div>
                  <div className="text-xs text-base-content opacity-70">Jobs Done</div>
                </div>
                {stats?.workerResponseRate !== undefined && (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center col-span-2">
                    <div className="text-lg font-heading font-bold text-primary-600 dark:text-primary-400">
                      {stats.workerResponseRate}%
                    </div>
                    <div className="text-xs text-base-content opacity-70">Response Rate</div>
                  </div>
                )}
              </div>
              
              {/* Availability Status */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                profile.isAvailable 
                  ? 'badge-success' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  profile.isAvailable ? 'bg-primary' : 'bg-error'
                }`}></div>
                {profile.isAvailable ? 'Available for work' : 'Not available'}
              </div>
            </div>
          </div>

          {/* Enhanced Tabs + Content */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 shadow-2xl rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Enhanced Tabs */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
              <div className="flex space-x-1">
                <button 
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    tab === "overview" 
                      ? "bg-primary-500 text-white shadow-lg" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-primary-600 dark:hover:text-primary-400"
                  }`} 
                  onClick={() => setTab("overview")}
                >
                  <i className="fas fa-eye mr-2"></i>
                  Overview
                </button>
                <button 
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    tab === "edit" 
                      ? "bg-primary-500 text-white shadow-lg" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-primary-600 dark:hover:text-primary-400"
                  }`} 
                  onClick={() => setTab("edit")}
                >
                  <i className="fas fa-edit mr-2"></i>
                  Edit Profile
                </button>
                <button 
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    tab === "password" 
                      ? "bg-primary-500 text-white shadow-lg" 
                      : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 hover:text-primary-600 dark:hover:text-primary-400"
                  }`} 
                  onClick={() => setTab("password")}
                >
                  <i className="fas fa-key mr-2"></i>
                  Change Password
                </button>
              </div>
            </div>

            {/* Tab bodies */}
            <div className="px-6 py-6">
              {/* =============== OVERVIEW =============== */}
              {tab === "overview" && (
                <div className="space-y-8">
                  {/* Performance Signals */}
                  {stats && (
                    <section>
                      <h3 className="text-lg font-semibold mb-4 text-base-content">Performance Metrics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.workerCompletedJobs || 0}</div>
                          <div className="text-sm text-base-content opacity-70">Completed Jobs</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.workerActiveOrders || 0}</div>
                          <div className="text-sm text-base-content opacity-70">Active Orders</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.workerResponseRate || 0}%</div>
                          <div className="text-sm text-base-content opacity-70">Response Rate</div>
                        </div>
                        {stats.workerResponseTimeHours && (
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.workerResponseTimeHours}h</div>
                            <div className="text-sm text-base-content opacity-70">Avg Response</div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* About */}
                  <section>
                    <h3 className="text-lg font-semibold mb-4 text-base-content">About</h3>
                    <p className="leading-relaxed text-base-content opacity-80">{aboutText}</p>
                  </section>

                  {/* Services Offered */}
                  {(profile.servicesOffered?.categories?.length > 0 || profile.servicesOffered?.tags?.length > 0) && (
                    <section>
                      <h3 className="text-lg font-semibold mb-4 text-base-content">Services Offered</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {profile.servicesOffered.categories.map((cat, i) => (
                          <span key={i} className="badge badge-primary">{cat}</span>
                        ))}
                        {profile.servicesOffered.tags.map((tag, i) => (
                          <span key={i} className="badge badge-outline">{tag}</span>
                        ))}
                      </div>
                      {profile.serviceArea?.cities?.length > 0 && (
                        <p className="text-sm text-base-content opacity-70">
                          <i className="fas fa-map-marker-alt mr-2"></i>
                          Service Area: {profile.serviceArea.cities.join(", ")}
                          {profile.serviceArea.radiusKm && ` (within ${profile.serviceArea.radiusKm} km)`}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Pricing */}
                  {(profile.pricing?.hourlyRate || profile.pricing?.startingPrice || profile.pricing?.minimumCharge) && (
                    <section>
                      <h3 className="text-lg font-semibold mb-4 text-base-content">Pricing</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        {profile.pricing.hourlyRate && (
                          <div className="mb-2">
                            <span className="text-sm text-base-content opacity-70">Hourly Rate: </span>
                            <span className="font-semibold text-base-content">{profile.pricing.currency} {profile.pricing.hourlyRate}</span>
                          </div>
                        )}
                        {profile.pricing.startingPrice && (
                          <div className="mb-2">
                            <span className="text-sm text-base-content opacity-70">Starting Price: </span>
                            <span className="font-semibold text-base-content">{profile.pricing.currency} {profile.pricing.startingPrice}</span>
                          </div>
                        )}
                        {profile.pricing.minimumCharge && (
                          <div>
                            <span className="text-sm text-base-content opacity-70">Minimum Charge: </span>
                            <span className="font-semibold text-base-content">{profile.pricing.currency} {profile.pricing.minimumCharge}</span>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Portfolio */}
                  {profile.portfolio?.length > 0 && (
                    <section>
                      <h3 className="text-lg font-semibold mb-4 text-base-content">Portfolio</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {profile.portfolio.map((item, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={item.url}
                              alt={item.caption || `Portfolio ${i + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            {item.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 rounded-b-lg">
                                {item.caption}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Certifications */}
                  {profile.certifications?.length > 0 && (
                    <section>
                      <h3 className="text-lg font-semibold mb-4 text-base-content">Certifications</h3>
                      <div className="space-y-2">
                        {profile.certifications.map((cert, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="font-semibold text-base-content">{cert.title}</div>
                            {cert.issuer && <div className="text-sm text-base-content opacity-70">Issued by: {cert.issuer}</div>}
                            {cert.year && <div className="text-sm text-base-content opacity-70">Year: {cert.year}</div>}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Languages */}
                  {profile.languages?.length > 0 && (
                    <section>
                      <h3 className="text-lg font-semibold mb-4 text-base-content">Languages</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang, i) => (
                          <span key={i} className="badge badge-outline">{lang}</span>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Profile details */}
                  <section>
                    <h3 className="text-lg font-semibold mb-4 text-base-content">Profile Details</h3>
                    <div className="rounded-xl border dark:border-gray-600 bg-base-100 dark:bg-gray-700 overflow-hidden">
                      {[
                        ["Full Name", fullName],
                        ["Phone", profile.phone || "—"],
                        ["Email", profile.email || "—"],
                        ["Address", addressPretty || "—"],
                        ["Work Experience", (profile.experienceYears || profile.workExperience) ? `${profile.experienceYears || profile.workExperience} year${Number(profile.experienceYears || profile.workExperience) > 1 ? "s" : ""}` : "—"],
                        ["Availability", profile.isAvailable ? "Available for work" : "Not available"],
                        ["Headline", profile.headline || "—"],
                        [
                          "Skills",
                          Array.isArray(profile.skills) && profile.skills.length
                            ? (
                                <div className="flex flex-wrap gap-2">
                                  {profile.skills.map((s, i) => (
                                    <span key={i} className="badge badge-outline">{s}</span>
                                  ))}
                                </div>
                              )
                            : "—"
                        ],
                        ["Field of Interest", fieldOfInterest],
                      ].map(([label, value], i) => (
                        <div key={i} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 px-4 ${i ? "border-t dark:border-gray-600" : ""}`}>
                          <span className="text-gray-500 dark:text-gray-400">{label}</span>
                          <span className="sm:col-span-2 font-medium text-base-content break-words">
                            {typeof value === "string" || typeof value === "number" ? value : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* ========================= EDIT PROFILE ========================= */}
              {tab === "edit" && (
                <div className="space-y-8">
                  {/* Email Verification Warning */}
                  {!(user?.emailVerified || profile.emailVerified) && (
                    <div className="alert alert-warning mb-4">
                      <i className="fas fa-exclamation-triangle"></i>
                      <div className="flex-1">
                        <span className="font-semibold">Email not verified.</span>
                        <p className="text-sm mt-1">Please verify your email to unlock all features.</p>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleSendVerificationEmail}
                            disabled={sendingVerification}
                          >
                            {sendingVerification ? "Sending..." : "Send Verification Email"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={handleCheckVerification}
                          >
                            Check Status
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Profile Photo Requirement Warning */}
                  {!profile.profileCover && (
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Profile photo is required. Please upload a photo to save your profile.</span>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-base-content">Account</h3>
                      <label className="label cursor-pointer gap-3">
                        <span className="label-text text-base-content opacity-80">Available for work</span>
                        <input
                          type="checkbox"
                          className="toggle toggle-success"
                          checked={!!profile.isAvailable}
                          onChange={(e) => update("isAvailable", e.target.checked)}
                        />
                      </label>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { label: "First Name", name: "firstName" },
                      { label: "Last Name", name: "lastName" },
                      { label: "Display Name", name: "displayName" },
                      { label: "Work Experience (years)", name: "workExperience", type: "number" },
                      { label: "Phone Number", name: "phone", type: "tel" },
                      { label: "Email", name: "email", type: "email" },
                    ].map(({ label, name, type = "text" }) => (
                      <div key={name}>
                        <label className="block text-sm font-medium mb-1 text-base-content opacity-80">{label}</label>
                        <input
                          type={type}
                          name={name}
                          value={profile[name]}
                          onChange={handleChange}
                          className="input input-bordered w-full"
                          required
                        />
                      </div>
                    ))}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Headline (optional)</label>
                      <input
                        type="text"
                        name="headline"
                        value={profile.headline}
                        onChange={handleChange}
                        placeholder="e.g., Certified Electrician | 5+ years"
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Bio (optional)</label>
                      <textarea
                        name="bio"
                        value={profile.bio}
                        onChange={handleChange}
                        placeholder="Tell clients about your experience and specialties…"
                        className="textarea textarea-bordered w-full min-h-[110px]"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <TagInput
                        label="Skills (optional)"
                        value={profile.skills}
                        onChange={(v) => update("skills", v)}
                        placeholder="e.g., Wiring, Installation, Troubleshooting"
                      />
                    </div>
                  </div>
                  </div>

                  <div className="divider text-base-content opacity-80">Services Offered</div>

                  <div className="space-y-6">
                    <MultiSelect
                      label="Service Categories"
                      value={profile.servicesOffered?.categories || []}
                      onChange={(cats) => update("servicesOffered", { ...profile.servicesOffered, categories: cats })}
                      options={serviceCategories}
                    />
                    <TagInput
                      label="Service Tags (optional)"
                      value={profile.servicesOffered?.tags || []}
                      onChange={(tags) => update("servicesOffered", { ...profile.servicesOffered, tags })}
                      placeholder="e.g., Emergency, 24/7, Commercial"
                    />
                  </div>

                  <div className="divider text-base-content opacity-80">Service Area</div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <TagInput
                      label="Cities (add cities you serve)"
                      value={profile.serviceArea?.cities || []}
                      onChange={(cities) => update("serviceArea", { ...profile.serviceArea, cities })}
                      placeholder="e.g., Dhaka, Chittagong"
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Service Radius (km, optional)</label>
                      <input
                        type="number"
                        value={profile.serviceArea?.radiusKm || ""}
                        onChange={(e) => update("serviceArea", { ...profile.serviceArea, radiusKm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 10"
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>

                  <div className="divider text-base-content opacity-80">Experience & Credentials</div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Years of Experience</label>
                      <input
                        type="number"
                        value={profile.experienceYears || profile.workExperience || ""}
                        onChange={(e) => {
                          update("experienceYears", e.target.value);
                          update("workExperience", e.target.value);
                        }}
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-base-content opacity-80">Certifications</label>
                        <button type="button" className="btn btn-sm btn-outline" onClick={addCertification}>
                          <i className="fas fa-plus mr-1"></i>Add Certification
                        </button>
                      </div>
                      {profile.certifications?.map((cert, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-2">
                          <div className="grid md:grid-cols-2 gap-4 mb-2">
                            <input
                              type="text"
                              placeholder="Certification Title"
                              value={cert.title || ""}
                              onChange={(e) => updateCertification(i, "title", e.target.value)}
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="text"
                              placeholder="Issuer"
                              value={cert.issuer || ""}
                              onChange={(e) => updateCertification(i, "issuer", e.target.value)}
                              className="input input-bordered input-sm"
                            />
                            <input
                              type="number"
                              placeholder="Year"
                              value={cert.year || ""}
                              onChange={(e) => updateCertification(i, "year", e.target.value ? Number(e.target.value) : null)}
                              className="input input-bordered input-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Proof URL (optional)"
                                value={cert.proofUrl || ""}
                                onChange={(e) => updateCertification(i, "proofUrl", e.target.value)}
                                className="input input-bordered input-sm flex-1"
                              />
                              <button type="button" className="btn btn-sm btn-error" onClick={() => removeCertification(i)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <MultiSelect
                      label="Languages Spoken"
                      value={profile.languages || []}
                      onChange={(langs) => update("languages", langs)}
                      options={languageOptions}
                    />
                  </div>

                  <div className="divider my-1 text-base-content opacity-80">Pricing</div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Hourly Rate ({profile.pricing?.currency || "BDT"})</label>
                      <input
                        type="number"
                        value={profile.pricing?.hourlyRate || ""}
                        onChange={(e) => update("pricing", { ...profile.pricing, hourlyRate: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 500"
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Starting Price ({profile.pricing?.currency || "BDT"})</label>
                      <input
                        type="number"
                        value={profile.pricing?.startingPrice || ""}
                        onChange={(e) => update("pricing", { ...profile.pricing, startingPrice: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 1000"
                        className="input input-bordered w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Minimum Charge ({profile.pricing?.currency || "BDT"})</label>
                      <input
                        type="number"
                        value={profile.pricing?.minimumCharge || ""}
                        onChange={(e) => update("pricing", { ...profile.pricing, minimumCharge: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 500"
                        className="input input-bordered w-full"
                      />
                    </div>
                  </div>

                  <div className="divider my-1 text-base-content opacity-80">Portfolio</div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-base-content opacity-80">Portfolio Images</label>
                    <div
                      {...getPortfolioRootProps()}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                    >
                      <input {...getPortfolioInputProps()} />
                      <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                      <p className="text-base-content opacity-70">Drag & drop images here, or click to select</p>
                      <p className="text-sm text-base-content opacity-50 mt-1">Multiple images supported</p>
                    </div>
                    {profile.portfolio?.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {profile.portfolio.map((item, i) => (
                          <div key={i} className="relative group">
                            <img src={item.url} alt={`Portfolio ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                            <button
                              type="button"
                              className="absolute top-1 right-1 btn btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removePortfolioItem(i)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                            <input
                              type="text"
                              placeholder="Caption (optional)"
                              value={item.caption || ""}
                              onChange={(e) => updatePortfolioCaption(i, e.target.value)}
                              className="input input-xs input-bordered w-full mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="divider my-1 text-base-content opacity-80">Address</div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Address Line 1</label>
                      <input type="text" name="address1" value={profile.address1} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Address Line 2</label>
                      <input type="text" name="address2" value={profile.address2} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">City</label>
                      <input type="text" name="city" value={profile.city} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Country/Region</label>
                      <select name="country" value={profile.country} onChange={handleChange} className="select select-bordered w-full">
                        <option>Bangladesh</option>
                        <option>India</option>
                        <option>USA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Zip/Postal Code</label>
                      <input type="text" name="zip" value={profile.zip} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-end pt-2">
                    <button onClick={handleReset} className="btn btn-outline btn-error" type="button">❌ Reset</button>
                    <button onClick={handleSave} disabled={!isValid || saving} className="btn btn-primary">
                      {saving ? "Saving…" : "💾 Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* ========================= CHANGE PASSWORD ========================= */}
              {tab === "password" && (
                <div className="space-y-6 max-w-lg">
                  <h3 className="text-lg font-semibold text-base-content">Change Password</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Current Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">New Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-base-content opacity-80">Confirm New Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                  </div>
                  <div>
                    <button className="btn btn-primary" type="button" onClick={() => toast("Hook this up to your auth.", { icon: "🔐" })}>
                      Update Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
