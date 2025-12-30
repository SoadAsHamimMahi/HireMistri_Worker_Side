import { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import { useMessages } from '../contexts/MessagesContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { FaPaperPlane, FaComments } from 'react-icons/fa';
import axios from 'axios';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Messages({ jobId, clientId, clientName, conversationId: providedConversationId, onClose }) {
  const { user } = useContext(AuthContext);
  const { getCachedMessages, updateMessages, addMessage } = useMessages();
  const { socket, connected, sendMessage, sendTyping, markMessagesRead } = useWebSocket();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Use provided conversationId or generate one - matches backend format
  // Backend sorts IDs: jobId ? `${jobId}_${sortedIds.join('_')}` : sortedIds.join('_')
  // Note: For workers, user.uid is the workerId, and clientId is the recipient
  const conversationId = providedConversationId || (clientId && user?.uid 
    ? (() => {
        const ids = [clientId, user.uid].sort();
        return jobId ? `${jobId}_${ids.join('_')}` : ids.join('_');
      })()
    : null);

  // Get initial messages from cache (instant, no loading)
  const [messages, setMessages] = useState(() => {
    return conversationId ? getCachedMessages(conversationId) : [];
  });

  // Load messages in background (silent update)
  useEffect(() => {
    if (!conversationId || !user?.uid) return;

    const loadMessages = async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/api/messages/conversation/${conversationId}?userId=${user.uid}`
        );
        const loadedMessages = response.data || [];
        
        // Update both local state and cache
        setMessages(loadedMessages);
        updateMessages(conversationId, loadedMessages);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };

    // If no cached messages, load immediately; otherwise load in background
    if (messages.length === 0) {
      loadMessages();
    } else {
      // Small delay to let UI render cached messages first
      setTimeout(loadMessages, 100);
    }

    // Poll for new messages every 3 seconds (silent updates) - fallback if WebSocket not connected
    const interval = connected ? null : setInterval(loadMessages, 3000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [conversationId, user?.uid, clientId, connected]);

  // WebSocket: Listen for new messages and typing indicators
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleNewMessage = (message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === message._id || (m.id === message.id && m.createdAt === message.createdAt))) {
            return prev;
          }
          return [...prev, message];
        });
        addMessage(conversationId, message);
        // Mark as read if this user is the recipient and the message is from the other user
        if (message.recipientId === user?.uid && message.senderId === clientId) {
          markMessagesRead(conversationId, clientId);
        }
      }
    };

    const handleTyping = (data) => {
      if (data.userId === clientId) { // Check if the typing user is the other participant
        setIsTyping(data.typing);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
    };
  }, [socket, conversationId, clientId, addMessage, user?.uid, markMessagesRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user?.uid || sending) return;
    
    // Determine recipientId - if clientId is provided, use it; otherwise try to extract from messages
    let recipientId = clientId;
    if (!recipientId && messages.length > 0) {
      // Find the recipient from existing messages
      const lastMessage = messages[messages.length - 1];
      recipientId = lastMessage.senderId === user.uid ? lastMessage.recipientId : lastMessage.senderId;
    }
    
    if (!recipientId) {
      alert('Unable to determine recipient. Please try again.');
      return;
    }

    setSending(true);
    try {
      const messageData = {
        senderId: user.uid, // Worker's ID
        recipientId: recipientId, // Client's ID
        jobId: jobId || null,
        message: newMessage.trim(),
        senderName: user.displayName || user.email || 'Worker',
        recipientName: clientName || 'Client',
      };

      if (connected) {
        // Send via WebSocket
        sendMessage(messageData);
        // Optimistically add message (WebSocket server will also emit, but this is faster)
        const tempMessage = {
          _id: `temp-${Date.now()}`, // Temporary ID
          ...messageData,
          createdAt: new Date().toISOString(),
          read: false,
        };
        setMessages(prev => [...prev, tempMessage]);
        addMessage(conversationId, tempMessage);
      } else {
        // Fallback to REST API if WebSocket not connected
        const response = await axios.post(`${API_BASE}/api/messages`, messageData);
        const newMsg = response.data;
        setMessages(prev => [...prev, newMsg]);
        addMessage(conversationId, newMsg);
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      sendTyping(recipientId, false); // Stop typing after sending
    }
  };

  if (!conversationId) {
    return (
      <div className="p-4 text-center text-base-content opacity-70">
        <p className="font-semibold mb-2">Unable to start conversation. Missing required information.</p>
        {!clientId && <p className="text-xs mt-1 text-error">Client ID is missing</p>}
        {!user?.uid && <p className="text-xs mt-1 text-error">User is not logged in</p>}
        {!jobId && <p className="text-xs mt-1 opacity-60">Note: Job ID is optional</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] bg-base-200 rounded-lg border border-base-300">
      {/* Header */}
      <div className="p-4 border-b border-base-300 bg-base-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaComments className="text-primary text-xl" />
          <div>
            <h3 className="font-semibold text-base-content">Messages</h3>
            <p className="text-sm text-base-content opacity-70">{clientName || 'Client'}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn btn-sm btn-ghost">
            ✕
          </button>
        )}
      </div>

      {/* Messages List - No loading state, show cached messages immediately */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-base-content opacity-70">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isSender = msg.senderId === user?.uid;
            return (
              <div
                key={msg._id || msg.id}
                className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isSender
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100 text-base-content border border-base-300'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${isSender ? 'opacity-80' : 'opacity-60'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {isTyping && <div className="text-sm text-base-content opacity-60 mb-2">Client is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-base-300 bg-base-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (connected && clientId) {
                sendTyping(clientId, e.target.value.length > 0);
              }
            }}
            placeholder="Type a message..."
            className="input input-bordered flex-1"
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

