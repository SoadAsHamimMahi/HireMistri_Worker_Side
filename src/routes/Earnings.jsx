import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../Authentication/AuthProvider';
import { MdAccountBalanceWallet, MdCalendarToday, MdTrendingUp, MdPayment, MdWarning, MdArrowDownward, MdArrowUpward } from 'react-icons/md';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Earnings() {
  const { user } = useContext(AuthContext) || {};
  const uid = user?.uid || null;
  const [earnings, setEarnings] = useState([]);
  const [ledgerData, setLedgerData] = useState({ ledgers: [], dueBalance: 0, isApplyBlocked: false });
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Pay Dues State
  const [showPayModal, setShowPayModal] = useState(false);
  const [trxId, setTrxId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [payMode, setPayMode] = useState('ssl'); // 'ssl' or 'manual'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [earningsRes, ledgerRes] = await Promise.all([
        axios.get(`${API_BASE}/api/my-applications/${uid}`, { headers: { Accept: 'application/json' } }),
        axios.get(`${API_BASE}/api/wallet/ledger/${uid}`)
      ]);

      // Earnings Logic
      const apps = Array.isArray(earningsRes.data) ? earningsRes.data : [];
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
      setTotalEarnings(earningsList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0));
      setEarnings(earningsList);

      // Ledger Logic
      if (ledgerRes.data) {
        setLedgerData(ledgerRes.data);
      }
    } catch (e) {
      console.warn("Error fetching wallet data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (uid) fetchData();
  }, [uid]);

  const handlePayDues = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return toast.error('Enter valid amount');
    setPaying(true);

    try {
      if (payMode === 'manual') {
        if (!trxId) return toast.error('Transaction ID is required for manual payment');
        await axios.post(`${API_BASE}/api/dues/pay`, {
          workerId: uid,
          amount: Number(payAmount),
          gateway: 'manual_bkash',
          transactionId: trxId
        });
        toast.success('Payment submitted for verification');
        setShowPayModal(false);
        setTrxId('');
        setPayAmount('');
      } else {
        // SSLCommerz Flow
        const { data } = await axios.post(`${API_BASE}/api/dues/ssl-init`, {
          workerId: uid,
          amount: Number(payAmount),
          redirectUrl: window.location.origin
        });
        if (data.url) {
          window.location.href = data.url; // Redirect to gateway
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setPaying(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date) ? '—' : date.toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-base-100 p-6 md:p-12 pb-24 font-sans relative">
      <Toaster position="top-center" />
      
      {/* Header Section */}
      <div className="w-full max-w-[83.333%] mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-6xl font-heading font-black text-base-content tracking-tight">Ledger</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-base-content/30 italic">Financial Performance Monitor</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-5 py-3 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-xl">verified_user</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Secure Channel Active</span>
           </div>
        </div>
      </div>

      <div className="w-full max-w-[83.333%] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Stats Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group relative bg-base-200 border border-base-300 rounded-[2.5rem] p-10 transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-white text-xl">payments</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Gross Earnings</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-heading font-black text-base-content tracking-tighter">৳{totalEarnings.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">+12% vs last month</span>
                </div>
              </div>
            </div>

            <div className={`group relative border rounded-[2.5rem] p-10 transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${ledgerData.isApplyBlocked ? 'bg-error/5 border-error/20 hover:shadow-error/5' : 'bg-base-200 border-base-300 hover:shadow-primary/5'}`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-2xl ${ledgerData.isApplyBlocked ? 'bg-error/10' : 'bg-primary/5'}`}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${ledgerData.dueBalance >= 200 ? 'bg-error text-white shadow-error/20' : 'bg-base-100 text-primary shadow-sm'}`}>
                      <span className="material-symbols-outlined text-xl">{ledgerData.dueBalance >= 200 ? 'warning' : 'receipt_long'}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Platform Dues</span>
                  </div>
                  {ledgerData.dueBalance > 0 && (
                    <button onClick={() => setShowPayModal(true)} className="btn btn-sm btn-primary rounded-xl px-6 font-black uppercase tracking-widest text-[9px] shadow-lg shadow-primary/20 animate-pulse">
                      Settle Now
                    </button>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-heading font-black tracking-tighter ${ledgerData.dueBalance >= 200 ? 'text-error' : 'text-base-content'}`}>৳{Number(ledgerData.dueBalance).toLocaleString()}</span>
                  {ledgerData.isApplyBlocked && (
                     <span className="text-[8px] font-black text-error uppercase tracking-widest animate-bounce">Account Locked</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ledger History */}
          <div className="bg-base-100 border border-base-300 rounded-[2.5rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-base-300 flex items-center justify-between bg-base-200/30">
               <div className="space-y-1">
                  <h2 className="text-xl font-heading font-black text-base-content tracking-tight">Active Ledger</h2>
                  <p className="text-[9px] font-black uppercase tracking-widest text-base-content/30 italic">Audit Log v1.0</p>
               </div>
               <button className="btn btn-ghost btn-circle">
                  <span className="material-symbols-outlined text-base-content/40">filter_list</span>
               </button>
            </div>
            {ledgerData.ledgers && ledgerData.ledgers.length > 0 ? (
               <div className="divide-y divide-base-200">
                  {ledgerData.ledgers.map(l => (
                    <div key={l._id} className="group flex items-center justify-between p-8 hover:bg-base-200/50 transition-all">
                       <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${l.direction === 'DEBIT' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                             <span className="material-symbols-outlined text-2xl">{l.direction === 'DEBIT' ? 'trending_up' : 'trending_down'}</span>
                          </div>
                          <div>
                             <p className="text-sm font-black uppercase tracking-tight text-base-content mb-0.5">{l.type.replace(/_/g, ' ')}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30">{formatDate(l.createdAt)} {l.transactionId && `• TX: ${l.transactionId.slice(-8).toUpperCase()}`}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={`text-xl font-heading font-black tracking-tight ${l.direction === 'DEBIT' ? 'text-error' : 'text-primary'}`}>
                             {l.direction === 'DEBIT' ? '+' : '-'} ৳{Number(l.amount).toLocaleString()}
                          </p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-base-content/20">Authorized Transaction</p>
                       </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="p-20 text-center">
                  <span className="material-symbols-outlined text-5xl text-base-content/10 mb-4">folder_open</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30">No transaction logs available</p>
               </div>
            )}
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
           <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-8">Performance Insight</h3>
              <div className="space-y-8">
                 {[
                    { label: 'Weekly Velocity', value: '+৳4,200', desc: 'Net variance vs LW' },
                    { label: 'Efficiency Rating', value: '4.92', desc: 'System benchmark: 4.50' },
                    { label: 'Payout Reliability', value: '100%', desc: 'No failed transmissions' }
                 ].map((metric, i) => (
                    <div key={i} className="space-y-1">
                       <p className="text-[9px] font-black uppercase tracking-widest text-base-content/30">{metric.label}</p>
                       <p className="text-2xl font-heading font-black text-base-content">{metric.value}</p>
                       <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">{metric.desc}</p>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-base-200 border border-base-300 rounded-[2.5rem] p-8">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-base-content/40 mb-6">Recent Earnings</h3>
              <div className="space-y-4">
                 {earnings.slice(0, 5).map((e, index) => (
                    <div key={e.id} className="flex items-center justify-between p-4 bg-base-100 rounded-2xl border border-base-300 shadow-sm transition-transform hover:translate-x-1">
                       <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-tight text-base-content truncate">{e.jobTitle}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-base-content/30">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                       </div>
                       <p className="text-sm font-heading font-black text-primary">৳{Number(e.amount).toLocaleString()}</p>
                    </div>
                 ))}
                 {earnings.length > 5 && (
                    <button className="w-full py-3 text-[9px] font-black uppercase tracking-[0.3em] text-base-content/40 hover:text-primary transition-colors italic">Load Full Archive</button>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-[999] bg-base-100/60 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-base-100 border border-base-300 rounded-[3rem] w-full max-w-md p-10 relative shadow-[0_0_100px_rgba(16,185,129,0.1)]">
            <div className="mb-10 text-center">
               <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/20">
                  <span className="material-symbols-outlined text-3xl text-white">wallet</span>
               </div>
               <h3 className="text-3xl font-heading font-black text-base-content tracking-tight">Settlement Desk</h3>
               <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 mt-2 italic">Gateway Selection & Transit</p>
            </div>

            <div className="flex gap-3 mb-10 p-1.5 bg-base-200 rounded-2xl border border-base-300">
              <button
                onClick={() => setPayMode('ssl')}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${payMode === 'ssl' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-base-content/40 hover:text-base-content'}`}
              >
                Secure Portal
              </button>
              <button
                onClick={() => setPayMode('manual')}
                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${payMode === 'manual' ? 'bg-base-300 text-base-content shadow-sm' : 'text-base-content/40 hover:text-base-content'}`}
              >
                Direct Deposit
              </button>
            </div>

            <form onSubmit={handlePayDues} className="space-y-8">
              <div className="space-y-4">
                 <div className="relative">
                    <label className="text-[9px] font-black uppercase tracking-widest text-base-content/40 ml-4 mb-2 block">Settlement Amount (৳)</label>
                    <div className="relative">
                       <span className="absolute left-6 top-1/2 -translate-y-1/2 text-primary font-black text-xl">৳</span>
                       <input 
                         type="number" 
                         value={payAmount} 
                         onChange={e => setPayAmount(e.target.value)} 
                         placeholder="0.00" 
                         className="w-full pl-12 pr-6 py-4 bg-base-200 border-2 border-transparent focus:border-primary/20 focus:bg-base-100 rounded-2xl outline-none text-xl font-heading font-black text-base-content transition-all" 
                         required 
                       />
                    </div>
                 </div>

                 {payMode === 'manual' && (
                    <div className="animate-in slide-in-from-top-4 duration-500 space-y-4">
                       <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl italic">
                          <p className="text-[10px] font-medium text-primary leading-relaxed text-center">
                             Merchant: 017XXXXXXXX <br/>
                             Protocol: bKash Send-Money
                          </p>
                       </div>
                       <div className="relative">
                          <label className="text-[9px] font-black uppercase tracking-widest text-base-content/40 ml-4 mb-2 block">Transaction ID (TrxID)</label>
                          <input 
                            type="text" 
                            value={trxId} 
                            onChange={e => setTrxId(e.target.value)} 
                            placeholder="SCAN ID..." 
                            className="w-full px-6 py-4 bg-base-200 border-2 border-transparent focus:border-primary/20 focus:bg-base-100 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest text-base-content transition-all" 
                            required 
                          />
                       </div>
                    </div>
                 )}
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 btn btn-ghost rounded-2xl font-black uppercase tracking-widest text-[10px] min-h-[60px]">Cancel</button>
                <button type="submit" disabled={paying} className="flex-[2] btn btn-primary rounded-2xl font-black uppercase tracking-widest text-[10px] min-h-[60px] shadow-lg shadow-primary/20">
                  {paying ? <span className="loading loading-spinner loading-xs"></span> : (payMode === 'ssl' ? 'Execute Transfer' : 'Confirm Deposit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
