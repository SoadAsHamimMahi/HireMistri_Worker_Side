import React from 'react';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f9f9f7]">
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
