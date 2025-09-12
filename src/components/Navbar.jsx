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
  const [uid, setUid] = useState(ctx?.user?.uid || auth.currentUser?.uid || null);
  const [profile, setProfile] = useState(null);

  useEffect(() => { document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto'; }, [isMenuOpen]);

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
      <div className="navbar bg-black dark:bg-gray-900 text-white px-4 md:px-6 shadow-sm justify-between items-center">
        <Link to="/" className="text-3xl font-bold text-white">
          Hire<span className="text-green-500">Mistri</span>
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-4 text-sm">
          <NavLink 
            to="/jobs" 
            className={({ isActive }) => 
              `hover:text-green-400 transition-colors duration-200 ${
                isActive ? 'text-green-400 font-semibold' : 'text-white'
              }`
            }
          >
            Find Jobs
          </NavLink>
          
          {/* Dark Mode Toggle */}
          <DarkModeToggle />

          {isAuthed ? (
            <>
              <NavLink 
                to="/dashboard" 
                className={({ isActive }) => 
                  `hover:text-green-400 transition-colors duration-200 ${
                    isActive ? 'text-green-400 font-semibold' : 'text-white'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/applications" 
                className={({ isActive }) => 
                  `hover:text-green-400 transition-colors duration-200 ${
                    isActive ? 'text-green-400 font-semibold' : 'text-white'
                  }`
                }
              >
                Applications
              </NavLink>
              <NavLink 
                to="/orders" 
                className={({ isActive }) => 
                  `hover:text-green-400 transition-colors duration-200 ${
                    isActive ? 'text-green-400 font-semibold' : 'text-white'
                  }`
                }
              >
                Orders
              </NavLink>

              {/* notifications */}
              <div className="indicator">
                <button className="btn btn-ghost btn-circle text-lg">
                  <i className="far fa-bell"></i>
                </button>
                {notifCount > 0 && <span className="badge badge-sm badge-error indicator-item">{notifCount}</span>}
              </div>
              {/* messages */}
              <div className="indicator">
                <button className="btn btn-ghost btn-circle text-lg">
                  <i className="far fa-envelope"></i>
                </button>
                {msgCount > 0 && <span className="badge badge-sm badge-primary indicator-item">{msgCount}</span>}
              </div>

              {/* profile */}
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10">
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full ring ring-white/20 ring-offset-2 overflow-hidden">
                      <img src={avatar} alt="User" />
                    </div>
                  </div>
                  <span className="text-blue-300 hover:text-blue-200 font-semibold">{displayName}</span>
                  <svg className="w-4 h-4 text-blue-300" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.356a.75.75 0 011.02 1.1l-4.22 3.818a.75.75 0 01-1.02 0L5.21 8.33a.75.75 0 01.02-1.12z"/></svg>
                </div>
                <ul tabIndex={0} className="menu dropdown-content mt-3 z-[1] p-0 shadow bg-base-100 rounded-box w-64 text-gray-800">
                  <li className="px-4 py-3 border-b">
                    <div className="font-semibold text-base">{displayName}</div>
                    {secondaryLine && <div className="text-xs text-gray-500 mt-0.5">{secondaryLine}</div>}
                  </li>
                  <li><Link to="/edit-profile" className="py-3"><i className="far fa-user mr-3" /> My Profile</Link></li>
                  <li><Link to="/settings" className="py-3"><i className="far fa-cog mr-3" /> Account Settings</Link></li>
                  <li><a href="mailto:support@hiremistri.example" className="py-3"><i className="far fa-question-circle mr-3" /> Need Help?</a></li>
                  <li className="border-t"><button onClick={handleLogout} className="py-3 text-left"><i className="far fa-sign-out-alt mr-3" /> Sign Out</button></li>
                </ul>
              </div>
            </>
          ) : (
            // ======= Public (not logged in) =======
            <div className="flex items-center gap-3">
              <NavLink to="/login" className="btn btn-sm btn-ghost normal-case">Log in</NavLink>
              <NavLink to="/register" className="btn btn-sm btn-primary normal-case">Create account</NavLink>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <DarkModeToggle />
          <button className="btn btn-ghost btn-circle" onClick={() => setIsMenuOpen(true)}>
            <i className="fas fa-bars text-white text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setIsMenuOpen(false)} />
          <div className="fixed top-0 right-0 w-4/5 h-full bg-white dark:bg-gray-800 text-black dark:text-white z-50 px-6 py-6 overflow-y-auto rounded-l-xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              {isAuthed ? (
                <div className="flex items-center gap-3">
                  <img src={avatar} alt="User" className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold">{displayName}</div>
                    {secondaryLine && <div className="text-xs text-gray-500">{secondaryLine}</div>}
                  </div>
                </div>
              ) : (
                <div className="font-semibold">Welcome to HireMistri</div>
              )}
              <button className="text-xl" onClick={() => setIsMenuOpen(false)}>✕</button>
            </div>

            <nav className="flex flex-col gap-3 text-sm">
              <NavLink 
                to="/jobs" 
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) => 
                  `hover:text-green-500 transition-colors duration-200 ${
                    isActive ? 'text-green-500 font-semibold' : 'text-gray-700 dark:text-gray-300'
                  }`
                }
              >
                Find Jobs
              </NavLink>

              {isAuthed ? (
                <>
                  <NavLink 
                    to="/dashboard" 
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => 
                      `hover:text-green-500 transition-colors duration-200 ${
                        isActive ? 'text-green-500 font-semibold' : 'text-gray-700 dark:text-gray-300'
                      }`
                    }
                  >
                    Dashboard
                  </NavLink>
                  <NavLink 
                    to="/applications" 
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => 
                      `hover:text-green-500 transition-colors duration-200 ${
                        isActive ? 'text-green-500 font-semibold' : 'text-gray-700 dark:text-gray-300'
                      }`
                    }
                  >
                    Applications
                  </NavLink>
                  <NavLink 
                    to="/orders" 
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => 
                      `hover:text-green-500 transition-colors duration-200 ${
                        isActive ? 'text-green-500 font-semibold' : 'text-gray-700 dark:text-gray-300'
                      }`
                    }
                  >
                    My Orders
                  </NavLink>
                  <NavLink 
                    to="/edit-profile" 
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => 
                      `hover:text-green-500 transition-colors duration-200 ${
                        isActive ? 'text-green-500 font-semibold' : 'text-gray-700 dark:text-gray-300'
                      }`
                    }
                  >
                    My Profile
                  </NavLink>
                  <NavLink 
                    to="/settings" 
                    onClick={() => setIsMenuOpen(false)}
                    className={({ isActive }) => 
                      `hover:text-green-500 transition-colors duration-200 ${
                        isActive ? 'text-green-500 font-semibold' : 'text-gray-700 dark:text-gray-300'
                      }`
                    }
                  >
                    Account Settings
                  </NavLink>
                  <hr className="my-4" />
                  <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="text-left">Sign Out</button>
                </>
              ) : (
                <>
                  <hr className="my-2" />
                  <NavLink to="/login" onClick={() => setIsMenuOpen(false)} className="btn btn-outline">Log in</NavLink>
                  <NavLink to="/register" onClick={() => setIsMenuOpen(false)} className="btn btn-primary">Create account</NavLink>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
