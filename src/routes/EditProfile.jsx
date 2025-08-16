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
      <label className="block text-sm font-medium mb-1">{label}</label>
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
    <div className="min-h-screen bg-base-200">
      <Toaster />

      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold">My Profile</h1>
        <nav className="text-sm breadcrumbs mt-1">
          <ul>
            <li>Home</li>
            <li className="font-semibold">Profile</li>
          </ul>
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Avatar card */}
          <div className="bg-white shadow-xl rounded-2xl p-6 flex flex-col items-center">
            <div
              {...getRootProps()}
              className={`relative w-40 h-40 rounded-full overflow-hidden ring-4 ring-blue-100 cursor-pointer group`}
              title="Click or drag to upload photo"
            >
              <input {...getInputProps()} />
              <img
                src={profile.profileCover || "/default-profile.png"}
                alt="profile"
                className="w-full h-full object-cover"
                onError={(e)=> (e.currentTarget.src="/default-profile.png")}
              />
              <div className={`absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs`}>
                {isDragActive ? "Drop to upload" : "Click or drag to upload"}
              </div>
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">{fullName}</h2>
              <p className="text-sm text-gray-600 mt-1">{secondaryLine}</p>
              <div className="mt-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-500">
                  <svg viewBox="0 0 24 24" className="w-4 h-4"><path fill="currentColor" d="M12 4C7.03 4 3 8.03 3 13c0 2.83 1.45 5.33 3.67 6.86.29.21.67.18.92-.08l1.82-1.86a.75.75 0 0 0-.01-1.06l-1.35-1.28a5.5 5.5 0 1 1 8.3-6.86l1.27 1.35c.29.3.77.3 1.07.01l1.85-1.82c.26-.25.28-.63.07-.92A9.97 9.97 0 0 0 12 4Z"/></svg>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Tabs + content */}
          <div className="lg:col-span-2 bg-white shadow-xl rounded-2xl">
            {/* Tabs */}
            <div className="border-b px-4 sm:px-6">
              <div className="tabs tabs-lifted -mb-px">
                <button className={`tab tab-bordered ${tab === "overview" ? "tab-active font-semibold" : ""}`} onClick={() => setTab("overview")}>Overview</button>
                <button className={`tab tab-bordered ${tab === "edit" ? "tab-active font-semibold" : ""}`} onClick={() => setTab("edit")}>Edit Profile</button>
                <button className={`tab tab-bordered ${tab === "password" ? "tab-active font-semibold" : ""}`} onClick={() => setTab("password")}>Change Password</button>
              </div>
            </div>

            {/* Tab bodies */}
            <div className="p-5 sm:p-6">
              {/* =============== OVERVIEW (now shows all edit data) =============== */}
              {tab === "overview" && (
                <div className="space-y-8">
                  {/* About */}
                  <section>
                    <h3 className="text-lg font-semibold mb-2">About</h3>
                    <p className="leading-relaxed text-gray-700">{aboutText}</p>
                  </section>

                  {/* Profile details */}
                  <section>
                    <h3 className="text-lg font-semibold mb-3">Profile Details</h3>
                    <div className="rounded-xl border bg-base-100 overflow-hidden">
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
                        <div key={i} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 py-3 px-4 ${i ? "border-t" : ""}`}>
                          <span className="text-gray-500">{label}</span>
                          <span className="sm:col-span-2 font-medium text-gray-800 break-words">
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
                    <h3 className="text-lg font-semibold">Account</h3>
                    <label className="label cursor-pointer gap-3">
                      <span className="label-text">Available for work</span>
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
                        <label className="block text-sm font-medium mb-1">{label}</label>
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
                      <label className="block text-sm font-medium mb-1">Headline (optional)</label>
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
                      <label className="block text-sm font-medium mb-1">Bio (optional)</label>
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

                  <div className="divider my-1">Address</div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">Address Line 1</label>
                      <input type="text" name="address1" value={profile.address1} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address Line 2</label>
                      <input type="text" name="address2" value={profile.address2} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">City</label>
                      <input type="text" name="city" value={profile.city} onChange={handleChange} className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Country/Region</label>
                      <select name="country" value={profile.country} onChange={handleChange} className="select select-bordered w-full">
                        <option>Bangladesh</option>
                        <option>India</option>
                        <option>USA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Zip/Postal Code</label>
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
                  <h3 className="text-lg font-semibold">Change Password</h3>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Current Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New Password</label>
                      <input type="password" className="input input-bordered w-full" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm New Password</label>
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
