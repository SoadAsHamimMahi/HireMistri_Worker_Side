import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  MdDashboard,
  MdAssignmentTurnedIn,
  MdWork,
  MdShoppingBag,
  MdAccountBalanceWallet,
  MdConstruction,
} from 'react-icons/md';

const sidebarLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: MdDashboard },
  { name: 'My Applications', path: '/dashboard/applications', icon: MdAssignmentTurnedIn },
  { name: 'Job Offers', path: '/dashboard/job-offers', icon: MdWork },
  { name: 'My Orders', path: '/dashboard/orders', icon: MdShoppingBag },
  { name: 'Earnings', path: '/dashboard/earnings', icon: MdAccountBalanceWallet },
];

export default function DashboardLayout() {
  return (
    <div className="flex bg-[#0A0A0A] min-h-[calc(100vh-4rem)] text-white font-['Inter']">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F0F0F] border-r border-white/5 flex flex-col p-6 shrink-0 sticky top-16">
        <div className="flex items-center gap-3 mb-10 px-2 text-[#10b77f]">
          <MdConstruction className="text-3xl" />
          <h1 className="text-xl font-bold tracking-tight text-white">Hire Mistri</h1>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                    isActive
                      ? 'bg-[#10b77f] text-white shadow-lg shadow-[#10b77f]/20'
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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
