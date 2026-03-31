import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import { MdAccountBalanceWallet, MdCalendarToday, MdTrendingUp } from 'react-icons/md';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Earnings() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/my-applications/${uid}`, {
          headers: { Accept: 'application/json' },
        });
        const apps = Array.isArray(data) ? data : [];
        const completed = apps.filter(
          (a) => (a.status || '').toLowerCase() === 'completed' || (a.status || '').toLowerCase() === 'accepted'
        );
        const earningsList = completed.map((a) => ({
          id: a._id?.$oid || a._id,
          jobTitle: a.title || a.jobTitle || 'Completed Job',
          amount: a.payout ?? a.earning ?? a.price ?? a.budget ?? 0,
          date: a.completedAt || a.updatedAt || a.createdAt,
          clientName: a.clientName || 'Client',
        }));
        const total = earningsList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        setEarnings(earningsList);
        setTotalEarnings(total);
      } catch (e) {
        setEarnings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date) ? '—' : date.toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Past Earnings</h1>
        <p className="text-white/50 text-sm">View your completed jobs and earnings history</p>
      </div>

      {/* Summary Card */}
      <div className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-8 mb-8 flex items-center gap-6">
        <div className="p-4 rounded-2xl bg-[#1ec86d]/10 text-[#1ec86d]">
          <MdAccountBalanceWallet className="text-3xl" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/50 uppercase tracking-wider">Total Earnings</p>
          <p className="text-3xl font-bold">৳ {totalEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Earnings List */}
      <div className="bg-[#151515] border border-white/5 rounded-[1.5rem] overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Earnings History</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-white/50">Loading...</div>
        ) : earnings.length === 0 ? (
          <div className="p-12 text-center">
            <MdTrendingUp className="text-4xl text-white/20 mx-auto mb-4" />
            <p className="text-white/50 mb-2">No earnings yet</p>
            <p className="text-sm text-white/40">Complete jobs to see your earnings here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {earnings.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-[#1ec86d]/10 text-[#1ec86d]">
                    <MdCalendarToday className="text-lg" />
                  </div>
                  <div>
                    <p className="font-medium">{e.jobTitle}</p>
                    <p className="text-sm text-white/50">{e.clientName} • {formatDate(e.date)}</p>
                  </div>
                </div>
                <p className="font-bold text-[#1ec86d]">৳ {Number(e.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
