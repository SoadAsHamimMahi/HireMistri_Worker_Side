import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function WorkerNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dummy notification counts (replace with real state or context later)
  const notifCount = 2;
  const msgCount = 1;

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
  }, [isMenuOpen]);

  return (
    <div className="w-full">
      {/* Top Navbar */}
      <div className="navbar bg-black text-white px-4 md:px-6 shadow-sm justify-between items-center">
        {/* Left: Logo */}
        <Link to="/" className="text-3xl font-bold text-white">
          Hire<span className="text-green-500">Mistri</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-4 text-sm">
          <NavLink to="/dashboard" className="hover:text-green-400">Dashboard</NavLink>
          <NavLink to="/jobs" className="hover:text-green-400">Find Jobs</NavLink>
          <NavLink to="/applications" className="hover:text-green-400">Applications</NavLink>
          <NavLink to="/orders" className="hover:text-green-400">Orders</NavLink>

          {/* Notifications */}
          <div className="indicator">
            <button className="btn btn-ghost btn-circle text-lg">
              <i className="far fa-bell"></i>
            </button>
            {notifCount > 0 && (
              <span className="badge badge-sm badge-error indicator-item">{notifCount}</span>
            )}
          </div>

          {/* Messages */}
          <div className="indicator">
            <button className="btn btn-ghost btn-circle text-lg">
              <i className="far fa-envelope"></i>
            </button>
            {msgCount > 0 && (
              <span className="badge badge-sm badge-primary indicator-item">{msgCount}</span>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-8 rounded-full">
                <img src="https://i.pravatar.cc/100?img=5" alt="User" />
              </div>
            </div>
            <ul className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-40 text-black">
              <li><Link to="/edit-profile">Edit Profile</Link></li>
              <li><Link to="/settings">Settings</Link></li>
              <li><a href="#">Logout</a></li>
            </ul>
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div className="lg:hidden">
          <button
            className="btn btn-ghost btn-circle"
            onClick={() => setIsMenuOpen(true)}
          >
            <i className="fas fa-bars text-white text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="fixed top-0 right-0 w-4/5 h-full bg-white text-black z-50 px-6 py-6 overflow-y-auto animate-fadeSlideIn rounded-l-xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="https://i.pravatar.cc/100?img=5"
                  alt="User"
                  className="w-10 h-10 rounded-full"
                />
                <div className="font-semibold">Rakib Hossain</div>
              </div>
              <button className="text-xl" onClick={() => setIsMenuOpen(false)}>✕</button>
            </div>

            <nav className="flex flex-col gap-3 text-sm">
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>Dashboard</Link>
              <Link to="/jobs" onClick={() => setIsMenuOpen(false)}>Find Jobs</Link>
              <Link to="/applications" onClick={() => setIsMenuOpen(false)}>Applications</Link>
              <Link to="/orders" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
              <Link to="/edit-profile" onClick={() => setIsMenuOpen(false)}>Edit Profile</Link>

              {/* Notifications */}
              <div className="flex items-center gap-2 mt-2">
                <i className="far fa-bell"></i>
                <span className="text-sm">Notifications</span>
                {notifCount > 0 && (
                  <span className="badge badge-sm badge-error ml-auto">{notifCount}</span>
                )}
              </div>

              {/* Messages */}
              <div className="flex items-center gap-2">
                <i className="far fa-envelope"></i>
                <span className="text-sm">Messages</span>
                {msgCount > 0 && (
                  <span className="badge badge-sm badge-primary ml-auto">{msgCount}</span>
                )}
              </div>

              <hr className="my-4" />
              <a href="#" onClick={() => setIsMenuOpen(false)}>Logout</a>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
