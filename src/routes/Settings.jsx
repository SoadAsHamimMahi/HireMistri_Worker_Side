import React from 'react';
import { MdSettings } from 'react-icons/md';

export default function Settings() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
        <p className="text-base-content/70 text-sm">Manage your account preferences</p>
      </div>
      <div className="bg-base-200 border border-base-300 rounded-2xl p-12 text-center">
        <MdSettings className="text-5xl text-base-content/30 mx-auto mb-4" />
        <p className="text-base-content/70 font-medium">Settings coming soon</p>
        <p className="text-sm text-base-content/50 mt-2">Notifications, privacy, and more</p>
      </div>
    </div>
  );
}
