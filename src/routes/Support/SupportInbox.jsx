import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AuthContext } from '../../Authentication/AuthProvider';
import { FaPlus, FaInbox } from 'react-icons/fa';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
          body: JSON.stringify({ subject: newSubject.trim(), message: newMessage.trim() }),
        },
        getIdToken
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket');
      setShowNewModal(false);
      setNewSubject('');
      setNewMessage('');
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
    <div className="min-h-screen page-bg">
      <div className="flex h-screen">
        <div className="flex flex-col w-full md:w-80 lg:w-96 border-r border-base-300 bg-base-200">
          <div className="p-4 border-b border-base-300 bg-base-100">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-base-content">Support</h1>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setShowNewModal(true)}
              >
                <FaPlus className="mr-2" /> New Ticket
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <span className="loading loading-spinner loading-md text-primary" />
                <p className="text-sm text-base-content opacity-70 mt-2">Loading tickets...</p>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-error">{error}</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-center text-base-content opacity-70">
                <FaInbox className="text-4xl mx-auto mb-2 opacity-30" />
                <p className="text-sm">No support tickets yet</p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary mt-2"
                  onClick={() => setShowNewModal(true)}
                >
                  Create your first ticket
                </button>
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {tickets.map((t) => (
                  <button
                    key={t._id}
                    type="button"
                    className={`w-full p-4 text-left hover:bg-base-300 transition-colors ${t._id === ticketId ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                    onClick={() => navigate(`/support/${t._id}`)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-base-content truncate">{t.subject}</p>
                        <p className="text-xs text-base-content opacity-70 truncate mt-0.5">
                          {t.lastMessagePreview || 'No messages'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-base-content opacity-60">{formatTime(t.lastMessageAt)}</span>
                          <span className={`badge badge-sm ${t.status === 'open' ? 'badge-success' : 'badge-ghost'}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                      {(t.unreadForUser || 0) > 0 && (
                        <span className="badge badge-primary badge-sm">{t.unreadForUser > 9 ? '9+' : t.unreadForUser}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-base-200 min-w-0">
          {ticketId ? (
            <SupportThread ticketId={ticketId} onBack={() => navigate('/support')} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <FaInbox className="text-6xl text-base-content opacity-30 mb-4 mx-auto" />
                <h2 className="text-xl font-semibold text-base-content mb-2">Provider support</h2>
                <p className="text-base-content opacity-70 mb-4">
                  Select a ticket from the list or create a new one
                </p>
                <Link to="/" className="btn btn-ghost">Back to home</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">New support ticket</h3>
            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3">
              <div>
                <label className="label"><span className="label-text">Subject</span></label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Brief subject"
                  required
                />
              </div>
              <div>
                <label className="label"><span className="label-text">Message</span></label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe your issue..."
                  rows={4}
                  required
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="modal-action">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowNewModal(false); setError(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Create ticket'}
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop" onClick={() => setShowNewModal(false)}>
            <button type="button">close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
