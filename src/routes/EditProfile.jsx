import React, { useContext, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useDropzone } from "react-dropzone";
import { AuthContext } from "../Authentication/AuthProvider";

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
      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{label}</label>
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

/* ----------------------------- Main Component ----------------------------- */
export default function WorkerProfile() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;

  const [tab, setTab] = useState("overview"); // overview | edit | password
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    displayName: "",
    phone: "",
    workExperience: "",
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
  });

  const requiredFields = ["firstName", "lastName", "displayName", "email", "phone", "workExperience"];
  const isValid = useMemo(() => requiredFields.every((f) => String(profile[f] || "").trim() !== ""), [profile]);

  const update = (k, v) => setProfile((p) => ({ ...p, [k]: v }));
  const handleChange = (e) => update(e.target.name, e.target.value);

  /* ------------------------- Avatar upload ------------------------ */
  const uploadAvatar = async (file) => {
    const fd = new FormData();
    fd.append("images", file);
    const res = await fetch(`${base}/api/browse-jobs/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Avatar upload failed (HTTP ${res.status})`);
    const data = await res.json();
    const url = data?.imageUrls?.[0];
    if (!url) throw new Error("No image URL returned");
    return url;
  };

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles?.[0];
    if (!file) return;
    try {
      setSaving(true);
      const url = await uploadAvatar(file);
      update("profileCover", url);
      toast.success("Profile photo updated");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to upload image");
    } finally {
      setSaving(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
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
                isAvailable: data.isAvailable ?? true,
              }));
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
      updatedAt: new Date(),
    };
    const res = await fetch(`${base}/api/users/${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Save failed (HTTP ${res.status})`);
  };

  const handleSave = async () => {
    if (!isValid) return toast.error("Please fill in all required fields.");
    try {
      setSaving(true);
      if (uid) await saveToServer();
      else localStorage.setItem("workerProfile", JSON.stringify(profile));
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
    });
    toast("Profile cleared.", { icon: "🧹" });
  };

  /* ------------------------------ Derived fields ----------------------------- */
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.displayName || "—";
  const secondaryLine = profile.phone || uid || "—";
  const addressPretty = [profile.address1, profile.address2, profile.city, profile.country, profile.zip]
    .filter(Boolean).join(", ");

  // About prefers bio; falls back to headline; then placeholder
  const aboutText =
    (profile.bio && profile.bio.trim()) ||
    (profile.headline && profile.headline.trim()) ||
    "This worker hasn’t written an about section yet. Add a short intro in Edit Profile.";

  const fieldOfInterest = profile.skills?.[0] || "—";

  if (loading) return <div className="p-10 text-center">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster />

      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 dark:text-white mb-4">
              My Profile
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Manage your professional information and showcase your skills to potential employers.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Profile Card */}
          <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-3xl p-8 flex flex-col items-center border border-gray-100 dark:border-gray-700">
            <div className="relative mb-6">
              <div
                {...getRootProps()}
                className={`relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-primary-200 dark:ring-primary-800 cursor-pointer group transition-all duration-300 hover:ring-primary-400 dark:hover:ring-primary-600`}
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
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                <i className="fas fa-check text-white text-sm"></i>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-2">{fullName}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{secondaryLine}</p>
              
              {/* Profile Stats */}
              <div className="grid grid-cols-2 gap-4 w-full mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                  <div className="text-lg font-heading font-bold text-primary-600 dark:text-primary-400">4.8</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Rating</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
                  <div className="text-lg font-heading font-bold text-primary-600 dark:text-primary-400">12</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Jobs Done</div>
                </div>
              </div>
              
              {/* Availability Status */}
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                profile.isAvailable 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  profile.isAvailable ? 'bg-green-500' : 'bg-red-500'
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
            <div className="p-5 sm:p-6">
              {/* =============== OVERVIEW (now shows all edit data) =============== */}
              {tab === "overview" && (
                <div className="space-y-8">
                  {/* About */}
                  <section>
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">About</h3>
                    <p className="leading-relaxed text-gray-700 dark:text-gray-300">{aboutText}</p>
                  </section>

                  {/* Profile details */}
                  <section>
                    <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">Profile Details</h3>
                    <div className="rounded-xl border dark:border-gray-600 bg-base-100 dark:bg-gray-700 overflow-hidden">
                      {[
                        ["Full Name", fullName],
                        ["Phone", profile.phone || "—"],
                        ["Email", profile.email || "—"],
                        ["Address", addressPretty || "—"],
                        ["Work Experience", profile.workExperience ? `${profile.workExperience} year${Number(profile.workExperience) > 1 ? "s" : ""}` : "—"],
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
                          <span className="sm:col-span-2 font-medium text-gray-800 dark:text-white break-words">
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
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Account</h3>
                    <label className="label cursor-pointer gap-3">
                      <span className="label-text text-gray-700 dark:text-gray-300">Available for work</span>
                      <input
                        type="checkbox"
                        className="toggle toggle-success"
                        checked={!!profile.isAvailable}
                        onChange={(e) => update("isAvailable", e.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {[
                      { label: "First Name", name: "firstName" },
                      { label: "Last Name", name: "lastName" },
                      { label: "Display Name", name: "displayName" },
                      { label: "Work Experience (years)", name: "workExperience", type: "number" },
                      { label: "Phone Number", name: "phone", type: "tel" },
                      { label: "Email", name: "email", type: "email" },
                    ].map(({ label, name, type = "text" }) => (
                      <div key={name}>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">{label}</label>
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
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Headline (optional)</label>
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
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Bio (optional)</label>
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

                  <div className="divider my-1 text-gray-700 dark:text-gray-300">Address</div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Address Line 1</label>
                      <input type="text" name="address1" value={profile.address1} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Address Line 2</label>
                      <input type="text" name="address2" value={profile.address2} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">City</label>
                      <input type="text" name="city" value={profile.city} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Country/Region</label>
                      <select name="country" value={profile.country} onChange={handleChange} className="select select-bordered w-full">
                        <option>Bangladesh</option>
                        <option>India</option>
                        <option>USA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Zip/Postal Code</label>
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
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Change Password</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">New Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Confirm New Password</label>
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
      </div>
    </div>
  );
}
