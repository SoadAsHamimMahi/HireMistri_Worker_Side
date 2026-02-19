import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const ProfileContext = createContext(null);

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  return ctx || { profile: null, setProfile: () => {}, fetchProfile: () => {} };
};

export const ProfileProvider = ({ children }) => {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;
  const [profile, setProfile] = useState(null);

  const fetchProfile = useCallback(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    fetch(`${API_BASE}/api/users/${uid}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) setProfile(data);
      })
      .catch(() => setProfile(null));
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    fetchProfile();
  }, [uid, fetchProfile]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, fetchProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};
