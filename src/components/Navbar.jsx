import { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthContext } from '../Authentication/AuthProvider';
import { useProfile } from '../contexts/ProfileContext';
import DarkModeToggle from './DarkModeToggle';
import Notifications from './Notifications';

export default function WorkerNavbar() {
  const ctx = useContext(AuthContext) || {};
  const { profile, setProfile, fetchProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const isDashboardArea = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [uid, setUid] = useState(ctx?.user?.uid || auth.currentUser?.uid || null);

  useEffect(() => { document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto'; }, [isMenuOpen]);

  // Close profile dropdown and notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
      if (isNotificationsOpen && !event.target.closest('.notifications-dropdown')) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen, isNotificationsOpen]);

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

  const [notificationCount, setNotificationCount] = useState(0);

  // Poll for notifications count
  useEffect(() => {
    if (!uid) return;
    const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const fetchCount = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/notifications/${uid}`);
        setNotificationCount(res.data.unreadCount || 0);
      } catch (err) { }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, [uid]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const isAuthed = !!uid;

  const avatar = profile?.profileCover || ctx?.user?.photoURL || '/default-profile.png';
  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    profile?.displayName ||
    ctx?.user?.displayName ||
    'My Account';
  const secondaryLine = profile?.phone || uid || '';

  return (
    <div className="w-full">
      <div className={`shadow-sm border-b px-4 sm:px-6 lg:px-8 ${isDashboardArea ? 'bg-[#0f0f0f] border-white/5' : 'bg-base-200 border-base-300'}`}>
          <div className="flex justify-between items-center h-16">
            {/* Enhanced Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-primary-content font-heading font-bold text-xl">H</span>
              </div>
              <span className="text-2xl font-heading font-bold text-base-content">
                Hire<span className="text-primary">Mistri</span>
              </span>
            </Link>

            {/* Desktop Navigation - minimized: Dashboard, Find Jobs, Messages, Notifications, Dropdown */}
            <div className="hidden lg:flex items-center space-x-6">
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => 
                  `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-base-content hover:bg-base-300'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/jobs" 
                className={({ isActive }) => 
                  `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/20 text-primary' 
                      : 'text-base-content hover:bg-base-300'
                  }`
                }
              >
                Find Jobs
              </NavLink>
              
              {isAuthed ? (
                <>
                  <NavLink 
                    to="/chats" 
                    className={({ isActive }) => 
                      `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary/20 text-primary' 
                          : 'text-base-content hover:bg-base-300'
                      }`
                    }
                  >
                    Messages
                  </NavLink>

                  {/* Notifications Popover Trigger */}
                  <div className="relative notifications-dropdown">
                    <button 
                      onClick={() => setIsNotificationsOpen(true)}
                      className="btn btn-ghost btn-circle relative"
                    >
                      <i className="far fa-bell text-lg text-base-content"></i>
                      {notificationCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-content text-[10px] font-bold rounded-full flex items-center justify-center">
                          {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                      )}
                    </button>
                    {isNotificationsOpen && createPortal(
                      <Notifications 
                        onClose={() => setIsNotificationsOpen(false)} 
                        onUpdateCount={setNotificationCount} 
                      />,
                      document.body
                    )}
                  </div>

                  {/* Dark Mode Toggle */}
                  <DarkModeToggle />

                  {/* Profile Dropdown */}
                  <div className="relative profile-dropdown">
                    <button 
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-base-300 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/20">
                        <img src={avatar} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium text-base-content">{displayName}</div>
                        <div className="text-xs text-base-content opacity-70">{secondaryLine}</div>
                      </div>
                      <i className={`fas fa-chevron-down opacity-70 text-xs text-base-content transition-transform duration-200 ${
                        isProfileDropdownOpen ? 'rotate-180' : ''
                      }`}></i>
                    </button>
                    
                    {/* Dropdown Menu - My Profile, Browse Clients, Settings, Support, Sign Out */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-base-200 rounded-xl shadow-xl border border-base-300 p-3 z-50">
                        <div className="px-2 py-3 border-b border-base-300 mb-2">
                          <div className="font-semibold text-base-content">{displayName}</div>
                          {secondaryLine && <div className="text-sm text-base-content/70">{secondaryLine}</div>}
                        </div>
                        <Link 
                          to="/edit-profile" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-3 py-2.5 rounded-lg text-base-content hover:bg-primary/10 hover:text-primary text-sm"
                        >
                          <i className="far fa-user w-4 h-4 mr-3 text-primary"></i>
                          My Profile
                        </Link>
                        <Link 
                          to="/browse-clients" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-3 py-2.5 rounded-lg text-base-content hover:bg-primary/10 hover:text-primary text-sm"
                        >
                          <i className="far fa-users w-4 h-4 mr-3 text-primary"></i>
                          Browse Clients
                        </Link>
                        <Link 
                          to="/settings" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-3 py-2.5 rounded-lg text-base-content hover:bg-primary/10 hover:text-primary text-sm"
                        >
                          <i className="far fa-cog w-4 h-4 mr-3 text-primary"></i>
                          Settings
                        </Link>
                        <Link 
                          to="/support" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-3 py-2.5 rounded-lg text-base-content hover:bg-primary/10 hover:text-primary text-sm"
                        >
                          <i className="far fa-life-ring w-4 h-4 mr-3 text-primary"></i>
                          Support
                        </Link>
                        <div className="border-t border-base-300 mt-2 pt-2">
                          <button 
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              handleLogout();
                            }} 
                            className="flex items-center w-full px-3 py-2.5 rounded-lg text-error hover:bg-error/10 text-sm"
                          >
                            <i className="far fa-sign-out-alt w-4 h-4 mr-3"></i>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // ======= Public (not logged in) =======
                <div className="flex items-center space-x-4">
                  <NavLink 
                    to="/login" 
                    className="px-4 py-2 text-base-content hover:text-primary font-medium transition-colors"
                  >
                    Log in
                  </NavLink>
                  <NavLink 
                    to="/registration" 
                    className="btn btn-primary border-none"
                  >
                    Create account
                  </NavLink>
                  <DarkModeToggle />
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center space-x-2">
              <DarkModeToggle />
              <button 
                onClick={() => setIsMenuOpen(true)}
                className="btn btn-ghost btn-circle"
              >
                <i className="fas fa-bars text-xl text-base-content"></i>
              </button>
            </div>
          </div>
      </div>

      {/* Enhanced Mobile Drawer */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed top-0 right-0 w-full h-full bg-base-200 z-50 shadow-2xl overflow-y-auto">
            <div className="p-6">
              {/* Mobile Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-content font-heading font-bold text-sm">H</span>
                  </div>
                  <span className="text-lg font-heading font-bold text-base-content">
                    Hire<span className="text-primary">Mistri</span>
                  </span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="btn btn-ghost btn-circle"
                >
                  <i className="fas fa-times text-xl text-base-content"></i>
                </button>
              </div>

              {/* User Info */}
              {isAuthed && (
                <div className="flex items-center space-x-4 mb-8 p-4 bg-base-300 rounded-xl">
                  <img src={avatar} alt="User" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20" />
                  <div>
                    <div className="font-semibold text-base-content">{displayName}</div>
                    {secondaryLine && <div className="text-sm text-base-content opacity-70">{secondaryLine}</div>}
                  </div>
                </div>
              )}

              {/* Mobile Navigation - minimized: Find Jobs, Dashboard, Messages, Dropdown items */}
              <nav className="space-y-2">
                <NavLink 
                  to="/jobs" 
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary/20 text-primary' 
                        : 'text-base-content hover:bg-base-300'
                    }`
                  }
                >
                  <i className="fas fa-search w-5 h-5 text-base-content"></i>
                  <span>Find Jobs</span>
                </NavLink>

                {isAuthed ? (
                  <>
                    <NavLink 
                      to="/dashboard" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-base-content hover:bg-base-300'
                        }`
                      }
                    >
                      <i className="fas fa-tachometer-alt w-5 h-5 text-base-content"></i>
                      <span>Dashboard</span>
                    </NavLink>
                    <NavLink 
                      to="/chats" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-base-content hover:bg-base-300'
                        }`
                      }
                    >
                      <i className="fas fa-comment-dots w-5 h-5 text-base-content"></i>
                      <span>Messages</span>
                    </NavLink>
                    <div className="divider my-4"></div>
                    <NavLink 
                      to="/browse-clients" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-base-content hover:bg-base-300'
                        }`
                      }
                    >
                      <i className="fas fa-users w-5 h-5 text-base-content"></i>
                      <span>Browse Clients</span>
                    </NavLink>
                    <NavLink 
                      to="/edit-profile" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-base-content hover:bg-base-300'
                        }`
                      }
                    >
                      <i className="fas fa-user w-5 h-5 text-base-content"></i>
                      <span>My Profile</span>
                    </NavLink>
                    <NavLink 
                      to="/settings" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-base-content hover:bg-base-300'
                        }`
                      }
                    >
                      <i className="fas fa-cog w-5 h-5 text-base-content"></i>
                      <span>Settings</span>
                    </NavLink>
                    <NavLink 
                      to="/support" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-base-content hover:bg-base-300'
                        }`
                      }
                    >
                      <i className="fas fa-life-ring w-5 h-5 text-base-content"></i>
                      <span>Support</span>
                    </NavLink>
                    
                    <div className="divider my-4"></div>
                    
                    <button 
                      onClick={() => { setIsMenuOpen(false); handleLogout(); }} 
                      className="flex items-center space-x-3 w-full px-4 py-3 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <i className="fas fa-sign-out-alt w-5 h-5"></i>
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="divider my-4"></div>
                    <NavLink 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center justify-center px-4 py-3 text-base-content hover:bg-base-300 rounded-lg transition-colors"
                    >
                      Log in
                    </NavLink>
                    <NavLink 
                      to="/registration" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="btn btn-primary w-full"
                    >
                      Create account
                    </NavLink>
                  </>
                )}
              </nav>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
