// src/Authentication/saveUser.js
import axios from "axios";

export async function saveUserToApi(user, extra = {}) {
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
  const uid = user?.uid;
  if (!uid) throw new Error("saveUserToApi: user.uid is missing");

  const payload = {
    uid,
    email: user.email || "",
    displayName: user.displayName || `${extra.firstName || ""} ${extra.lastName || ""}`.trim(),
    firstName: extra.firstName || "",
    lastName: extra.lastName || "",
    phone: extra.phone || "",
    role: extra.role || "worker",
  };

  const url = `${base}/api/users/${uid}`;
  console.log("[saveUserToApi] PUT", url, payload);   // <-- visible in console

  try {
    return await axios.put(url, payload);
  } catch (err) {
    // bubble up a helpful error
    const status = err?.response?.status;
    const body = err?.response?.data;
    console.error("[saveUserToApi] failed", { url, status, body });
    throw new Error(`HTTP ${status || "?"} calling ${url}`);
  }
}
