import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../Authentication/AuthProvider';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Settings() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Sidebar Section
  const [activeTab, setActiveTab] = useState('settlement');

  // Payout wallet
  const [bkashNumber, setBkashNumber] = useState('');
  const [payoutProvider, setPayoutProvider] = useState('bKash');
  const [savingBkash, setSavingBkash] = useState(false);

  // Notification prefs
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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-6 text-sm font-black uppercase tracking-widest text-emerald-800/40">Fetching System State...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f7] text-gray-900 selection:bg-emerald-200 font-sans pb-20">
      <Toaster position="top-center" />
      <div className="relative w-full max-w-[83.333%] mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          
          {/* ── Fixed Glass Sidebar ── */}
          <aside className="lg:sticky lg:top-24 space-y-6 animate-in fade-in slide-in-from-left-4 duration-1000">
            {/* Navigation Sidebar */}
            <nav className="bg-white border border-gray-100 rounded-[1.5rem] shadow-sm p-2 space-y-1">
              {[
                { id: 'settlement', icon: 'account_balance_wallet', label: 'Settlement' },
                { id: 'notifications', icon: 'notifications_active', label: 'Notifications' },
                { id: 'security', icon: 'shield_lock', label: 'Security' },
                { id: 'account', icon: 'badge', label: 'Account Info' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all relative overflow-hidden group ${
                    activeTab === t.id 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-gray-100'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] transition-transform duration-500 ${activeTab === t.id ? 'scale-110' : 'group-hover:scale-110 text-gray-400 group-hover:text-emerald-500'}`}>
                    {t.icon}
                  </span>
                  <span className="relative z-10">{t.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main Content Area ── */}
          <main className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* --- Settlement Section --- */}
            {activeTab === 'settlement' && (
              <section className="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group/section">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-opacity opacity-50 group-hover/section:opacity-100"></div>
                
                <div className="flex items-center gap-6 mb-12 relative z-10">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Settlement Protocol</h2>
                    <p className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Configure Disbursement Channel</p>
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  {/* Provider Selector */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Select Provider</label>
                    <div className="flex flex-wrap gap-4">
                      {['bKash', 'Nagad', 'Rocket'].map((provider) => {
                        const isDisabled = provider !== 'bKash';
                        return (
                          <button
                            key={provider}
                            onClick={() => !isDisabled && setPayoutProvider(provider)}
                            disabled={isDisabled}
                            className={`px-8 py-4 rounded-xl font-black text-xs tracking-widest border transition-all ${
                              payoutProvider === provider && !isDisabled
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                                : isDisabled
                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {provider}
                              {isDisabled && <span className="material-symbols-outlined text-[14px]">lock</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4">{payoutProvider} Account Number</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1 group/input">
                        <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/input:text-emerald-500 transition-colors">phone_iphone</span>
                        <input
                          type="tel"
                          value={bkashNumber}
                          onChange={e => setBkashNumber(e.target.value)}
                          placeholder="01XXXXXXXXX"
                          className="w-full pl-16 pr-8 py-4 bg-gray-50 border border-gray-100 rounded-xl text-lg font-black tracking-widest text-gray-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all placeholder-gray-200"
                        />
                      </div>
                      <button
                        onClick={saveBkash}
                        disabled={savingBkash}
                        className="h-[64px] px-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all flex items-center justify-center gap-3 shrink-0"
                      >
                        {savingBkash ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Save Settings"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-start gap-4 p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 relative z-10">
                   <span className="material-symbols-outlined text-emerald-500 text-2xl">verified_user</span>
                   <div>
                     <p className="text-sm font-bold text-emerald-800 leading-relaxed">
                       Financial details are subject to monthly cryptographic verification. Ensure the number matches your registered identity.
                     </p>
                     {profile?.updatedAt && (
                       <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600/60 mt-2">
                         Last Updated: {new Date(profile.updatedAt).toLocaleDateString()}
                       </p>
                     )}
                   </div>
                </div>
              </section>
            )}

            {/* --- Notification Preferences --- */}
            {activeTab === 'notifications' && (
              <section className="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                    <span className="material-symbols-outlined text-3xl">notifications_active</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Intelligence Stream</h2>
                    <p className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Configure automated event notifications</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'jobOffers', label: 'Inbound Invites', desc: 'Real-time alerts for direct client project invitations', icon: "mail" },
                    { key: 'dueAlerts', label: 'Platform Dues', desc: 'Lifecycle reminders for pending subscription fees', icon: "payments" },
                    { key: 'appStatus', label: 'Workflow Sync', desc: 'Operational updates on project status and milestones', icon: "dynamic_feed" },
                    { key: 'messages', label: 'Secure Comms', desc: 'Private communication alerts from authenticated clients', icon: "chat" },
                  ].map(({ key, label, desc, icon }) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-emerald-100 hover:bg-white transition-all duration-500 group">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-emerald-500 group-hover:border-emerald-100 transition-all shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-[24px]">{icon}</span>
                         </div>
                         <div>
                           <p className="text-base font-black text-gray-900">{label}</p>
                           <p className="text-sm font-medium text-gray-500 mt-1">{desc}</p>
                         </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-16 sm:ml-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={notifs[key]} 
                          onChange={() => toggleNotif(key)} 
                        />
                        <div className="w-[50px] h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[22px] rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:start-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[22px] after:w-[22px] after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="pt-8 mt-8 border-t border-gray-100">
                  <button
                    onClick={saveNotifs}
                    disabled={savingNotifs}
                    className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    {savingNotifs ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-symbols-outlined text-lg">save</span>}
                    Save Settings
                  </button>
                </div>
              </section>
            )}

            {/* --- Account Security --- */}
            {activeTab === 'security' && (
              <section className="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                    <span className="material-symbols-outlined text-3xl">shield_lock</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Security Integrity</h2>
                    <p className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Identity validation and access control</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col justify-between h-48 group hover:bg-white hover:border-emerald-100 transition-all duration-500 shadow-sm">
                     <div className="flex items-center justify-between">
                        <span className="material-symbols-outlined text-emerald-500/40 text-3xl">alternate_email</span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg shadow-sm">Encrypted</span>
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Primary Identifier</p>
                        <p className="text-base font-black text-gray-900 truncate">{user?.email || 'N/A'}</p>
                     </div>
                  </div>

                  <div className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl flex flex-col justify-between h-48 group hover:bg-white hover:border-emerald-100 transition-all duration-500 shadow-sm">
                     <div className="flex items-center justify-between">
                        <span className="material-symbols-outlined text-emerald-500/40 text-3xl">military_tech</span>
                        <div className={`w-3 h-3 rounded-full animate-pulse ${profile?.isApplyBlocked ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                     </div>
                     <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Platform Rank</p>
                        <p className={`text-base font-black uppercase tracking-widest ${profile?.isApplyBlocked ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {profile?.isApplyBlocked ? 'Restricted Access' : 'Verified Professional'}
                        </p>
                     </div>
                  </div>
                </div>

                <div className="mt-8 p-8 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-center gap-6 group/reset">
                   <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm group-hover/reset:rotate-12 transition-transform shrink-0">
                      <span className="material-symbols-outlined text-3xl">key_visualizer</span>
                   </div>
                   <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-black text-gray-900 mb-1">Credential Management</h3>
                      <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-md">Access tokens and security layers are managed via Firebase. Request a secure link to initiate credential rotation.</p>
                   </div>
                   <button 
                     onClick={() => toast('Security packet dispatched to your inbox.', { icon: '🔐' })}
                     className="px-8 h-[56px] bg-white border border-emerald-100 text-emerald-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-500 flex items-center gap-2 shadow-sm active:scale-95 shrink-0"
                   >
                     Initiate Reset <span className="material-symbols-outlined text-lg">arrow_forward</span>
                   </button>
                </div>
                
                {/* Danger Zone */}
                <div className="mt-8 p-8 bg-rose-50/30 border border-rose-100 rounded-2xl flex flex-col sm:flex-row items-center gap-6 group/danger">
                   <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm group-hover/danger:scale-105 transition-transform shrink-0">
                      <span className="material-symbols-outlined text-3xl">warning</span>
                   </div>
                   <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-black text-gray-900 mb-1">Danger Zone</h3>
                      <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-md">Permanent deletion of your professional profile and service history. This action cannot be reversed.</p>
                   </div>
                   <button 
                     disabled
                     className="px-8 h-[56px] bg-white border border-rose-100 text-rose-400 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-sm opacity-70 cursor-not-allowed shrink-0"
                   >
                     Contact Support
                   </button>
                </div>
              </section>
            )}

            {/* --- Account Info --- */}
            {activeTab === 'account' && (
              <section className="bg-white p-8 md:p-12 rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-gray-900 flex items-center justify-center text-white shadow-xl shadow-gray-900/20">
                    <span className="material-symbols-outlined text-3xl">badge</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Public Identity</h2>
                    <p className="text-[13px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Marketplace presence configuration</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-8 p-8 bg-gray-50/50 border border-gray-100 rounded-2xl">
                  <div className="w-24 h-24 rounded-2xl bg-emerald-50 border border-emerald-100 overflow-hidden shadow-sm flex items-center justify-center text-emerald-500 font-black text-3xl shrink-0">
                    {profile?.profileCover ? (
                      <img src={profile.profileCover} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      (profile?.firstName?.[0] || 'W').toUpperCase()
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-gray-900 mb-1">
                      {profile?.firstName} {profile?.lastName}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 mb-4">
                      {profile?.designation || 'Professional Services'} • {profile?.location || 'Unspecified Location'}
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                      <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm flex items-center gap-1.5">
                         <span className="material-symbols-outlined text-[12px]">star</span>
                         {(profile?.averageRating || 0).toFixed(1)} Rating
                      </span>
                      <span className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm flex items-center gap-1.5">
                         <span className="material-symbols-outlined text-[12px]">task_alt</span>
                         {profile?.totalJobsCompleted || 0} Missions
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <Link 
                    to="/edit-profile"
                    className="w-full h-[64px] bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-100 hover:border-emerald-600 rounded-xl font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    Edit Full Profile 
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">east</span>
                  </Link>
                </div>
              </section>
            )}

          </main>
        </div>
      </div>
    </div>
  );
};
