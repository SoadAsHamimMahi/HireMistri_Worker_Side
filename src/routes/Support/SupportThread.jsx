import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../Authentication/AuthProvider';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function fetchWithAuth(url, options, getIdToken) {
  const token = await getIdToken?.();
  const headers = { ...options?.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

export default function SupportThread({ ticketId: ticketIdProp, onBack }) {
  const { ticketId: ticketIdParam } = useParams();
  const ticketId = ticketIdProp ?? ticketIdParam;
  const navigate = useNavigate();
  const { user, getIdToken, API_BASE: base } = useContext(AuthContext) || {};
  const apiBase = base || API_BASE;
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!ticketId || !user?.uid) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchWithAuth(
          `${apiBase}/api/support/tickets/${ticketId}/messages`,
          {},
          getIdToken
        );
        if (!res.ok) {
          if (res.status === 403) throw new Error('Account suspended');
          if (res.status === 404) throw new Error('Ticket not found');
          throw new Error('Failed to load messages');
        }
        const data = await res.json();
        setTicket(data.ticket || null);
        setMessages(data.messages || []);
      } catch (e) {
        setError(e.message);
        setTicket(null);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [ticketId, user?.uid, apiBase, getIdToken]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || !ticketId || sending || ticket?.status === 'closed') return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${apiBase}/api/support/tickets/${ticketId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input.trim() }),
        },
        getIdToken
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      if (data.message) {
        setMessages((prev) => [...prev, { ...data.message, _id: data.message._id }]);
        setTicket((t) => (t ? { ...t, lastMessagePreview: data.message.message?.slice(0, 80), lastMessageAt: data.message.createdAt } : null));
      }
      setInput('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const goBack = () => {
    if (onBack) onBack();
    else navigate('/support');
  };

  if (!ticketId) {
    if (!ticketIdProp) navigate('/support');
    return null;
  }

  return (
    <div className="flex flex-col flex-1 bg-white md:bg-transparent relative z-10 h-full overflow-hidden">
      {/* Thread Header (Messages-Style) */}
      <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-5 min-w-0">
          <button
            type="button"
            className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex md:hidden items-center justify-center text-gray-400 hover:text-emerald-500 hover:border-emerald-500 transition-all active:scale-90"
            onClick={goBack}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          {/* Header Profile Icon */}
          <div className="shrink-0 hidden sm:block">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">
              {ticket?.subject?.[0].toUpperCase() || 'S'}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl md:text-2xl font-black text-gray-900 truncate tracking-tight">{ticket?.subject || 'Establishing Link...'}</h2>
              <span className={`shrink-0 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                ticket?.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'
              }`}>
                {ticket?.status || 'Active'}
              </span>
            </div>
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${ticket?.status === 'open' ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
               <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                 Channel: <span className="text-gray-500">#SUP-{ticketId?.slice(-6).toUpperCase() || 'XXXXXX'}</span>
               </p>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-3 px-5 py-2.5 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl shadow-gray-900/10">
           <span className="material-symbols-outlined text-emerald-500 text-base">encrypted</span>
           <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Secured Node</span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
           <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
           <p className="text-[11px] font-black uppercase tracking-widest text-emerald-800/30">Loading Intelligence...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="max-w-sm w-full p-10 bg-rose-50 border border-rose-100 rounded-[3rem] text-center shadow-xl shadow-rose-500/5">
            <span className="material-symbols-outlined text-rose-500 text-5xl mb-6">leak_add</span>
            <p className="text-[15px] font-bold text-rose-800/70 mb-8 leading-relaxed">{error}</p>
            <button type="button" className="w-full py-5 bg-white border border-rose-200 text-rose-600 font-black uppercase tracking-widest text-[13px] rounded-2xl hover:bg-rose-50 transition-all active:scale-95 shadow-sm" onClick={goBack}>
              Re-establish Connection
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {messages.map((msg, idx) => {
              const isUser = msg.senderType === 'user';
              const showDate = idx === 0 || new Date(messages[idx-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
              
              return (
                <div key={msg._id} className="space-y-4">
                  {showDate && (
                    <div className="flex items-center justify-center py-8">
                       <div className="px-6 py-2.5 bg-gray-50 border border-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 shadow-sm">
                          {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                       </div>
                    </div>
                  )}
                  
                  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group/msg animate-in slide-in-from-bottom-2 duration-500`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className={`relative px-6 py-4 rounded-[2.25rem] shadow-sm transition-all duration-300 ${
                        isUser 
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-lg hover:shadow-xl hover:shadow-emerald-500/20' 
                          : 'bg-white border border-gray-100 text-gray-900 rounded-tl-lg hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-500/5'
                      }`}>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                        <div className={`absolute top-0 ${isUser ? 'right-0 -mr-1' : 'left-0 -ml-1'} w-4 h-4 overflow-hidden`}>
                           <div className={`w-full h-full rotate-45 transform origin-top-left ${isUser ? 'bg-emerald-600' : 'bg-white border-l border-t border-gray-100'}`}></div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-3 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                         {!isUser && (
                           <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                             <span className="material-symbols-outlined text-[12px]">verified</span>
                             Official Node
                           </div>
                         )}
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {ticket?.status === 'closed' ? (
            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex items-center justify-center gap-4 text-gray-400">
              <span className="material-symbols-outlined text-2xl">lock</span>
              <p className="text-[13px] font-black uppercase tracking-widest">Protocol Terminated • Ticket Closed</p>
            </div>
          ) : (
            <div className="p-8 border-t border-gray-100 bg-white/80 backdrop-blur-xl">
               <form onSubmit={handleSend} className="relative group/form">
                 <div className="absolute inset-0 bg-emerald-500/5 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within/form:opacity-100 transition-opacity"></div>
                 <div className="relative flex gap-4 items-center bg-gray-50 border border-gray-100 rounded-[2.5rem] p-3 focus-within:border-emerald-500/30 focus-within:bg-white focus-within:ring-8 focus-within:ring-emerald-500/5 transition-all">
                    <button 
                      type="button" 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-300 hover:bg-gray-100 transition-colors shrink-0 cursor-not-allowed"
                      disabled
                      title="Attachments disabled"
                    >
                       <span className="material-symbols-outlined text-2xl">attach_file</span>
                    </button>
                    <input
                      type="text"
                      className="flex-1 bg-transparent px-2 py-4 text-[15px] font-medium text-gray-900 outline-none placeholder-gray-400"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Input message for support command..."
                      disabled={sending}
                    />
                    <button 
                      type="submit" 
                      className="w-[60px] h-[60px] bg-gray-900 hover:bg-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-gray-900/10 active:scale-95 transition-all group/send shrink-0" 
                      disabled={!input.trim() || sending}
                    >
                      {sending ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <span className="material-symbols-outlined text-2xl group-hover/send:translate-x-1 group-hover/send:-translate-y-1 transition-transform">send</span>
                      )}
                    </button>
                 </div>
               </form>
               <p className="mt-4 text-center text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">End-to-End Encrypted Operational Channel</p>
            </div>
          )}
        </>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10b981; }
      `}</style>
    </div>
  );
}
