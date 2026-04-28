import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../Authentication/AuthProvider';
import SupportThread from './SupportThread';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function fetchWithAuth(url, options, getIdToken) {
  const token = await getIdToken?.();
  const headers = { ...options?.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export default function SupportInbox() {
  const { ticketId } = useParams();
  const { user, getIdToken, API_BASE: base } = useContext(AuthContext) || {};
  const apiBase = base || API_BASE;
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] = useState('Payment Issue');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchWithAuth(`${apiBase}/api/support/tickets`, {}, getIdToken);
        if (!res.ok) throw new Error(res.status === 403 ? 'Account suspended' : 'Failed to load tickets');
        const data = await res.json();
        setTickets(data.list || []);
      } catch (e) {
        setError(e.message);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [user?.uid, apiBase, getIdToken]);

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${apiBase}/api/support/tickets`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: newSubject.trim(), message: newMessage.trim(), category: newCategory }),
        },
        getIdToken
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
      setShowNewModal(false);
      setNewSubject('');
      setNewMessage('');
      setNewCategory('Payment Issue');
      if (data.ticket?._id) navigate(`/support/${data.ticket._id}`);
      else {
        const listRes = await fetchWithAuth(`${apiBase}/api/support/tickets`, {}, getIdToken);
        const listData = await listRes.json();
        setTickets(listData.list || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#fbfcfb] font-sans selection:bg-emerald-500/20 flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* Support Sidebar (Messages-Style) */}
      <div className={`flex flex-col w-full md:w-[380px] lg:w-[420px] border-r border-gray-100 bg-white relative z-20 transition-all ${ticketId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-8 border-b border-gray-50 bg-white/50 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                Support <span className="text-emerald-500">Hub</span>
                {tickets.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-600 text-[11px] px-2 py-0.5 rounded-lg border border-emerald-200">
                    {tickets.length}
                  </span>
                )}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Operational Intelligence</p>
            </div>
            <button
              type="button"
              className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all group shrink-0"
              onClick={() => setShowNewModal(true)}
            >
              <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">add</span>
            </button>
          </div>
          
          <div className="relative group/search">
             <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/search:text-emerald-500 transition-colors">search</span>
             <input 
               type="text" 
               placeholder="SCAN TICKETS..." 
               className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none transition-all placeholder-gray-300"
             />
          </div>

          {/* Filter Pills (Messages-Style) */}
          <div className="flex gap-2 mt-6 overflow-x-auto pb-1 no-scrollbar">
             {['all', 'open', 'closed'].map((f) => (
               <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`shrink-0 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                   f === filter ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                 }`}
               >
                 {f}
               </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-800/30">Decrypting Files...</p>
            </div>
          ) : error ? (
            <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl text-center">
               <span className="material-symbols-outlined text-rose-500 text-3xl mb-3">error_outline</span>
               <p className="text-xs font-bold text-rose-800/60 leading-relaxed">{error}</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-gray-50/30 border border-dashed border-gray-100 rounded-[2.5rem]">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-sm mb-6">
                 <span className="material-symbols-outlined text-4xl text-gray-200">move_to_inbox</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">No Active Tickets</h3>
              <p className="text-[13px] font-medium text-gray-400 mb-8 leading-relaxed">No operational issues detected on this frequency.</p>
              <button
                type="button"
                className="px-8 py-4 bg-white border border-emerald-100 text-emerald-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shadow-lg shadow-emerald-500/5"
                onClick={() => setShowNewModal(true)}
              >
                Initiate Protocol
              </button>
            </div>
          ) : (
            filteredTickets.map((t) => (
              <button
                key={t._id}
                type="button"
                className={`w-full p-5 text-left rounded-3xl transition-all duration-300 group relative overflow-hidden ${
                  t._id === ticketId 
                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' 
                    : 'bg-white hover:bg-gray-50 text-gray-900'
                }`}
                onClick={() => navigate(`/support/${t._id}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Ticket Profile Icon (Messages-Style) */}
                  <div className="shrink-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border ${
                      t._id === ticketId ? 'bg-white/10 border-white/20 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-500'
                    }`}>
                      {t.subject[0].toUpperCase()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-[15px] font-black tracking-tight truncate ${t._id === ticketId ? 'text-white' : 'text-gray-900'}`}>
                        {t.subject}
                      </p>
                      <span className={`text-[9px] font-black uppercase tracking-widest ${t._id === ticketId ? 'text-white/60' : 'text-gray-400'}`}>
                        {formatTime(t.lastMessageAt)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-2">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                         t._id === ticketId ? 'bg-white/10 border-white/20' : 'bg-gray-100 border-gray-200 text-gray-400'
                       }`}>
                         ID: {t._id.slice(-6).toUpperCase()}
                       </span>
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                         t._id === ticketId 
                           ? 'bg-white/10 border-white/20' 
                           : t.status === 'open' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-gray-50 border-gray-100 text-gray-300'
                       }`}>
                         {t.status}
                       </span>
                    </div>

                    <p className={`text-[11px] font-medium leading-relaxed line-clamp-2 ${t._id === ticketId ? 'text-white/80' : 'text-gray-500'}`}>
                      {t.lastMessagePreview || 'Establishing connection context...'}
                    </p>
                  </div>
                  
                  {(t.unreadForUser || 0) > 0 && t._id !== ticketId && (
                    <div className="absolute top-5 right-5 w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/40 border border-white"></div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message View Area (Messages-Style) */}
      <div className="flex-1 flex flex-col bg-[#fbfcfb] min-w-0 relative overflow-hidden overflow-y-auto">
        {ticketId ? (
          <SupportThread ticketId={ticketId} onBack={() => navigate('/support')} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-start p-12 lg:p-20 bg-white/50 animate-in fade-in duration-1000">
            <div className="relative mb-8 mt-10">
               <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
               <div className="w-24 h-24 bg-white rounded-[2.5rem] border border-emerald-100 flex items-center justify-center relative z-10 shadow-xl group hover:rotate-12 transition-transform duration-500">
                  <span className="material-symbols-outlined text-5xl text-emerald-500 group-hover:scale-110 transition-transform">support_agent</span>
               </div>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Support <span className="text-emerald-500">Intelligence</span></h2>
            <p className="text-[15px] font-medium text-gray-500 max-w-sm mb-12 leading-relaxed text-center">
              Select an active support frequency from the directory to establish an encrypted communication bridge.
            </p>
            
            <button 
              onClick={() => setShowNewModal(true)}
              className="px-10 py-5 bg-gray-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-xl shadow-gray-900/10 hover:bg-emerald-600 transition-all active:scale-95 mb-16"
            >
              Create New Request
            </button>

            {/* Quick Help FAQ Cards */}
            <div className="w-full max-w-2xl text-left">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 text-center">Quick Help Center</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: 'task_alt', title: 'Order Completion', desc: 'How does the 2-step completion work?' },
                  { icon: 'payments', title: 'Payment Processing', desc: 'When do I receive my settlement?' },
                  { icon: 'report_problem', title: 'Report Issue', desc: 'How to flag a problematic client?' },
                  { icon: 'shield_person', title: 'Account Status', desc: 'Why is my account restricted?' }
                ].map((faq, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-6 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                        <span className="material-symbols-outlined">{faq.icon}</span>
                      </div>
                      <h4 className="text-sm font-black text-gray-900 leading-tight">{faq.title}</h4>
                    </div>
                    <p className="text-xs font-medium text-gray-500 leading-relaxed">{faq.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* High-Fidelity Creation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white rounded-[3.5rem] border border-emerald-100 shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">
            <div className="p-8 md:p-10 border-b border-gray-50 flex items-center justify-between bg-emerald-50/50 shrink-0">
               <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                     <span className="material-symbols-outlined text-2xl">add_task</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none">New Protocol</h3>
                    <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800/40 mt-1.5">Initiating Support Ticket</p>
                  </div>
               </div>
               <button onClick={() => setShowNewModal(false)} className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-colors">
                  <span className="material-symbols-outlined">close</span>
               </button>
            </div>
            
            <div className="overflow-y-auto custom-scrollbar">
              <form onSubmit={handleCreateTicket} className="p-8 md:p-10 space-y-8">
                
                <div className="space-y-4">
                  <label className="text-[13px] font-black uppercase tracking-widest text-gray-400">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Payment Issue', 'Order Problem', 'Account', 'Other'].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                          newCategory === cat
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200 hover:bg-emerald-50/50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 group/field">
                  <label className="text-[13px] font-black uppercase tracking-widest text-gray-400 group-focus-within/field:text-emerald-500 transition-colors">Incident Subject</label>
                  <input
                    type="text"
                    className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-[15px] font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 focus:bg-white transition-all placeholder-gray-300"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Financial Settlement Desynchronization"
                    required
                  />
                </div>
                <div className="space-y-3 group/area">
                  <label className="text-[13px] font-black uppercase tracking-widest text-gray-400 group-focus-within/area:text-emerald-500 transition-colors">Detailed Brief</label>
                  <textarea
                    className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] text-[15px] font-medium outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 focus:bg-white transition-all placeholder-gray-300 min-h-[160px] resize-none"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Please provide full technical context..."
                    required
                  />
                </div>
                {error && (
                  <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                     <span className="material-symbols-outlined text-lg">error</span>
                     <p className="text-[13px] font-bold">{error}</p>
                  </div>
                )}
                
                <div className="flex gap-4 pt-4 border-t border-gray-50">
                  <button type="button" className="flex-1 py-5 bg-gray-50 border border-gray-100 text-gray-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95" onClick={() => { setShowNewModal(false); setError(null); }}>
                    Abort
                  </button>
                  <button type="submit" className="flex-[2] py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-3" disabled={submitting}>
                    {submitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : (
                      <>
                        <span className="material-symbols-outlined text-xl">verified</span>
                        Dispatch Ticket
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
