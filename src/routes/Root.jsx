import React from 'react';
import Navbar from '../components/Navbar';
import { Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';

const Root = () => {
  const location = useLocation();
  const isDashboardArea = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/');

  return (
    <div className={`min-h-screen app-root transition-colors duration-300 flex flex-col overflow-x-hidden ${isDashboardArea ? 'bg-[#0a0a0a]' : ''}`}>
      <Navbar />
      <main className={`flex-1 w-full ${isDashboardArea ? '' : 'max-w-[83.333%] mx-auto'}`}>
        <Outlet />
      </main>
      {!isDashboardArea && <Footer />}
    </div>
  );
};

export default Root;