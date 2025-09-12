import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
  'Electrician',
  'Plumber',
  'Mason (Rajmistri)',
  'Carpenter',
  'Welder',
  'Painter',
  'AC Technician',
  'Freezer Mechanic',
  'Car Mechanic',
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/\s*\(.*\)\s*/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function Footer() {
  const year = new Date().getFullYear();
  const cats = useMemo(() => CATEGORIES.slice(0, 8), []);

  return (
    <footer className="mt-16 text-gray-300 dark:text-gray-400">
      {/* Worker CTA strip */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-xl md:text-2xl font-semibold text-white">
            Find work faster with <span className="text-green-500">Hire</span>Mistri
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link to="/jobs" className="inline-flex items-center justify-center px-5 py-2 rounded-md bg-green-500 hover:bg-green-600 text-white font-medium transition">
              Find Jobs
            </Link>
            <Link to="/applications" className="inline-flex items-center justify-center px-5 py-2 rounded-md border border-white/20 hover:bg-white/10 transition">
              My Applications
            </Link>
            <Link to="/dashboard" className="inline-flex items-center justify-center px-5 py-2 rounded-md border border-white/20 hover:bg-white/10 transition">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-black dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand + contact */}
            <div>
              <Link to="/" className="inline-flex items-baseline gap-1 font-extrabold text-2xl">
                <span className="text-white">Hire</span>
                <span className="text-green-500">Mistri</span>
              </Link>
              <p className="mt-3 text-sm text-gray-400 dark:text-gray-500 leading-6">
                Get matched to nearby jobs in minutes. Apply directly, chat with clients,
                and build your reputation with verified reviews.
              </p>

              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <MapPinIcon className="w-5 h-5 text-green-500 shrink-0" />
                  <span>Dhaka, Bangladesh</span>
                </li>
                <li className="flex items-start gap-2">
                  <PhoneIcon className="w-5 h-5 text-green-500 shrink-0" />
                  <a className="hover:text-white dark:hover:text-gray-200" href="tel:+8801990444882">+8801990444882</a>
                </li>
                <li className="flex items-start gap-2">
                  <EnvelopeIcon className="w-5 h-5 text-green-500 shrink-0" />
                  <a className="hover:text-white dark:hover:text-gray-200" href="mailto:soadashamimmahi@gmail.com">soadashamimmahi@gmail.com</a>
                </li>
              </ul>

              {/* Socials */}
              <div className="mt-4 flex items-center gap-3">
                <a href="#" aria-label="Facebook" className="p-2 rounded bg-white/5 hover:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06C2 17.06 5.66 21.2 10.44 22v-7.02H7.9v-2.92h2.54V9.41c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.92h-2.34V22C18.34 21.2 22 17.06 22 12.06z"/>
                  </svg>
                </a>
                <a href="#" aria-label="X" className="p-2 rounded bg-white/5 hover:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                    <path d="M3 3h3.6l5.1 6.93L17.4 3H21l-7.2 9.3 7.5 9.7h-3.6l-5.4-7.2-5.4 7.2H3l7.5-9.7L3 3z"/>
                  </svg>
                </a>
                <a href="#" aria-label="LinkedIn" className="p-2 rounded bg-white/5 hover:bg-white/10">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white/80">
                    <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v15H0zM8 8h4.8v2.04h.07c.67-1.27 2.3-2.6 4.73-2.6 5.06 0 6 3.33 6 7.66V23h-5v-6.8c0-1.62-.03-3.7-2.25-3.7-2.25 0-2.6 1.76-2.6 3.58V23H8V8z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* For Workers */}
            <div>
              <h4 className="text-white font-semibold mb-3">For Workers</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/jobs" className="hover:text-white dark:hover:text-gray-200">Find Jobs</Link></li>
                <li><Link to="/applications" className="hover:text-white dark:hover:text-gray-200">My Applications</Link></li>
                <li><Link to="/orders" className="hover:text-white dark:hover:text-gray-200">My Orders</Link></li>
                <li><Link to="/edit-profile" className="hover:text-white dark:hover:text-gray-200">Edit Profile</Link></li>
                <li><Link to="/settings" className="hover:text-white dark:hover:text-gray-200">Account Settings</Link></li>
                <li><Link to="/how-it-works#workers" className="hover:text-white dark:hover:text-gray-200">How it works</Link></li>
                <li><Link to="/support" className="hover:text-white dark:hover:text-gray-200">Support</Link></li>
              </ul>
            </div>

            {/* Top Categories */}
            <div>
              <h4 className="text-white font-semibold mb-3">Top Job Categories</h4>
              <ul className="space-y-2 text-sm">
                {cats.map((c) => (
                  <li key={c}>
                    <Link to={`/category/${slugify(c)}`} className="hover:text-white dark:hover:text-gray-200">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Job Alerts / Upsell */}
            <div>
              <h4 className="text-white font-semibold mb-3">Get job alerts</h4>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Be first to know when new jobs match your skills.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const email = new FormData(e.currentTarget).get('email');
                  if (!String(email).trim()) return;
                  // TODO: hook to your newsletter / alerts endpoint
                  e.currentTarget.reset();
                }}
                className="mt-3"
              >
                <div className="flex rounded-md overflow-hidden">
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-700 outline-none"
                  />
                  <button className="px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-medium" type="submit">
                    Subscribe
                  </button>
                </div>
              </form>

              <div className="mt-6 border border-white/10 dark:border-gray-600 rounded-lg p-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">Boost your chances:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link to="/edit-profile" className="inline-flex px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm">
                    Complete Profile
                  </Link>
                  <Link to="/settings#availability" className="inline-flex px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm">
                    Set Availability
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-white/10 dark:border-gray-600 flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs text-gray-400 dark:text-gray-500">
            <p>
              © {year} <span className="text-white">Hire</span>
              <span className="text-green-500">Mistri</span>. All rights reserved.
            </p>
            <div className="flex gap-5">
              <Link to="/terms" className="hover:text-white dark:hover:text-gray-200">Terms</Link>
              <Link to="/privacy" className="hover:text-white dark:hover:text-gray-200">Privacy</Link>
              <Link to="/help" className="hover:text-white dark:hover:text-gray-200">Help Center</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
