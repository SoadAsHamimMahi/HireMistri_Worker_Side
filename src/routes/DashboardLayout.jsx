import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  MdDashboard,
  MdAssignmentTurnedIn,
  MdWork,
  MdShoppingBag,
  MdAccountBalanceWallet,
  MdMenu,
  MdClose,
} from 'react-icons/md';

const sidebarLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: MdDashboard },
  { name: 'My Applications', path: '/dashboard/applications', icon: MdAssignmentTurnedIn },
  { name: 'Job Offers', path: '/dashboard/job-offers', icon: MdWork },
  { name: 'My Orders', path: '/dashboard/orders', icon: MdShoppingBag },
  { name: 'Earnings', path: '/dashboard/earnings', icon: MdAccountBalanceWallet },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex bg-[#0a0a0a] min-h-[calc(100vh-4rem)] text-white font-['Inter']">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static top-0 left-0 h-full z-30
        w-64 bg-[#0f0f0f] border-r border-white/5 flex flex-col p-6 shrink-0
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button – mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden self-end mb-6 p-1 text-white/40 hover:text-white transition-colors"
        >
          <MdClose className="text-2xl" />
        </button>

        <nav className="flex-1 space-y-1">
          {sidebarLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    isActive
                      ? 'bg-[#1ec86d] text-white shadow-lg shadow-[#1ec86d]/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon className="text-xl shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden m-4 p-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <MdMenu className="text-xl" />
        </button>
        <Outlet />
      </main>
    </div>
  );
}
