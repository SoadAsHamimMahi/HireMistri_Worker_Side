import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthContext } from '../Authentication/AuthProvider';
import { useProfile } from '../contexts/ProfileContext';
import axios from 'axios';
import Notifications from './Notifications';

export default function WorkerNavbar() {
  const ctx = useContext(AuthContext) || {};
  const { profile, setProfile, fetchProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [uid, setUid] = useState(ctx?.user?.uid || auth.currentUser?.uid || null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => { document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto'; }, [isMenuOpen]);

  useEffect(() => { setUid(ctx?.user?.uid || null); }, [ctx?.user]);
  useEffect(() => onAuthStateChanged(auth, u => setUid(u?.uid || null)), [auth]);

  // Refetch profile when user updates it (e.g. from EditProfile)
  useEffect(() => {
    const onProfileUpdated = (e) => {
      if (e?.detail && typeof e.detail === 'object') {
        setProfile(prev => ({ ...prev, ...e.detail }));
      } else {
        fetchProfile();
      }
    };
    window.addEventListener('profileUpdated', onProfileUpdated);
    return () => window.removeEventListener('profileUpdated', onProfileUpdated);
  }, [setProfile, fetchProfile]);

  const fetchNotificationCount = async () => {
    if (!uid) {
      setNotificationCount(0);
      return;
    }
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
      const res = await axios.get(`${API_BASE}/api/notifications/${uid}`);
      setNotificationCount(res.data.unreadCount || 0);
    } catch (err) { }
  };

  useEffect(() => {
    if (!uid) return;
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 15000);
    return () => clearInterval(interval);
  }, [uid]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const isAuthed = !!uid;
  const avatar = profile?.profileCover || ctx?.user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(ctx?.user?.displayName || 'User')}&background=16a34a&color=fff`;
  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    profile?.displayName ||
    ctx?.user?.displayName ||
    'My Account';

  return (
    <div className="w-full sticky top-0 z-50 bg-white border-b border-gray-100 font-sans">
      <div className="max-w-[90%] mx-auto flex justify-between items-center px-4 md:px-8 py-4">
        
        <div className="flex items-center gap-8">
          <Link to="/" className="text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-brand w-8 h-8 flex items-center justify-center text-xl">
              <i className="fas fa-tools"></i>
            </span>
            Hire Mistri
          </Link>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex items-stretch relative">
            <input
              type="text"
              placeholder="Search jobs..."
              className="bg-white text-gray-900 border border-gray-300 border-r-0 focus:border-brand focus:ring-1 focus:ring-brand rounded-l-md px-4 py-2 w-72 xl:w-96 outline-none transition-all placeholder:text-gray-400 text-sm"
            />
            <button className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-r-md transition-colors flex items-center justify-center border border-brand">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-6 text-base font-medium text-gray-600">
          {isAuthed ? (
            <>
              <Link to="/dashboard" className="hover:text-brand transition-colors">Dashboard</Link>
              <Link to="/jobs" className="hover:text-brand transition-colors">Find Jobs</Link>
              <Link to="/dashboard/applications" className="hover:text-brand transition-colors">Applications</Link>
              <Link to="/chats" className="hover:text-brand transition-colors">Messages</Link>

              <div className="h-6 w-px bg-gray-200 mx-2"></div>

              {/* Notifications */}
              <button
                className="relative text-gray-500 hover:text-gray-800 p-2 rounded-full transition-colors"
                onClick={() => setShowNotifications(true)}
              >
                <i className="far fa-bell text-lg"></i>
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {/* User Profile Dropdown */}
              <div className="dropdown dropdown-end relative">
                <div tabIndex={0} role="button" className="flex items-center gap-3 pl-2 py-1 bg-transparent hover:bg-gray-100 rounded-full transition-all cursor-pointer border border-transparent hover:border-gray-200">
                  <div className="text-right hidden xl:block">
                    <p className="font-bold text-sm text-gray-900">{displayName}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none">Worker</p>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 shadow-sm relative">
                    <img src={avatar} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand border-2 border-white rounded-full"></div>
                  </div>
                </div>

                <ul tabIndex={0} className="dropdown-content absolute top-full mt-3 right-0 z-50 p-2 shadow-2xl rounded-2xl w-56 bg-white border border-gray-200">
                  <li className="px-4 py-3 border-b border-gray-100 mb-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{ctx?.user?.email}</p>
                  </li>
                  <li><Link to="/edit-profile" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-brand font-medium transition-colors"><i className="fas fa-user w-4"></i> Profile Settings</Link></li>
                  <li><Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-brand font-medium transition-colors"><i className="fas fa-cog w-4"></i> Settings</Link></li>
                  <li><Link to="/support" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-brand font-medium transition-colors"><i className="fas fa-headset w-4"></i> Support / Help Center</Link></li>
                  <div className="h-px bg-gray-100 my-1 mx-2"></div>
                  <li><button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-colors"><i className="fas fa-sign-out-alt w-4"></i> Logout</button></li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <Link to="/registration" className="text-gray-600 hover:text-gray-900 font-semibold py-2.5 px-4 transition-colors">Sign Up</Link>
              <Link to="/login" className="bg-brand hover:bg-brand-hover text-white font-bold py-2.5 px-6 rounded-md transition-all shadow-md shadow-brand/20">Login</Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="lg:hidden flex items-center gap-4">
          {isAuthed && (
            <button
              className="relative text-gray-500 hover:text-gray-900"
              onClick={() => setShowNotifications(true)}
            >
              <i className="far fa-bell text-xl"></i>
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
          )}
          <button
            className="text-gray-600 hover:text-gray-900 outline-none"
            onClick={() => setIsMenuOpen(true)}
          >
            <i className="fas fa-bars text-2xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="lg:hidden px-4 pb-4 bg-white">
        <div className="flex relative items-stretch">
          <input
            type="text"
            placeholder="Search jobs..."
            className="bg-white text-gray-900 border border-gray-300 border-r-0 rounded-l-md px-4 py-3 w-full outline-none placeholder:text-gray-400 text-sm font-medium focus:border-brand"
          />
          <button className="bg-brand hover:bg-brand-hover text-white px-5 rounded-r-md border border-brand flex items-center justify-center">
            <i className="fas fa-search"></i>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="relative w-[80%] h-full bg-white border-l border-gray-200 p-6 flex flex-col shadow-2xl overflow-y-auto animate-slideInRight">
            <div className="flex items-center justify-between mb-8">
              {isAuthed ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden">
                    <img src={avatar} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 leading-snug">{displayName}</div>
                    <div className="text-xs text-brand font-semibold uppercase tracking-wider">Worker Account</div>
                  </div>
                </div>
              ) : (
                <span className="text-xl font-bold text-gray-900">Menu</span>
              )}
              <button className="text-gray-500 hover:text-gray-900 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full" onClick={() => setIsMenuOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <nav className="flex flex-col gap-2 text-[15px] font-semibold flex-1">
              {!isAuthed && (
                <div className="flex flex-col gap-3 mb-6">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="bg-brand text-center text-white py-3 rounded-md shadow-sm">Login</Link>
                  <Link to="/registration" onClick={() => setIsMenuOpen(false)} className="bg-white text-gray-700 text-center py-3 rounded-md border border-gray-300">Sign Up</Link>
                </div>
              )}

              <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-home w-5 text-gray-400"></i> Home</Link>
              {isAuthed && (
                <>
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-tachometer-alt w-5 text-gray-400"></i> Dashboard</Link>
                  <Link to="/jobs" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-search w-5 text-gray-400"></i> Find Jobs</Link>
                  <Link to="/dashboard/applications" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-file-alt w-5 text-gray-400"></i> Applications</Link>
                  <Link to="/chats" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-comment shadow-sm w-5 text-gray-400"></i> Messages</Link>
                  <Link to="/edit-profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-user w-5 text-gray-400"></i> Profile Settings</Link>
                  <Link to="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-cog w-5 text-gray-400"></i> Settings</Link>
                  <Link to="/support" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 py-3 px-4 text-gray-700 hover:bg-gray-50 hover:text-brand rounded-md transition-colors"><i className="fas fa-headset w-5 text-gray-400"></i> Support / Help Center</Link>
                </>
              )}
            </nav>

            {isAuthed && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="flex items-center gap-4 py-3 px-4 w-full text-red-500 hover:bg-red-50 rounded-md transition-colors font-bold">
                  <i className="fas fa-sign-out-alt w-5"></i> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Drawer */}
      {showNotifications && createPortal(
        <Notifications onClose={() => { setShowNotifications(false); fetchNotificationCount(); }} onUpdateCount={setNotificationCount} />,
        document.body
      )}

      <style>{`
        .animate-slideInRight {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
