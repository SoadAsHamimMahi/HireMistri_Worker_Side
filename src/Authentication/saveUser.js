// src/Authentication/saveUser.js
import axios from "axios";

const API_BASE =
  (import.meta.env?.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

export async function saveUserToApi(user, extra = {}) {
  const uid = user?.uid;
  if (!uid) throw new Error("saveUserToApi: user.uid is missing");

  const email = (user.email || "").toLowerCase();
  const displayName =
    (user.displayName || `${extra.firstName || ""} ${extra.lastName || ""}`).trim();

  // 1) Ensure minimal record exists (idempotent)
  await axios.post(`${API_BASE}/api/auth/sync`, { uid, email, role: 'worker' });

  // 2) Update allowed fields (non-destructive upsert on server)
  const body = {
    email,
    displayName,
    firstName: (extra.firstName || "").trim(),
    lastName: (extra.lastName || "").trim(),
    phone: (extra.phone || "").trim(),
    role: (extra.role || "worker").toLowerCase(),
    // add other allowed fields here if you collect them
  };
  await axios.patch(`${API_BASE}/api/users/${uid}`, body);

  // 3) Return a guaranteed user document (prevents 404 races)
  const { data } = await axios.get(`${API_BASE}/api/users/${uid}?ensure=true`);
  return data;
}

// If you ever need to fetch a user elsewhere, use this to avoid 404s.
export async function getUserEnsured(uid) {
  if (!uid) throw new Error("getUserEnsured: uid is required");
  const { data } = await axios.get(`${API_BASE}/api/users/${uid}?ensure=true`);
  return data;
}
