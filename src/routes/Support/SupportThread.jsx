import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../Authentication/AuthProvider';
import { FaPaperPlane, FaArrowLeft } from 'react-icons/fa';

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
    e.preventDefault();
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
    <div className="flex flex-col flex-1 bg-base-100 border-l border-base-300 min-h-0">
      <div className="p-4 border-b border-base-300 flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          className="btn btn-sm btn-ghost md:hidden"
          onClick={goBack}
        >
          <FaArrowLeft />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base-content truncate">{ticket?.subject || 'Support ticket'}</h2>
          <p className="text-xs text-base-content opacity-70">
            Status: <span className={ticket?.status === 'open' ? 'text-success' : ''}>{ticket?.status || '—'}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-error mb-2">{error}</p>
            <button type="button" className="btn btn-sm btn-ghost" onClick={goBack}>
              Back to tickets
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg) => {
              const isUser = msg.senderType === 'user';
              return (
                <div
                  key={msg._id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-lg p-3 ${
                      isUser ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content border border-base-300'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isUser ? 'opacity-80' : 'opacity-60'}`}>
                      {formatTime(msg.createdAt)} {!isUser && '(Support)'}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {ticket?.status === 'closed' ? (
            <div className="p-4 border-t border-base-300 bg-base-200 text-center text-base-content opacity-70 text-sm">
              This ticket is closed. Open a new ticket if you need more help.
            </div>
          ) : (
            <form onSubmit={handleSend} className="p-4 border-t border-base-300 bg-base-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={!input.trim() || sending}>
                  {sending ? <span className="loading loading-spinner loading-sm" /> : <FaPaperPlane />}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
