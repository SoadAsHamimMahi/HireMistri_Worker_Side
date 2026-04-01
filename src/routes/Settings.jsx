import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../Authentication/AuthProvider';
import {
  MdSettings, MdAccountBalanceWallet, MdNotifications, MdSecurity,
  MdEdit, MdSave, MdCheck, MdPhone
} from 'react-icons/md';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Settings() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payout wallet
  const [bkashNumber, setBkashNumber] = useState('');
  const [savingBkash, setSavingBkash] = useState(false);

  // Notification prefs (local state only — stored in profile)
  const [notifs, setNotifs] = useState({
    jobOffers: true,
    dueAlerts: true,
    appStatus: true,
    messages: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/users/${uid}`);
        setProfile(data);
        setBkashNumber(data.payoutWalletNumber || data.bkashNumber || '');
        if (data.notificationPrefs) {
          setNotifs(prev => ({ ...prev, ...data.notificationPrefs }));
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const saveBkash = async () => {
    if (!bkashNumber.trim()) return toast.error('Enter a valid bKash number');
    setSavingBkash(true);
    try {
      await axios.patch(`${API_BASE}/api/users/${uid}`, { payoutWalletNumber: bkashNumber.trim() });
      toast.success('Payout number updated!');
    } catch {
      toast.error('Failed to update. Try again.');
    } finally {
      setSavingBkash(false);
    }
  };

  const saveNotifs = async () => {
    setSavingNotifs(true);
    try {
      await axios.patch(`${API_BASE}/api/users/${uid}`, { notificationPrefs: notifs });
      toast.success('Notification preferences saved!');
    } catch {
      toast.error('Failed to save preferences.');
    } finally {
      setSavingNotifs(false);
    }
  };

  const toggleNotif = (key) => setNotifs(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return (
      <div className="p-8 text-white flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 pb-24 text-white font-['Inter'] max-w-2xl">
      <Toaster position="top-center" />
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-white/40 text-sm">Manage your account preferences and payout details</p>
      </div>

      {/* --- Payout Wallet --- */}
      <section className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <MdAccountBalanceWallet className="text-xl" />
          </div>
          <div>
            <h2 className="font-bold">Payout Wallet</h2>
            <p className="text-xs text-white/40">Your bKash number for receiving manual payments</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MdPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg" />
            <input
              type="tel"
              value={bkashNumber}
              onChange={e => setBkashNumber(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <button
            onClick={saveBkash}
            disabled={savingBkash}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-black font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
          >
            {savingBkash ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <MdSave />}
            Save
          </button>
        </div>
        <p className="text-[10px] text-white/30 mt-3">This number is visible to admins for payment verification.</p>
      </section>

      {/* --- Notification Preferences --- */}
      <section className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <MdNotifications className="text-xl" />
          </div>
          <div>
            <h2 className="font-bold">Notifications</h2>
            <p className="text-xs text-white/40">Choose what alerts you want to receive</p>
          </div>
        </div>
        <div className="space-y-4">
          {[
            { key: 'jobOffers', label: 'New Job Offers', desc: 'When a client directly invites you to a job' },
            { key: 'dueAlerts', label: 'Due Balance Alerts', desc: 'Reminders when your platform dues are increasing' },
            { key: 'appStatus', label: 'Application Updates', desc: 'When your application is accepted or rejected' },
            { key: 'messages', label: 'New Messages', desc: 'When a client sends you a message' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(key)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${notifs[key] ? 'bg-primary' : 'bg-white/10'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${notifs[key] ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={saveNotifs}
          disabled={savingNotifs}
          className="mt-6 w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
        >
          {savingNotifs ? <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <MdCheck />}
          Save Preferences
        </button>
      </section>

      {/* --- Security --- */}
      <section className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
            <MdSecurity className="text-xl" />
          </div>
          <div>
            <h2 className="font-bold">Account Security</h2>
            <p className="text-xs text-white/40">Manage your login credentials</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
            <div>
              <p className="text-sm font-medium">Email Address</p>
              <p className="text-xs text-white/40">{user?.email || 'Not set'}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 bg-white/5 px-3 py-1 rounded-full">Firebase</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-white/40">Use Firebase to reset your password if needed</p>
            </div>
            <a
              href={`https://hiremistri.com/reset-password`}
              className="text-[10px] font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
              onClick={(e) => {
                e.preventDefault();
                toast('Password reset is handled via your email login provider.', { icon: '🔐' });
              }}
            >
              Reset
            </a>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl">
            <div>
              <p className="text-sm font-medium">Account Status</p>
              <p className="text-xs text-white/40">Your current platform standing</p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${profile?.isApplyBlocked ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
              {profile?.isApplyBlocked ? 'Restricted' : 'Active'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
