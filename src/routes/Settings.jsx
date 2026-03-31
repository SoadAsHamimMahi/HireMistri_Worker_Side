import React from 'react';
import { MdSettings } from 'react-icons/md';

export default function Settings() {
  return (
    <div className="p-8 max-w-2xl text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
        <p className="text-white/50 text-sm">Manage your account preferences</p>
      </div>
      <div className="bg-[#151515] border border-white/5 rounded-2xl p-12 text-center">
        <MdSettings className="text-5xl text-white/20 mx-auto mb-4" />
        <p className="text-white/60 font-medium">Settings coming soon</p>
        <p className="text-sm text-white/40 mt-2">Notifications, privacy, and more</p>
      </div>
    </div>
  );
}
