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
    <div className="p-8 pb-24 text-white font-['Inter'] relative min-h-screen">
      <Toaster position="top-center" />
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h1 className="text-2xl font-bold mb-2">Wallet & Earnings</h1>
           <p className="text-white/50 text-sm">Manage your platform dues and earnings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
         <div className="bg-[#151515] border border-white/5 rounded-[1.5rem] p-8 flex items-center gap-6">
           <div className="p-4 rounded-2xl bg-[#1ec86d]/10 text-[#1ec86d]">
             <MdAccountBalanceWallet className="text-3xl" />
           </div>
           <div>
             <p className="text-sm font-medium text-white/50 uppercase tracking-wider">Total Earnings</p>
             <p className="text-3xl font-bold">৳ {totalEarnings.toLocaleString()}</p>
           </div>
         </div>

         <div className={`border rounded-[1.5rem] p-8 flex flex-col justify-center ${ledgerData.isApplyBlocked ? 'bg-red-500/10 border-red-500/50' : ledgerData.dueBalance >= 200 ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#151515] border-white/5'}`}>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <div className={`p-4 rounded-2xl ${ledgerData.dueBalance >= 200 ? 'bg-red-500/20 text-red-500' : 'bg-primary/10 text-primary'}`}>
                   <MdPayment className="text-3xl" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1 flex items-center gap-2">
                      Due Balance
                      {ledgerData.dueBalance >= 200 && <MdWarning className="text-amber-500" />}
                   </p>
                   <p className={`text-3xl font-bold ${ledgerData.dueBalance >= 200 ? 'text-red-500' : 'text-white'}`}>৳ {Number(ledgerData.dueBalance).toLocaleString()}</p>
                 </div>
              </div>
              {ledgerData.dueBalance > 0 && (
                <button onClick={() => setShowPayModal(true)} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl whitespace-nowrap uppercase tracking-widest text-xs transition-colors">
                  Pay Dues
                </button>
              )}
           </div>
           {ledgerData.isApplyBlocked && (
              <p className="text-xs text-red-400 mt-4 italic">Account restricted. Please clear your dues immediately to resume applying.</p>
           )}
         </div>
      </div>

      {ledgerData.ledgers && ledgerData.ledgers.length > 0 && (
          <div className="bg-[#151515] border border-white/5 rounded-[1.5rem] overflow-hidden mb-8 text-sm">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Ledger Transactions</h2>
            </div>
            <div className="divide-y divide-white/5">
              {ledgerData.ledgers.map(l => (
                  <div key={l._id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors gap-4">
                     <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${l.direction === 'DEBIT' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                           {l.direction === 'DEBIT' ? <MdArrowUpward className="text-lg" /> : <MdArrowDownward className="text-lg" />}
                        </div>
                        <div>
                           <p className="font-bold">{l.type.replace(/_/g, ' ').toUpperCase()}</p>
                           <p className="text-xs text-white/50">{formatDate(l.createdAt)} {l.transactionId && `• TrxID: ${l.transactionId}`}</p>
                        </div>
                     </div>
                     <p className={`font-bold ${l.direction === 'DEBIT' ? 'text-red-500' : 'text-green-500'}`}>
                        {l.direction === 'DEBIT' ? '+' : '-'} ৳ {Number(l.amount).toLocaleString()}
                     </p>
                  </div>
              ))}
            </div>
          </div>
      )}

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

      {showPayModal && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-[1.5rem] w-full max-w-sm p-8 relative shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Pay Dues</h3>
            <p className="text-white/50 text-xs mb-6">Select your preferred payment method to clear your balance.</p>

            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
              <button 
                onClick={() => setPayMode('ssl')} 
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${payMode === 'ssl' ? 'bg-primary text-black' : 'text-white/50 hover:text-white'}`}
              >
                SSLCommerz
              </button>
              <button 
                onClick={() => setPayMode('manual')} 
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${payMode === 'manual' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
              >
                Manual (bKash)
              </button>
            </div>
            
            <form onSubmit={handlePayDues} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Amount Paid (৳)</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">৳</span>
                   <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" min="10" className="w-full pl-8 pr-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl focus:border-primary/50 outline-none text-white font-bold" required />
                </div>
              </div>
              
              {payMode === 'manual' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-white/50 text-xs mb-3 italic">Send money via bKash to <span className="text-primary font-bold">017XXXXXXXX</span>, then enter the TrxID.</p>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Transaction ID (TrxID)</label>
                  <input type="text" value={trxId} onChange={e => setTrxId(e.target.value)} placeholder="e.g. 8KSD932J1" className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl focus:border-primary/50 outline-none text-white font-bold" required />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-colors">
                    Cancel
                 </button>
                 <button type="submit" disabled={paying} className={`flex-[2] py-3 text-black font-bold uppercase tracking-widest text-xs rounded-xl disabled:opacity-50 transition-colors shadow-lg ${payMode === 'ssl' ? 'bg-primary hover:bg-primary/90 shadow-primary/20' : 'bg-white hover:bg-white/90 shadow-white/20'}`}>
                    {paying ? 'Processing...' : (payMode === 'ssl' ? 'Pay Securely' : 'Submit TrxID')}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
