import { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../Authentication/AuthProvider';
import { useMessages } from '../contexts/MessagesContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { FaPaperPlane, FaComments } from 'react-icons/fa';
import axios from 'axios';
import ChatApplicationStatus from '../components/ChatApplicationStatus';
import ChatApplicationModal from '../components/ChatApplicationModal';
import JobDetailsCard from '../components/JobDetailsCard';
import WorkerJobRequestCard from '../components/WorkerJobRequestCard';
import WorkerJobRequestModal from '../components/WorkerJobRequestModal';
import JobOfferCard from '../components/JobOfferCard';
import toast from 'react-hot-toast';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Messages({ 
  jobId, 
  clientId, 
  clientName, 
  conversationId: providedConversationId, 
  onClose,
  showHeader = true,
  showUserInfo = false
}) {
  const { user } = useContext(AuthContext);
  const { getCachedMessages, updateMessages, addMessage } = useMessages();
  const { socket, connected, sendMessage, sendTyping, markMessagesRead } = useWebSocket();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [clientProfile, setClientProfile] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [applicationData, setApplicationData] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [conversationJobs, setConversationJobs] = useState([]);
  const [workerJobRequest, setWorkerJobRequest] = useState(null);
  const [showJobRequestModal, setShowJobRequestModal] = useState(false);
  const [jobOffer, setJobOffer] = useState(null);
  const [jobOfferStatus, setJobOfferStatus] = useState(null); // 'pending', 'accepted', 'rejected'
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
          // Avoid duplicates - check by ID, or by content + sender + time (within 5 seconds)
          const isDuplicate = prev.some(m => {
            // Exact ID match
            if (m._id === message._id || m.id === message.id) return true;
            
            // Check if it's a duplicate by content + sender + recipient + time
            // Match by: same sender, same content, same recipient, within 5 seconds
            if (m.senderId === message.senderId && 
                m.recipientId === message.recipientId &&
                m.message === message.message) {
              const mTime = new Date(m.createdAt).getTime();
              const msgTime = new Date(message.createdAt).getTime();
              const timeDiff = Math.abs(msgTime - mTime);
              // If within 5 seconds, it's likely a duplicate (especially if one is temp)
              if (timeDiff < 5000) {
                return true;
              }
            }
            return false;
          });
          
          if (isDuplicate) {
            // Replace temp message with real message if we have a temp one
            const hasTemp = prev.some(m => 
              m._id?.startsWith('temp-') && 
              m.senderId === message.senderId &&
              m.recipientId === message.recipientId &&
              m.message === message.message
            );
            
            if (hasTemp && !message._id?.startsWith('temp-')) {
              // Replace temp message with real one
              return prev.map(m => {
                if (m._id?.startsWith('temp-') && 
                    m.senderId === message.senderId &&
                    m.recipientId === message.recipientId &&
                    m.message === message.message) {
                  return message;
                }
                return m;
              });
            }
            // If duplicate but no temp to replace, just return prev (don't add duplicate)
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

    // Task 3.1: Listen for job offer status changes
    const handleJobOfferStatusChange = (data) => {
      if (data.jobId === jobId || (jobOffer && data.jobId === jobOffer._id)) {
        if (data.status === 'accepted') {
          setJobOfferStatus('accepted');
          setJobOffer(null);
          // Refresh application status
          if (jobId && user?.uid) {
            axios.get(`${API_BASE}/api/applications/${jobId}/${user.uid}`)
              .then(response => {
                if (response.data) {
                  setApplicationData(response.data);
                  setApplicationStatus(response.data.status || 'accepted');
                }
              })
              .catch(err => {
                if (err.response?.status !== 404) {
                  console.error('Failed to fetch application status:', err);
                }
              });
          }
        } else if (data.status === 'rejected') {
          setJobOfferStatus('rejected');
          setJobOffer(null);
        }
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('job_offer:status_changed', handleJobOfferStatusChange);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('job_offer:status_changed', handleJobOfferStatusChange);
    };
  }, [socket, conversationId, clientId, addMessage, user?.uid, markMessagesRead, jobId, jobOffer]);

  // Fetch client profile and job details
  useEffect(() => {
    const fetchClientProfile = async () => {
      if (!clientId || !showUserInfo) return;
      
      try {
        const response = await axios.get(`${API_BASE}/api/users/${clientId}/public`);
        setClientProfile(response.data);
      } catch (err) {
        console.error('Failed to fetch client profile:', err);
      }
    };

    const fetchJobDetail = async () => {
      if (!jobId) return;
      
      try {
        const response = await axios.get(`${API_BASE}/api/browse-jobs/${jobId}`);
        setJobDetail(response.data);
      } catch (err) {
        // Job might have been deleted - set to null to avoid retrying
        if (err.response?.status === 404) {
          setJobDetail(null);
        } else {
          console.error('Failed to fetch job details:', err);
        }
      }
    };

    fetchClientProfile();
    fetchJobDetail();
  }, [clientId, jobId, showUserInfo]);

  // Fetch jobs and worker requests for this conversation
  useEffect(() => {
    const fetchConversationJobs = async () => {
      if (!conversationId) return;

      try {
        const response = await axios.get(
          `${API_BASE}/api/conversations/${conversationId}/jobs`
        );
        setConversationJobs(response.data.all || []);
        
        // Set jobDetail from conversation jobs if not already set
        if (response.data.jobs && response.data.jobs.length > 0) {
          setJobDetail(response.data.jobs[0]);
        }

        // Set worker job request if exists
        if (response.data.workerRequests && response.data.workerRequests.length > 0) {
          setWorkerJobRequest(response.data.workerRequests[0]);
        }
      } catch (err) {
        console.error('Failed to fetch conversation jobs:', err);
      }
    };

    fetchConversationJobs();
  }, [conversationId]);

  // Task 3.2: Fetch job offer - only poll if WebSocket disconnected
  useEffect(() => {
    const fetchJobOffer = async () => {
      if (!conversationId || !user?.uid) return;
      
      try {
        const response = await axios.get(
          `${API_BASE}/api/conversations/${conversationId}/jobs`
        );
        
        // Find private job targeted to this worker
        const privateJob = response.data.jobs?.find(
          job => job.isPrivate && job.targetWorkerId === user.uid
        );
        
        if (privateJob) {
          setJobOffer(privateJob);
          // Check if worker has already applied
          try {
            const appResponse = await axios.get(
              `${API_BASE}/api/applications/${privateJob._id}/${user.uid}`
            );
            if (appResponse?.data) {
              setJobOfferStatus('accepted');
            } else {
              setJobOfferStatus('pending');
            }
          } catch (appErr) {
            if (appErr.response?.status === 404) {
              setJobOfferStatus('pending');
            } else {
              console.error('Failed to check application status:', appErr);
            }
          }
        } else {
          setJobOffer(null);
          setJobOfferStatus(null);
        }
      } catch (err) {
        console.error('Failed to fetch job offer:', err);
      }
    };
    
    // Initial fetch
    fetchJobOffer();
    
    // Task 3.2: Only poll if WebSocket is disconnected
    if (!connected) {
      const interval = setInterval(fetchJobOffer, 5000);
      return () => clearInterval(interval);
    }
    
    // WebSocket will handle updates when connected
  }, [conversationId, user?.uid, connected]);

  // Also fetch job detail if jobId exists but not found in conversation jobs (for backward compatibility)
  useEffect(() => {
    const fetchJobDetail = async () => {
      if (!jobId || jobDetail) return;
      
      try {
        const response = await axios.get(`${API_BASE}/api/browse-jobs/${jobId}`);
        setJobDetail(response.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setJobDetail(null);
        } else {
          console.error('Failed to fetch job details:', err);
        }
      }
    };

    fetchJobDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Fetch application status for job-related conversations
  useEffect(() => {
    const fetchApplicationStatus = async () => {
      if (!jobId || !user?.uid) {
        setApplicationData(null);
        setApplicationStatus(null);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE}/api/applications/${jobId}/${user.uid}`
        );
        setApplicationData(response.data);
        setApplicationStatus(response.data.status || 'pending');
      } catch (err) {
        if (err.response?.status === 404) {
          // No application yet
          setApplicationStatus(null);
          setApplicationData(null);
        } else {
          console.error('Failed to fetch application status:', err);
        }
      }
    };

    fetchApplicationStatus();
  }, [jobId, user?.uid]);

  const handleApplicationCreated = (application) => {
    setApplicationData(application);
    setApplicationStatus(application.status || 'pending');
    setShowApplicationModal(false);
  };

  const handleJobRequestCreated = (request) => {
    setWorkerJobRequest(request);
    setShowJobRequestModal(false);
  };

  const handleJobOfferAccepted = (application) => {
    setJobOfferStatus('accepted');
    setApplicationData(application);
    setApplicationStatus('accepted');
    setJobOffer(null); // Hide offer card after acceptance
  };

  const handleJobOfferRejected = () => {
    setJobOfferStatus('rejected');
    setJobOffer(null); // Hide offer card after rejection
  };

  // Deduplicate messages before rendering - remove duplicates by _id
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    return messages.filter(msg => {
      const id = msg._id || msg.id;
      if (!id || seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }, [messages]);

  // Group messages by date and add date separators
  const messagesWithSeparators = useMemo(() => {
    if (uniqueMessages.length === 0) return [];
    
    const grouped = [];
    let currentDate = null;
    
    uniqueMessages.forEach((msg, index) => {
      const msgDate = new Date(msg.createdAt);
      const dateStr = msgDate.toDateString();
      
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateLabel = '';
        if (dateStr === today.toDateString()) {
          dateLabel = 'Today';
        } else if (dateStr === yesterday.toDateString()) {
          dateLabel = 'Yesterday';
        } else {
          dateLabel = msgDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
        
        grouped.push({ type: 'separator', date: dateLabel, key: `sep-${dateStr}` });
      }
      
      grouped.push({ type: 'message', ...msg, key: msg._id || msg.id || `msg-${index}` });
    });
    
    return grouped;
  }, [uniqueMessages]);

  // Format date for display
  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uniqueMessages]);

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
    <div className="flex flex-col h-full bg-base-200 rounded-lg border border-base-300">
      {/* Header */}
      {showHeader && (
        <div className="p-4 border-b border-base-300 bg-base-100 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {showUserInfo && clientProfile?.profileCover && (
              <div className="avatar">
                <div className="w-12 h-12 rounded-full">
                  <img
                    src={clientProfile.profileCover}
                    alt={clientName || 'Client'}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base-content truncate">{clientName || 'Client'}</h3>
                {showUserInfo && clientProfile?.emailVerified && (
                  <div className="badge badge-success badge-xs">
                    <i className="fas fa-check-circle"></i>
                  </div>
                )}
              </div>
              {showUserInfo && clientProfile && (
                <div className="text-xs text-base-content opacity-70">
                  {[clientProfile.city, clientProfile.country].filter(Boolean).join(', ') || 'Location not set'}
                  {clientProfile.stats?.totalJobsPosted > 0 && (
                    <span className="ml-2">
                      <i className="fas fa-briefcase"></i> {clientProfile.stats.totalJobsPosted} jobs
                    </span>
                  )}
                </div>
              )}
              {showUserInfo && jobDetail && jobDetail !== null && (
                <div className="mt-1">
                  <Link
                    to={`/job/${jobId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    <i className="fas fa-briefcase mr-1"></i>
                    {jobDetail.title}
                  </Link>
                </div>
              )}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="btn btn-sm btn-ghost ml-2">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Job Offer Card - Display prominently for private jobs */}
      {jobOffer && jobOfferStatus === 'pending' && (
        <div className="px-4 pt-4 pb-2 border-b border-base-300 bg-base-100">
          <JobOfferCard 
            job={jobOffer}
            workerId={user?.uid}
            onAccept={handleJobOfferAccepted}
            onReject={handleJobOfferRejected}
          />
        </div>
      )}

      {/* Job Details Card - Display prominently for regular jobs */}
      {jobDetail && !jobOffer && (
        <div className="px-4 pt-4 pb-2 border-b border-base-300 bg-base-100">
          <JobDetailsCard job={jobDetail} compact={false} />
        </div>
      )}

      {/* Worker Job Request Card */}
      {workerJobRequest && (
        <div className="px-4 pt-4 pb-2 border-b border-base-300 bg-base-100">
          <WorkerJobRequestCard 
            request={workerJobRequest}
            userRole="worker"
          />
        </div>
      )}

      {/* Action Bar - Application Status & Quick Actions */}
      <div className="px-4 pt-4 pb-2 border-b border-base-300 bg-base-100">
        {/* Job-related: Show application status or apply button */}
        {jobId && (
          <>
            {applicationStatus ? (
              <ChatApplicationStatus
                jobId={jobId}
                clientId={clientId}
                userRole="worker"
                userId={user?.uid}
              />
            ) : (
              <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border border-base-300">
                <p className="text-sm text-base-content/70">
                  Apply for this job to start working
                </p>
                <button
                  onClick={() => setShowApplicationModal(true)}
                  className="btn btn-sm btn-primary"
                >
                  <i className="fas fa-paper-plane mr-2"></i>
                  Apply for Job
                </button>
              </div>
            )}
          </>
        )}

        {/* General conversation: Show create job request button */}
        {!jobId && !workerJobRequest && !jobOffer && (
          <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg border border-base-300">
            <p className="text-sm text-base-content/70">
              Create a job request to propose your services
            </p>
            <button
              onClick={() => setShowJobRequestModal(true)}
              className="btn btn-sm btn-primary"
            >
              <i className="fas fa-plus mr-2"></i>
              Create Job Request
            </button>
          </div>
        )}
      </div>

      {/* Messages List - No loading state, show cached messages immediately */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messagesWithSeparators.length === 0 ? (
          <div className="text-center py-8 text-base-content opacity-70">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messagesWithSeparators.map((item) => {
            if (item.type === 'separator') {
              return (
                <div key={item.key} className="flex items-center justify-center my-4">
                  <div className="divider w-full max-w-xs">
                    <span className="text-xs text-base-content opacity-60 px-2">{item.date}</span>
                  </div>
                </div>
              );
            }
            
            const msg = item;
            const isSender = msg.senderId === user?.uid;
            const isSystemMessage = msg.isSystemMessage === true;
            const showAvatar = !isSender && !isSystemMessage && showUserInfo && clientProfile?.profileCover;
            
            // Render system messages with special styling
            if (isSystemMessage) {
              return (
                <div key={item.key} className="flex items-center justify-center my-2">
                  <div className="bg-base-200 border border-base-300 rounded-lg px-4 py-2 max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-info-circle text-primary"></i>
                      <p className="text-sm text-base-content/80 whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                    </div>
                    <p className="text-xs text-base-content/50 mt-1 text-center">
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            }
            
            return (
              <div
                key={item.key}
                className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}
              >
                {showAvatar && (
                  <div className="avatar flex-shrink-0">
                    <div className="w-8 h-8 rounded-full">
                      <img
                        src={clientProfile.profileCover}
                        alt={clientName || 'Client'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {!showAvatar && !isSender && <div className="w-8"></div>}
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isSender
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100 text-base-content border border-base-300'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <p className={`text-xs ${isSender ? 'opacity-80' : 'opacity-60'}`}>
                      {formatMessageTime(msg.createdAt)}
                    </p>
                    {isSender && (
                      <span className={`text-xs ${msg.read ? 'text-primary' : 'opacity-60'}`}>
                        {msg.read ? (
                          <i className="fas fa-check-double"></i>
                        ) : (
                          <i className="fas fa-check"></i>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="text-sm text-base-content opacity-60 mb-2 flex items-center gap-2">
            {showUserInfo && clientProfile?.profileCover && (
              <div className="avatar">
                <div className="w-6 h-6 rounded-full">
                  <img
                    src={clientProfile.profileCover}
                    alt={clientName || 'Client'}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            )}
            <span>{clientName || 'Client'} is typing...</span>
          </div>
        )}
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

      {/* Application Modal */}
      {showApplicationModal && jobId && clientId && (
        <ChatApplicationModal
          jobId={jobId}
          clientId={clientId}
          onClose={() => setShowApplicationModal(false)}
          onSuccess={handleApplicationCreated}
        />
      )}

      {/* Worker Job Request Modal */}
      {showJobRequestModal && clientId && conversationId && (
        <WorkerJobRequestModal
          clientId={clientId}
          conversationId={conversationId}
          onClose={() => setShowJobRequestModal(false)}
          onSuccess={handleJobRequestCreated}
        />
      )}
    </div>
  );
}

