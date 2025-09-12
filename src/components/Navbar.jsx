import { useState, useEffect, useContext } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { AuthContext } from '../Authentication/AuthProvider';
import DarkModeToggle from './DarkModeToggle';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function WorkerNavbar() {
  const ctx = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const auth = getAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [uid, setUid] = useState(ctx?.user?.uid || auth.currentUser?.uid || null);
  const [profile, setProfile] = useState(null);

  useEffect(() => { document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto'; }, [isMenuOpen]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  useEffect(() => { setUid(ctx?.user?.uid || null); }, [ctx?.user]);
  useEffect(() => onAuthStateChanged(auth, u => setUid(u?.uid || null)), [auth]);

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!uid) { setProfile(null); return; }
      try {
        const res = await fetch(`${API_BASE}/api/users/${uid}`);
        if (res.ok && !ignore) setProfile(await res.json());
      } catch { if (!ignore) setProfile(null); }
    })();
    return () => { ignore = true; };
  }, [uid]);

  const handleLogout = async () => { await signOut(auth); navigate('/login'); };

  const isAuthed = !!uid;

  const avatar = profile?.profileCover || ctx?.user?.photoURL || '/default-profile.png';
  const displayName =
    profile?.displayName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    ctx?.user?.displayName ||
    'My Account';
  const secondaryLine = profile?.phone || uid || '';

  const notifCount = 2; // TODO wire real counts
  const msgCount = 1;

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Enhanced Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-heading font-bold text-xl">H</span>
              </div>
              <span className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                Hire<span className="text-primary-500">Mistri</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              <NavLink 
                to="/jobs" 
                className={({ isActive }) => 
                  `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`
                }
              >
                Find Jobs
              </NavLink>
              
              {isAuthed ? (
                <>
                  <NavLink 
                    to="/dashboard" 
                    className={({ isActive }) => 
                      `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    Dashboard
                  </NavLink>
                  <NavLink 
                    to="/applications" 
                    className={({ isActive }) => 
                      `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    Applications
                  </NavLink>
                  <NavLink 
                    to="/orders" 
                    className={({ isActive }) => 
                      `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    Orders
                  </NavLink>

                  {/* Notifications */}
                  <div className="relative">
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <i className="far fa-bell text-lg"></i>
                      {notifCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {notifCount}
                        </span>
                      )}
                    </button>
                  </div>
                  
                  {/* Messages */}
                  <div className="relative">
                    <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                      <i className="far fa-envelope text-lg"></i>
                      {msgCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                          {msgCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Dark Mode Toggle */}
                  <DarkModeToggle />

                  {/* Profile Dropdown */}
                  <div className="relative profile-dropdown">
                    <button 
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary-200 dark:ring-primary-800">
                        <img src={avatar} alt="User" className="w-full h-full object-cover" />
                      </div>
                      <div className="hidden md:block text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{secondaryLine}</div>
                      </div>
                      <i className={`fas fa-chevron-down text-gray-400 text-xs transition-transform duration-200 ${
                        isProfileDropdownOpen ? 'rotate-180' : ''
                      }`}></i>
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-slide-up">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="font-semibold text-gray-900 dark:text-white">{displayName}</div>
                          {secondaryLine && <div className="text-sm text-gray-500 dark:text-gray-400">{secondaryLine}</div>}
                        </div>
                        <Link 
                          to="/edit-profile" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <i className="far fa-user w-4 h-4 mr-3"></i>
                          My Profile
                        </Link>
                        <Link 
                          to="/settings" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <i className="far fa-cog w-4 h-4 mr-3"></i>
                          Account Settings
                        </Link>
                        <a 
                          href="mailto:support@hiremistri.example" 
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <i className="far fa-question-circle w-4 h-4 mr-3"></i>
                          Need Help?
                        </a>
                        <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                          <button 
                            onClick={() => {
                              setIsProfileDropdownOpen(false);
                              handleLogout();
                            }} 
                            className="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                  >
                    Log in
                  </NavLink>
                  <NavLink 
                    to="/register" 
                    className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
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
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <i className="fas fa-bars text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Mobile Drawer */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed top-0 right-0 w-80 h-full bg-white dark:bg-gray-800 z-50 shadow-2xl">
            <div className="p-6">
              {/* Mobile Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-heading font-bold text-sm">H</span>
                  </div>
                  <span className="text-lg font-heading font-bold text-gray-900 dark:text-white">
                    Hire<span className="text-primary-500">Mistri</span>
                  </span>
                </div>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {/* User Info */}
              {isAuthed && (
                <div className="flex items-center space-x-4 mb-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <img src={avatar} alt="User" className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-200 dark:ring-primary-800" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{displayName}</div>
                    {secondaryLine && <div className="text-sm text-gray-500 dark:text-gray-400">{secondaryLine}</div>}
                  </div>
                </div>
              )}

              {/* Mobile Navigation */}
              <nav className="space-y-2">
                <NavLink 
                  to="/jobs" 
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`
                  }
                >
                  <i className="fas fa-search w-5 h-5"></i>
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
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      <i className="fas fa-tachometer-alt w-5 h-5"></i>
                      <span>Dashboard</span>
                    </NavLink>
                    <NavLink 
                      to="/applications" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      <i className="fas fa-file-alt w-5 h-5"></i>
                      <span>Applications</span>
                    </NavLink>
                    <NavLink 
                      to="/orders" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      <i className="fas fa-shopping-bag w-5 h-5"></i>
                      <span>My Orders</span>
                    </NavLink>
                    <NavLink 
                      to="/edit-profile" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      <i className="fas fa-user-edit w-5 h-5"></i>
                      <span>My Profile</span>
                    </NavLink>
                    <NavLink 
                      to="/settings" 
                      onClick={() => setIsMenuOpen(false)}
                      className={({ isActive }) => 
                        `flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive 
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      <i className="fas fa-cog w-5 h-5"></i>
                      <span>Account Settings</span>
                    </NavLink>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                    
                    <button 
                      onClick={() => { setIsMenuOpen(false); handleLogout(); }} 
                      className="flex items-center space-x-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <i className="fas fa-sign-out-alt w-5 h-5"></i>
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                    <NavLink 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center justify-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Log in
                    </NavLink>
                    <NavLink 
                      to="/register" 
                      onClick={() => setIsMenuOpen(false)} 
                      className="flex items-center justify-center px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
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
