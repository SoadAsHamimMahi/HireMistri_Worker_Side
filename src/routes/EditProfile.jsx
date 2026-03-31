import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import { useProfile } from '../contexts/ProfileContext';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const normalizeProfileImageUrl = (raw) => {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${base}${parsed.pathname}`;
    }
    return raw;
  } catch {
    if (raw.startsWith("/uploads/")) return `${base}${raw}`;
    return raw;
  }
};

const SERVICE_CATEGORY_GROUPS = [
  {
    id: 'home-repair-trades',
    title: 'Home Repair & Trades',
    items: [
      { id: 'electrician', label: 'Electrician' },
      { id: 'plumber', label: 'Plumber' },
      { id: 'ac-service', label: 'AC Service & Repair' },
      { id: 'carpenter', label: 'Carpenter' },
      { id: 'painter', label: 'Painter' },
      { id: 'mason', label: 'Mason / Civil' },
      { id: 'tile-marble', label: 'Tile & Marble Fix' },
      { id: 'welder', label: 'Welder / Fabrication' },
      { id: 'gypsum', label: 'Gypsum / False Ceiling' },
      { id: 'glass-alum', label: 'Glass & Aluminium' },
    ],
  },
  {
    id: 'install-mounting',
    title: 'Install & Mounting',
    items: [
      { id: 'general-install', label: 'Fan, Light & Appliance' },
      { id: 'mounting-decor', label: 'Curtain, Mirror & Shelves' },
      { id: 'tv-mount', label: 'TV Wall Mount' },
      { id: 'water-filter', label: 'Water Filter / Geyser' },
    ],
  },
  {
    id: 'other',
    title: 'Specialized / Other',
    items: [
      { id: 'cleaning', label: 'Cleaning Service' },
      { id: 'security', label: 'Security Guard' },
      { id: 'gardening', label: 'Gardening' },
      { id: 'other', label: 'Other' },
    ],
  },
];

function decodeServiceSlug(slug) {
  if (!slug || !slug.includes(':')) return slug;
  const [gid, iid] = slug.split(':');
  const group = SERVICE_CATEGORY_GROUPS.find(g => g.id === gid);
  if (!group) return slug;
  const item = group.items.find(i => i.id === iid);
  return item ? item.label : slug;
}

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
      <label className="block text-sm font-medium mb-1 text-white/80">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className="input input-bordered w-full bg-[#111111] border-white/10 text-white placeholder-white/30 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
          placeholder={placeholder}
          value={t}
          onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button type="button" className="btn btn-primary rounded-xl" onClick={add}>Add</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((s, i) => (
          <span key={i} className="badge badge-outline gap-2 border-white/20 text-white/80 px-3 py-3 rounded-xl bg-white/5">
            {s}
            <button type="button" className="ml-1 text-xs hover:text-red-400 cursor-pointer" onClick={() => remove(i)}>×</button>
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
      <label className="block text-sm font-medium mb-1 text-white/80">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            className={`btn btn-sm rounded-xl py-1 px-4 border ${value.includes(opt) ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30' : 'bg-[#111111] border-white/10 text-white/70 hover:bg-white/5 hover:text-white'}`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div className="mt-2 text-sm text-white/50">
          Selected: {value.join(", ")}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Detail Item -------------------------------- */
function DetailItem({ label, value, icon, bold, chip }) {
  if (!value) value = "—";
  return (
    <div className="flex flex-col gap-1 text-left">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-base text-white/30">{icon}</span>}
        {chip ? (
           <span className="bg-[#1ec86d]/10 border border-[#1ec86d]/20 px-3 py-1 rounded-lg text-[10px] font-bold text-[#1ec86d] uppercase tracking-wider">{value}</span>
        ) : (
           <p className={`text-sm ${bold ? "font-bold text-white" : "text-white/80"}`}>{value}</p>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Main Component ----------------------------- */
export default function EditProfile() {
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
    fullLegalName: "",
    phone: "",
    workExperience: "",
    experienceYears: "",
    email: "",
    headline: "",
    bio: "",
    isAvailable: true,
    profileCover: null,
    nidFrontImageUrl: "",
    nidBackImageUrl: "",
    nidNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactNidNumber: "",
    emergencyContactNidFrontUrl: "",
    emergencyContactNidBackUrl: "",
    payoutWalletProvider: "",
    payoutWalletNumber: "",
    address1: "",
    address2: "",
    city: "",
    district: "",
    country: "Bangladesh",
    zip: "",
    servicesOffered: [],
    serviceArea: { cities: [], radiusKm: null },
    certifications: [],
    portfolio: [],
    emailVerified: false,
    locationGeo: null,
    workerAccountStatus: "draft"
  });

  const serviceCategories = ["Plumber", "Electrician", "Carpenter", "Painter", "Mechanic", "AC Repair", "Appliance Repair", "Mason", "Welder", "Other"];

  const requiredFields = ["firstName", "lastName", "email", "phone", "workExperience"];
  const isValid = useMemo(() => {
    const basicValid = requiredFields.every((f) => String(profile[f] || "").trim() !== "");
    const hasPhoto = !!profile.profileCover;
    return basicValid && hasPhoto;
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
    const url = normalizeProfileImageUrl(data?.url);
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
      update("profileCover", url);
      const res = await fetch(`${base}/api/users/${uid}`);
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => ({ ...prev, profileCover: normalizeProfileImageUrl(updated.profileCover) || url }));
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
                profileCover: normalizeProfileImageUrl(data.profileCover) || "",
                servicesOffered: Array.isArray(data.servicesOffered) ? data.servicesOffered : (data.servicesOffered?.categories || []),
                serviceArea: data.serviceArea || { cities: [], radiusKm: null },
                certifications: Array.isArray(data.certifications) ? data.certifications : [],
                portfolio: Array.isArray(data.portfolio) ? data.portfolio : [],
                experienceYears: data.experienceYears ?? data.workExperience ?? "",
                isAvailable: data.isAvailable ?? true,
                emailVerified: data.emailVerified || false,
                locationGeo: data.locationGeo || null,
                workerAccountStatus: data.workerAccountStatus || "draft",
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
        setSharedProfile(prev => (prev ? { ...prev, ...updated } : updated));
        const newName = [updated.firstName, updated.lastName].filter(Boolean).join(' ').trim();
        if (newName && updateProfileDisplayName) {
          try {
            await updateProfileDisplayName(newName);
            await reloadUser();
          } catch (e) {
            console.warn('Could not sync name to Firebase Auth:', e);
          }
        }
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
      firstName: "", lastName: "", phone: "", workExperience: "", experienceYears: "", email: "",
      headline: "", bio: "", isAvailable: true, profileCover: null, address1: "", address2: "",
      city: "", country: "Bangladesh", zip: "", servicesOffered: { categories: [], tags: [] },
      serviceArea: { cities: [], radiusKm: null }, certifications: [], portfolio: [], emailVerified: false,
    });
    toast("Profile cleared.");
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
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "—";
  const aboutText = (profile.bio && profile.bio.trim()) || "This worker hasn't written an about section yet.";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] p-10 text-center text-white flex flex-col items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 lg:py-12 text-[#e0e0e0] font-sans selection:bg-[#1ec86d]/30">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ===================== LEFT SIDEBAR 30% ===================== */}
          <aside className="w-full lg:w-[30%] space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
            {/* Main Profile Card */}
            <div className="bg-[#151515] p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center relative overflow-hidden shadow-2xl">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 bg-[#1ec86d]/10" />
              
              {/* Avatar section */}
              <div
                {...getRootProps()}
                className={`relative w-32 h-32 rounded-full mb-6 border-4 cursor-pointer overflow-hidden group transition-all duration-300 ${
                  isDragActive ? "border-[#1ec86d]" : "border-white/10 hover:border-white/30"
                }`}
              >
                <input {...getInputProps()} />
                {!profile.profileCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] text-white/30">
                    <span className="material-symbols-outlined text-5xl">person</span>
                  </div>
                )}
                {profile.profileCover && (
                  <img src={profile.profileCover} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-white">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-3xl mb-1 block">photo_camera</span>
                    <p className="text-xs font-medium">{isDragActive ? "Drop here" : "Upload"}</p>
                  </div>
                </div>
              </div>

              {/* Online dot */}
              <div
                className="absolute top-[138px] left-1/2 ml-10 w-4 h-4 rounded-full border-4 border-[#151515]"
                style={{ backgroundColor: profile.isAvailable ? "#1DC66C" : "#6b7280" }}
              />

              {/* Name & badge */}
              <h1 className="text-2xl font-bold text-white mb-2">{fullName}</h1>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-8 bg-[#1ec86d]/10 text-[#1ec86d] border border-[#1ec86d]/20">
                Premium Worker
              </div>

              {/* Trust badges */}
              <div className="space-y-3 w-full mb-8">
                {user?.emailVerified || profile.emailVerified ? (
                  <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-xl text-[#1ec86d]">verified</span>
                    <span className="text-sm font-medium text-white/70">Email Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-red-500/5 px-4 py-3 rounded-xl border border-red-500/10">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-xl text-red-500/60">warning</span>
                      <span className="text-sm font-medium text-red-200/70">Not Verified</span>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                    >
                      {sendingVerification ? "Sending…" : "Verify"}
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-3 rounded-xl border border-white/5">
                  <span className="material-symbols-outlined text-xl text-[#1ec86d]">security</span>
                  <span className="text-sm font-medium text-white/70">Background Checked</span>
                </div>
              </div>

              {/* Rating / Jobs Done grid */}
              <div className="grid grid-cols-2 gap-4 w-full mb-8">
                <div className="bg-white/[0.03] p-4 rounded-2xl text-left border border-white/5 group hover:border-[#1ec86d]/30 transition-all">
                  <p className="text-2xl font-bold text-white">{stats?.averageRating?.toFixed(1) ?? "—"}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mt-1">Rating</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-2xl text-left border border-white/5 group hover:border-[#1ec86d]/30 transition-all">
                  <p className="text-2xl font-bold text-white">{stats?.workerCompletedJobs ?? 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mt-1">Jobs Done</p>
                </div>
              </div>

              {/* Availability toggle */}
              <div className="w-full pt-6 border-t border-white/5">
                <div className="flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: profile.isAvailable ? "#1DC66C" : "#6b7280",
                        boxShadow: profile.isAvailable ? "0 0 12px rgba(29,198,108,0.6)" : "none",
                        animation: profile.isAvailable ? "pulse 2s infinite" : "none",
                    }} />
                    <span className="text-sm font-bold text-white/70 uppercase tracking-wide">{profile.isAvailable ? "Available" : "Away"}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={!!profile.isAvailable} onChange={(e) => update("isAvailable", e.target.checked)} />
                    <div className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative bg-gray-600 peer-checked:bg-[#1ec86d]" />
                  </label>
                </div>
              </div>
            </div>
          </aside>

          {/* ===================== RIGHT MAIN 70% ===================== */}
          <main className="w-full lg:w-[70%] space-y-8 animate-in fade-in slide-in-from-right-4 duration-700 delay-150">
            {/* KPI Row */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { icon: "task_alt",       value: stats?.workerCompletedJobs ?? 0,                  label: "Completed Jobs" },
                { icon: "pending_actions",value: stats?.workerActiveOrders  ?? 0,                  label: "Active Orders"  },
                { icon: "bolt",           value: (stats?.workerResponseRate ?? 0) + "%",            label: "Response Rate"  },
                { icon: "schedule",       value: stats?.workerResponseTimeHours ? stats.workerResponseTimeHours + "h" : "0h", label: "Avg Response" },
              ].map(({ icon, value, label }) => (
                <div key={label} className="bg-[#151515] p-5 rounded-2xl flex flex-col justify-between h-32 border border-white/5 hover:border-[#1ec86d]/30 transition-all group">
                  <span className="material-symbols-outlined text-2xl text-[#1ec86d] group-hover:scale-110 transition-transform">{icon}</span>
                  <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab Nav */}
            <nav className="flex items-center p-1.5 bg-[#151515] rounded-2xl w-fit gap-1 border border-white/5">
              {[
                { key: "overview", label: "Overview" },
                { key: "edit",     label: "Edit Profile" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${tab === key ? "bg-[#1ec86d] text-black shadow-lg shadow-[#1ec86d]/20" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* ============================================================== */}
            {/* OVERVIEW TAB                                                    */}
            {/* ============================================================== */}
            {tab === "overview" && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                
                {/* 1. About Me Section */}
                <section className="bg-[#151515] p-8 rounded-2xl border border-white/5 relative overflow-hidden group text-left">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#1ec86d]/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-colors group-hover:bg-[#1ec86d]/10"></div>
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-[#1ec86d]/10 flex items-center justify-center text-[#1ec86d] shadow-inner shadow-[#1ec86d]/20">
                      <span className="material-symbols-outlined font-bold">person</span>
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Professional Overview</h2>
                  </div>
                  <p className="text-white/60 leading-relaxed text-sm max-w-4xl relative z-10 font-medium">{aboutText}</p>
                </section>

                {/* 2. Registration & Identity (New) */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Personal Contact Card */}
                  <section className="bg-[#151515] p-8 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <span className="material-symbols-outlined font-bold">badge</span>
                      </div>
                      <h2 className="text-lg font-bold text-white">Identity & Contact</h2>
                    </div>
                    <div className="space-y-4">
                      <DetailItem label="Full Legal Name" value={profile.fullLegalName || fullName} />
                      <DetailItem label="Phone Number" value={profile.phone} icon="call" />
                      <DetailItem label="Email Address" value={profile.email} icon="mail" />
                      <DetailItem label="Work Location" value={[profile.city, profile.district].filter(v => v && v !== 'N/A').join(', ') || 'Dhaka, Bangladesh'} icon="location_on" />
                    </div>
                  </section>

                  {/* Skills & Experience Card */}
                  <section className="bg-[#151515] p-8 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <span className="material-symbols-outlined font-bold">engineering</span>
                      </div>
                      <h2 className="text-lg font-bold text-white">Skills & Experience</h2>
                    </div>
                      <div className="space-y-6">
                        <DetailItem label="Years of Experience" value={profile.experienceYears ? `${profile.experienceYears} Years` : 'Not specified'} />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1ec86d] mb-4 flex items-center gap-2">
                             <span className="w-1 h-1 rounded-full bg-[#1ec86d]"></span>
                             Services Offered
                          </p>
                          <div className="flex flex-wrap gap-2 text-left">
                            {Array.isArray(profile.servicesOffered) && profile.servicesOffered.length > 0 ? (
                              profile.servicesOffered.map((slug, i) => (
                                <div key={i} className="flex items-center gap-2 bg-[#1ec86d]/10 border border-[#1ec86d]/20 px-3.5 py-2 rounded-xl group hover:border-[#1ec86d]/40 transition-all">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#1ec86d] opacity-50"></span>
                                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#1ec86d]/90">
                                    {decodeServiceSlug(slug)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-white/10 italic font-medium uppercase tracking-widest">No services listed</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                </div>

                {/* 3. Emergency & Payout (New Section) */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Emergency Contact */}
                  <section className="bg-[#151515] p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-[#151515] to-red-500/[0.02]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                        <span className="material-symbols-outlined font-bold">emergency_share</span>
                      </div>
                      <h2 className="text-lg font-bold text-white">Emergency Contact</h2>
                    </div>
                    <div className="space-y-4">
                      <DetailItem label="Contact Person" value={profile.emergencyContactName} bold />
                      <DetailItem label="Phone Number" value={profile.emergencyContactPhone} icon="call" />
                      <div className="flex gap-4 mt-6 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-help" title="Registration ID Docs">
                         <span className="text-[9px] uppercase font-black text-white/30 border border-white/10 px-2 py-1.5 rounded-lg">NID Front Uploaded</span>
                         <span className="text-[9px] uppercase font-black text-white/30 border border-white/10 px-2 py-1.5 rounded-lg">NID Back Uploaded</span>
                      </div>
                    </div>
                  </section>

                  {/* Payout Details */}
                  <section className="bg-[#151515] p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-[#151515] to-[#1ec86d]/[0.02]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-[#1ec86d]/10 flex items-center justify-center text-[#1ec86d]">
                        <span className="material-symbols-outlined font-bold">account_balance_wallet</span>
                      </div>
                      <h2 className="text-lg font-bold text-white">Payout Method</h2>
                    </div>
                    <div className="space-y-4">
                      <DetailItem label="Wallet Provider" value={profile.payoutWalletProvider} chip />
                      <DetailItem label="Wallet Number" value={profile.payoutWalletNumber} icon="account_circle" />
                      <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 mt-2">
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider leading-relaxed">Payments are settled within 24-48h of job completion to your verified mobile wallet.</p>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Portfolio Preview */}
                <section className="bg-[#151515] p-8 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1ec86d]/10 flex items-center justify-center text-[#1ec86d]">
                        <span className="material-symbols-outlined font-bold">photo_library</span>
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Work Portfolio</h2>
                    </div>
                    <button onClick={() => setTab("edit")} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-[#1ec86d] hover:gap-3 transition-all">
                      Manage <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>

                  {profile.portfolio?.length > 0 ? (
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      {profile.portfolio.slice(0, 4).map((item, i) => (
                        <div key={i} className="aspect-square bg-[#1a1a1a] rounded-2xl overflow-hidden group relative border border-white/5">
                          <img src={item.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <div className="absolute bottom-4 left-4 right-4 text-white text-[10px] font-bold line-clamp-2">
                               {item.caption || "View Work"}
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                      <span className="material-symbols-outlined text-5xl text-white/5 mb-4">add_photo_alternate</span>
                      <h3 className="text-base font-bold text-white/30 mb-2">No portfolio items yet</h3>
                      <p className="text-[10px] text-white/10 mb-8 max-w-xs uppercase tracking-widest font-black">Showcase your expert craftsmanship to win more clients.</p>
                      <button onClick={() => setTab("edit")} className="btn btn-sm rounded-xl px-8 bg-[#1ec86d] text-black font-black uppercase tracking-widest text-[10px] hover:bg-[#19b363]">Upload Work Now</button>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ============================================================== */}
            {/* EDIT PROFILE TAB                                                */}
            {/* ============================================================== */}
            {tab === "edit" && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-[#151515] rounded-2xl border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="font-bold text-white text-lg">Edit Information</h3>
                    <button onClick={handleSave} disabled={saving} className="bg-[#1ec86d] text-black font-black uppercase tracking-widest text-[10px] py-2.5 px-8 rounded-xl shadow-lg shadow-[#1ec86d]/20 hover:scale-[1.02] active:scale-95 transition-all">
                      {saving ? <span className="loading loading-spinner loading-xs"></span> : "Save Changes"}
                    </button>
                  </div>
                  <div className="p-8 space-y-8 text-left">
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {[
                        { label: "First Name", name: "firstName" },
                        { label: "Last Name", name: "lastName" },
                        { label: "Full Legal Name", name: "fullLegalName" },
                        { label: "Email", name: "email", type: "email" },
                        { label: "Phone", name: "phone", type: "tel" },
                        { label: "District / area", name: "district" },
                        { label: "City", name: "city" },
                        { label: "Headline", name: "headline" },
                        { label: "Years Experience", name: "experienceYears", type: "number" },
                      ].map(({ label, name, type = "text" }) => (
                        <div key={name}>
                          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">{label}</label>
                          <input type={type} name={name} value={profile[name]} onChange={handleChange} className="input w-full bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:border-[#1ec86d] focus:ring-1 focus:ring-[#1ec86d] outline-none transition-all text-sm h-11" />
                        </div>
                      ))}
                      
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Bio</label>
                        <textarea name="bio" value={profile.bio} onChange={handleChange} className="textarea w-full bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:border-[#1ec86d] focus:ring-1 focus:ring-[#1ec86d] outline-none transition-all min-h-[120px] text-sm py-3" />
                      </div>
                    </div>

                    <div className="h-px bg-white/5 w-full my-8" />

                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-bold text-white mb-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                             <span className="material-symbols-outlined text-base">emergency_share</span>
                          </div>
                          Emergency Contact
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Contact Name</label>
                            <input type="text" name="emergencyContactName" value={profile.emergencyContactName} onChange={handleChange} className="input w-full bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:border-[#1ec86d] focus:ring-1 text-sm h-11" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Contact Phone</label>
                            <input type="tel" name="emergencyContactPhone" value={profile.emergencyContactPhone} onChange={handleChange} className="input w-full bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:border-[#1ec86d] focus:ring-1 text-sm h-11" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-6 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#1ec86d]/10 flex items-center justify-center text-[#1ec86d]">
                            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                          </div>
                          Payout Wallet
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Provider (Bkash, Nagad, etc)</label>
                            <input type="text" name="payoutWalletProvider" value={profile.payoutWalletProvider} onChange={handleChange} className="input w-full bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:border-[#1ec86d] focus:ring-1 text-sm h-11" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Wallet Number</label>
                            <input type="tel" name="payoutWalletNumber" value={profile.payoutWalletNumber} onChange={handleChange} className="input w-full bg-[#0a0a0a] border-white/10 text-white rounded-xl focus:border-[#1ec86d] focus:ring-1 text-sm h-11" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-white/5 w-full my-8" />
                    
                    <div>
                      <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-[10px] text-white/40">Services Offered</h4>
                      <div className="space-y-6">
                        {/* Grouped Service Selector */}
                        <div className="space-y-4">
                          {SERVICE_CATEGORY_GROUPS.map((group) => (
                            <div key={group.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">{group.title}</h5>
                              <div className="flex flex-wrap gap-2">
                                {group.items.map((item) => {
                                  const val = `${group.id}:${item.id}`;
                                  const isSelected = Array.isArray(profile.servicesOffered) && profile.servicesOffered.includes(val);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => {
                                        const current = Array.isArray(profile.servicesOffered) ? profile.servicesOffered : [];
                                        const next = isSelected ? current.filter(v => v !== val) : [...current, val];
                                        update("servicesOffered", next);
                                      }}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                        isSelected
                                          ? 'bg-[#1ec86d]/10 border-[#1ec86d] text-[#1ec86d] shadow-lg shadow-[#1ec86d]/10'
                                          : 'bg-[#0a0a0a] border-white/10 text-white/40 hover:border-white/30 hover:text-white'
                                      }`}
                                    >
                                      {item.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-4">
                           <TagInput label="Additional Skills / Tags" value={profile.certifications?.tags || []} onChange={(tags) => update("certifications", { ...profile.certifications, tags })} />
                        </div>
                      </div>
                    </div>
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
