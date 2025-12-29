import { createContext, useContext, useState } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import axios from 'axios';

const MessagesContext = createContext();

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export function MessagesProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [messageCache, setMessageCache] = useState({}); // { conversationId: [messages] }
  const [loadingConversations, setLoadingConversations] = useState({}); // { conversationId: boolean }

  // Pre-load messages for a conversation
  const preloadMessages = async (conversationId) => {
    if (!conversationId || !user?.uid || messageCache[conversationId]) {
      return; // Already cached
    }

    try {
      setLoadingConversations(prev => ({ ...prev, [conversationId]: true }));
      const response = await axios.get(
        `${API_BASE}/api/messages/conversation/${conversationId}?userId=${user.uid}`
      );
      setMessageCache(prev => ({
        ...prev,
        [conversationId]: response.data || []
      }));
    } catch (err) {
      console.error('Failed to preload messages:', err);
    } finally {
      setLoadingConversations(prev => ({ ...prev, [conversationId]: false }));
    }
  };

  // Update messages for a conversation
  const updateMessages = (conversationId, messages) => {
    setMessageCache(prev => ({
      ...prev,
      [conversationId]: messages
    }));
  };

  // Add a single message to cache
  const addMessage = (conversationId, message) => {
    setMessageCache(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), message]
    }));
  };

  // Get cached messages
  const getCachedMessages = (conversationId) => {
    return messageCache[conversationId] || [];
  };

  return (
    <MessagesContext.Provider value={{
      preloadMessages,
      updateMessages,
      addMessage,
      getCachedMessages,
      loadingConversations
    }}>
      {children}
    </MessagesContext.Provider>
  );
}

export const useMessages = () => useContext(MessagesContext);

