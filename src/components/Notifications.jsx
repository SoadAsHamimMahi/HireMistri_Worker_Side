import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';
import toast from 'react-hot-toast';

// Basic wrapper around WebSocket or direct long-polling fallback if WebSocket ctx isn't fully integrated here
// For this rewrite, we will rely on axios polling as well.
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Notifications({ onClose, onUpdateCount }) {
  const ctx = useContext(AuthContext);
  const user = ctx?.user;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await axios.get(`${API_BASE}/api/notifications/${user.uid}`);
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
      if (onUpdateCount) onUpdateCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // polling
    return () => clearInterval(interval);
  }, [user?.uid]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API_BASE}/api/notifications/${notificationId}/read`, { userId: user?.uid });
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(prev => { 
        const next = Math.max(0, prev - 1); 
        if (onUpdateCount) onUpdateCount(next); 
        return next; 
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_BASE}/api/notifications/${notificationId}`, { data: { userId: user?.uid } });
      const notification = notifications.find(n => n._id === notificationId);
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => {
          const next = Math.max(0, prev - 1);
          if (onUpdateCount) onUpdateCount(next);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    try {
      await Promise.all(unreadNotifications.map(n => markAsRead(n._id)));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getNotificationLink = (notification) => {
    if (notification.jobId) return `/job-details/${notification.jobId}`;
    return '/applications';
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      <div className="relative w-full sm:w-[400px] h-full bg-[#0a0a0a] border-l border-zinc-800 shadow-2xl flex flex-col animate-slideInRight">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-[#121212]">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500">
              <i className="far fa-bell text-sm"></i>
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">Notifications</h2>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 transition-colors"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                Mark all read
              </button>
            )}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500"></span>
              <p className="mt-4 text-sm font-medium text-zinc-500">Loading notifications...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <p className="text-sm font-medium text-zinc-300">{error}</p>
              <button className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors" onClick={fetchNotifications}>
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50 text-zinc-500">
                <i className="far fa-bell text-2xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-zinc-300">All caught up!</h3>
              <p className="mt-1 text-sm text-zinc-500">You don't have any notifications right now.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Unread Notifications */}
              {unreadNotifications.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3 ml-1">
                    New ({unreadNotifications.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {unreadNotifications.map((notification) => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        formatTime={formatTime}
                        getNotificationLink={getNotificationLink}
                        isUnread={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Read Notifications */}
              {readNotifications.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3 ml-1">
                    Earlier
                  </h3>
                  <div className="flex flex-col gap-2">
                    {readNotifications.map((notification) => (
                      <NotificationItem
                        key={notification._id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        formatTime={formatTime}
                        getNotificationLink={getNotificationLink}
                        isUnread={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getIconProps(notification, isUnread) {
  const type = (notification.type || '').toLowerCase();
  const title = (notification.title || '').toLowerCase();
  const msg = (notification.message || '').toLowerCase();
  
  if (title.includes('warning') || title.includes('alert') || title.includes('failed') || msg.includes('warned')) {
    return { icon: 'fas fa-exclamation-triangle', cls: isUnread ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-400' };
  }
  if (title.includes('platform') || type === 'system' || title.includes('admin') || title.includes('system')) {
    return { icon: 'fas fa-bullhorn', cls: isUnread ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-800 text-zinc-400' };
  }
  if (title.includes('expired') || title.includes('timeout')) {
    return { icon: 'fas fa-stopwatch', cls: isUnread ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-400' };
  }
  if (type === 'message' || title.includes('message') || title.includes('chat')) {
    return { icon: 'fas fa-envelope', cls: isUnread ? 'bg-sky-500/20 text-sky-400' : 'bg-zinc-800 text-zinc-400' };
  }
  if (type === 'job' || title.includes('job') || title.includes('offer')) {
    return { icon: 'fas fa-briefcase', cls: isUnread ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-400' };
  }
  if (title.includes('payment') || title.includes('money') || title.includes('paid')) {
    return { icon: 'fas fa-wallet', cls: isUnread ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-400' };
  }
  if (type === 'application' || title.includes('appl')) {
    return { icon: 'fas fa-file-alt', cls: isUnread ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400' };
  }
  return { icon: 'fas fa-bell', cls: isUnread ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-400' };
}

function NotificationItem({ notification, onMarkAsRead, onDelete, formatTime, getNotificationLink, isUnread }) {
  const handleClick = () => {
    if (isUnread) {
      onMarkAsRead(notification._id);
    }
  };

  const { icon, cls } = getIconProps(notification, isUnread);

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
        isUnread
          ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
          : 'border-zinc-800/60 bg-zinc-800/30 hover:bg-zinc-800/50'
      }`}
    >
      {isUnread && (
        <div className="absolute left-0 top-0 h-full w-[3px] bg-emerald-500 rounded-l-xl"></div>
      )}
      <div className="flex items-start gap-4">
        {/* Icon based on type if available, else generic */}
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}>
          <i className={`text-sm ${icon}`}></i>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
             <div className="min-w-0">
                <h4 className={`truncate text-sm font-semibold ${isUnread ? 'text-white' : 'text-zinc-300'}`}>
                  {notification.title}
                </h4>
             </div>
             {/* Delete Button (visible on hover) */}
             <button
                className="opacity-0 group-hover:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-700 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-all ml-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification._id);
                }}
                title="Remove"
              >
                <i className="fas fa-times text-[10px]"></i>
              </button>
          </div>
          <p className={`mt-1.5 text-[13px] leading-relaxed ${isUnread ? 'text-zinc-300' : 'text-zinc-400'}`}>
            {notification.message}
          </p>
          
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">
              {formatTime(notification.createdAt)}
            </span>
            {notification.jobId && (
              <Link
                to={getNotificationLink(notification)}
                onClick={handleClick}
                className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                View Details <i className="fas fa-arrow-right text-[10px]"></i>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
