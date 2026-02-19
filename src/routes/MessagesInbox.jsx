import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../Authentication/AuthProvider';
import { useMessages } from '../contexts/MessagesContext';
import axios from 'axios';
import Messages from './Messages';
import JobDetailsCard from '../components/JobDetailsCard';
import WorkerJobRequestCard from '../components/WorkerJobRequestCard';
import { FaSearch, FaFilter, FaArrowLeft } from 'react-icons/fa';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function MessagesInbox() {
  const { user } = useContext(AuthContext);
  const { conversationId: urlConversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { preloadMessages } = useMessages();
  
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, unread, job-related, general
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [userProfiles, setUserProfiles] = useState({}); // Cache for user profiles
  const [jobDetails, setJobDetails] = useState({}); // Cache for job details
  const [workerJobRequests, setWorkerJobRequests] = useState({}); // Cache for worker job requests
  const [jobOffers, setJobOffers] = useState({}); // Cache for job offers (private jobs)
  const [showMobileConversations, setShowMobileConversations] = useState(true);

  // Get conversation ID from URL params or search params
  const conversationId = urlConversationId || searchParams.get('conversationId') || selectedConversationId;
  const clientId = searchParams.get('clientId');
  const jobId = searchParams.get('jobId');

  // Fetch conversations
  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      return;
    }

    const fetchConversations = async () => {
      try {
        setLoadingConversations(true);
        const response = await axios.get(`${API_BASE}/api/messages/conversations?userId=${user.uid}`);
        const rawConvos = response.data || [];
        
        const convos = rawConvos.map(conv => {
          const lastMsg = conv.lastMessage || {};
          const otherId = lastMsg.senderId === user.uid 
            ? (lastMsg.recipientId || null)
            : (lastMsg.senderId || null);
          const otherName = lastMsg.senderId === user.uid 
            ? (lastMsg.recipientName || 'Client')
            : (lastMsg.senderName || 'Client');
          
          return {
            conversationId: conv._id,
            jobId: lastMsg.jobId || null,
            clientId: otherId, // For worker-side, the other participant is the client
            workerId: user.uid, // Current user is the worker
            clientName: otherName,
            lastMessageText: lastMsg.message || '',
            lastMessageCreatedAt: lastMsg.createdAt,
            unreadCount: conv.unreadCount || 0,
          };
        }).filter(conv => conv.conversationId);
        
        setConversations(convos);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoadingConversations(false);
      }
    };

    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Set selected conversation from URL or search params
  useEffect(() => {
    if (conversationId) {
      setSelectedConversationId(conversationId);
      if (conversationId) {
        preloadMessages(conversationId);
      }
      // On mobile, hide conversations list when conversation is selected
      if (window.innerWidth < 768) {
        setShowMobileConversations(false);
      }
    } else if (clientId) {
      // Generate conversation ID for new conversation
      const ids = [clientId, user.uid].sort();
      const newConversationId = jobId ? `${jobId}_${ids.join('_')}` : ids.join('_');
      setSelectedConversationId(newConversationId);
      navigate(`/messages/${newConversationId}`, { replace: true });
    }
  }, [conversationId, clientId, jobId, user?.uid, navigate, preloadMessages]);

  // Fetch user profiles for conversations
  useEffect(() => {
    const fetchUserProfiles = async () => {
      const profilesToFetch = conversations
        .filter(conv => conv.clientId && !userProfiles[conv.clientId])
        .map(conv => conv.clientId);

      for (const clientId of profilesToFetch) {
        try {
          const response = await axios.get(`${API_BASE}/api/users/${clientId}/public`);
          setUserProfiles(prev => ({ ...prev, [clientId]: response.data }));
        } catch (err) {
          console.error(`Failed to fetch profile for ${clientId}:`, err);
        }
      }
    };

    if (conversations.length > 0) {
      fetchUserProfiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  // Fetch job details and worker requests for conversations
  useEffect(() => {
    const fetchConversationData = async () => {
      for (const conv of conversations) {
        // Fetch jobs for this conversation (including private jobs)
        if (conv.conversationId) {
          try {
            const jobsResponse = await axios.get(
              `${API_BASE}/api/conversations/${conv.conversationId}/jobs`
            );
            
            // Update job details cache and check for job offers
            if (jobsResponse.data.jobs && jobsResponse.data.jobs.length > 0) {
              for (const job of jobsResponse.data.jobs) {
                if (job._id && !jobDetails[job._id]) {
                  setJobDetails(prev => ({ ...prev, [job._id]: job }));
                }
                // Check if this is a private job offer targeted to this worker
                // Note: We'll check application status in the Messages component for better performance
                if (job.isPrivate && job.targetWorkerId === user?.uid) {
                  setJobOffers(prev => ({ ...prev, [conv.conversationId]: job }));
                }
              }
            }

            // Update worker job requests cache
            if (jobsResponse.data.workerRequests && jobsResponse.data.workerRequests.length > 0) {
              const request = jobsResponse.data.workerRequests[0];
              setWorkerJobRequests(prev => ({ ...prev, [conv.conversationId]: request }));
            }
          } catch (err) {
            console.error(`Failed to fetch conversation data for ${conv.conversationId}:`, err);
          }
        }

        // Also fetch by jobId if exists (for backward compatibility)
        if (conv.jobId && !jobDetails[conv.jobId]) {
          try {
            const response = await axios.get(`${API_BASE}/api/browse-jobs/${conv.jobId}`);
            setJobDetails(prev => ({ ...prev, [conv.jobId]: response.data }));
          } catch (err) {
            if (err.response?.status === 404) {
              setJobDetails(prev => ({ ...prev, [conv.jobId]: null }));
            } else {
              console.error(`Failed to fetch job ${conv.jobId}:`, err);
            }
          }
        }
      }
    };

    if (conversations.length > 0) {
      fetchConversationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations]);

  // Filter and search conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    } else if (filter === 'job-related') {
      filtered = filtered.filter(conv => conv.jobId);
    } else if (filter === 'general') {
      filtered = filtered.filter(conv => !conv.jobId);
    }

    // Apply search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(conv => {
        const name = conv.clientName?.toLowerCase() || '';
        const jobTitle = jobDetails[conv.jobId]?.title?.toLowerCase() || '';
        return name.includes(search) || jobTitle.includes(search);
      });
    }

    // Sort by last message time (most recent first)
    return filtered.sort((a, b) => {
      const aTime = new Date(a.lastMessageCreatedAt || 0).getTime();
      const bTime = new Date(b.lastMessageCreatedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [conversations, filter, searchTerm, jobDetails]);

  // Format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleConversationClick = (conv) => {
    setSelectedConversationId(conv.conversationId);
    navigate(`/messages/${conv.conversationId}`);
    if (window.innerWidth < 768) {
      setShowMobileConversations(false);
    }
  };

  const selectedConversation = conversations.find(c => c.conversationId === conversationId);
  const selectedClientProfile = selectedConversation?.clientId ? userProfiles[selectedConversation.clientId] : null;
  const selectedJobDetail = selectedConversation?.jobId ? jobDetails[selectedConversation.jobId] : null;

  return (
    <div className="min-h-screen page-bg">
      <div className="flex h-screen">
        {/* Conversations Sidebar */}
        <div className={`${
          showMobileConversations ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-96 border-r border-base-300 bg-base-200`}>
          {/* Header */}
          <div className="p-4 border-b border-base-300 bg-base-100">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-base-content">Messages</h1>
              <Link
                to="/browse-clients"
                className="btn btn-sm btn-primary"
                onClick={() => setShowMobileConversations(false)}
              >
                <i className="fas fa-plus mr-2"></i>
                Browse Clients
              </Link>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content opacity-50" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="input input-bordered w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <select
                className="select select-bordered select-sm flex-1"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="job-related">Job Related</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loadingConversations ? (
              <div className="p-4 text-center">
                <span className="loading loading-spinner loading-md text-primary"></span>
                <p className="text-sm text-base-content opacity-70 mt-2">Loading conversations...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-base-content opacity-70">
                <i className="fas fa-inbox text-4xl mb-2 opacity-30"></i>
                <p className="text-sm">
                  {searchTerm || filter !== 'all' ? 'No conversations match your filters' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-base-300">
                {filteredConversations.map((conv) => {
                  const profile = userProfiles[conv.clientId];
                  const jobDetail = jobDetails[conv.jobId];
                  const workerRequest = conv.conversationId ? workerJobRequests[conv.conversationId] : null;
                  const isSelected = conv.conversationId === conversationId;

                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => handleConversationClick(conv)}
                      className={`w-full p-4 text-left hover:bg-base-300 transition-colors ${
                        isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Profile Picture */}
                        <div className="avatar flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                            {profile?.profileCover ? (
                              <img
                                src={profile.profileCover}
                                alt={conv.clientName}
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full rounded-full flex items-center justify-center ${profile?.profileCover ? 'hidden' : ''}`}>
                              <i className="fas fa-user text-primary text-lg"></i>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm text-base-content truncate">
                                {conv.clientName || 'Client'}
                              </p>
                              {profile?.emailVerified && (
                                <div className="badge badge-success badge-xs">
                                  <i className="fas fa-check-circle"></i>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-base-content opacity-60 flex-shrink-0 ml-2">
                              {formatRelativeTime(conv.lastMessageCreatedAt)}
                            </span>
                          </div>
                          
                          {/* Job Offer - Compact View (Priority - show before regular job details) */}
                          {(() => {
                            const jobOffer = conv.conversationId ? jobOffers[conv.conversationId] : null;
                            if (jobOffer) {
                              return (
                                <div className="mb-2">
                                  <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-2 rounded border-2 border-primary/30">
                                    <div className="flex items-center gap-2">
                                      <span className="badge badge-success badge-xs">
                                        <i className="fas fa-briefcase mr-1"></i>
                                        New Job Offer
                                      </span>
                                      <span className="text-xs font-semibold text-base-content truncate">
                                        {jobOffer.title}
                                      </span>
                                      {jobOffer.budget && (
                                        <span className="text-xs font-semibold text-primary">
                                          {jobOffer.budget} {jobOffer.currency || 'BDT'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Job Details - Compact View */}
                          {(() => {
                            const jobOffer = conv.conversationId ? jobOffers[conv.conversationId] : null;
                            // Only show regular job details if there's no job offer
                            if (!jobOffer && jobDetail && jobDetail !== null) {
                              return (
                                <div className="mb-2">
                                  <JobDetailsCard job={jobDetail} compact={true} />
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Worker Job Request - Compact View */}
                          {workerRequest && (
                            <div className="mb-2">
                              <div className="bg-base-100 p-2 rounded border border-base-300">
                                <div className="flex items-center gap-2">
                                  <span className="badge badge-info badge-xs">
                                    <i className="fas fa-user-tie mr-1"></i>
                                    Request
                                  </span>
                                  <span className="text-xs font-semibold text-base-content truncate">
                                    {workerRequest.title}
                                  </span>
                                  {workerRequest.proposedPrice && (
                                    <span className="text-xs text-base-content/70">
                                      {workerRequest.proposedPrice} {workerRequest.currency || 'BDT'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-base-content opacity-70 truncate">
                            {conv.lastMessageText || 'No messages yet'}
                          </p>
                        </div>

                        {conv.unreadCount > 0 && (
                          <span className="badge badge-primary badge-sm flex-shrink-0">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message View */}
        <div className={`${
          showMobileConversations ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col bg-base-100`}>
          {conversationId ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden p-4 border-b border-base-300 bg-base-100 flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowMobileConversations(true);
                    navigate('/messages');
                  }}
                  className="btn btn-sm btn-ghost"
                >
                  <FaArrowLeft />
                </button>
                <div className="flex items-center gap-3 flex-1">
                  {selectedClientProfile?.profileCover && (
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full">
                        <img
                          src={selectedClientProfile.profileCover}
                          alt={selectedConversation?.clientName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-base-content">
                      {selectedConversation?.clientName || 'Client'}
                    </h3>
                    {selectedClientProfile && (
                      <p className="text-xs text-base-content opacity-70">
                        {[selectedClientProfile.city, selectedClientProfile.country].filter(Boolean).join(', ') || 'Location not set'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages Component */}
              <div className="flex-1 overflow-hidden">
                <Messages
                  conversationId={conversationId}
                  jobId={selectedConversation?.jobId || jobId || null}
                  clientId={selectedConversation?.clientId || clientId || null}
                  clientName={selectedConversation?.clientName || null}
                  showHeader={false}
                  showUserInfo={true}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-base-200">
              <div className="text-center p-8">
                <i className="fas fa-comments text-6xl text-base-content opacity-30 mb-4"></i>
                <h2 className="text-xl font-semibold text-base-content mb-2">Select a conversation</h2>
                <p className="text-base-content opacity-70 mb-4">
                  Choose a conversation from the sidebar to start messaging
                </p>
                <Link to="/browse-clients" className="btn btn-primary">
                  <i className="fas fa-plus mr-2"></i>
                  Browse Clients
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
