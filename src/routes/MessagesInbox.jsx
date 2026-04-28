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

export default function MessagesInbox({ basePath = 'messages' }) {
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
      setShowMobileConversations(false);
    } else if (clientId) {
      // Generate conversation ID for new conversation
      const ids = [clientId, user.uid].sort();
      const newConversationId = jobId ? `${jobId}_${ids.join('_')}` : ids.join('_');
      setSelectedConversationId(newConversationId);
      navigate(`/${basePath}/${newConversationId}`, { replace: true });
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
    navigate(`/${basePath}/${conv.conversationId}`);
    setShowMobileConversations(false);
  };

  const selectedConversation = conversations.find(c => c.conversationId === conversationId);
  const selectedClientProfile = selectedConversation?.clientId ? userProfiles[selectedConversation.clientId] : null;
  const selectedJobDetail = selectedConversation?.jobId ? jobDetails[selectedConversation.jobId] : null;

  return (
    <div className="min-h-[100dvh] bg-base-100 overflow-hidden">
      <div className="flex h-[100dvh]">
        {/* Conversations Sidebar */}
        <div className={`${
          showMobileConversations ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-[400px] border-r border-base-300 bg-base-200/50 backdrop-blur-xl`}>
          {/* Header */}
          <div className="p-6 border-b border-base-300 bg-base-100/50">
            <div className="flex items-center justify-between mb-6">
               <div className="space-y-1">
                  <h1 className="text-2xl font-heading font-black text-base-content tracking-tight">Comms</h1>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-base-content/30">Intelligence Center</p>
               </div>

            </div>

            {/* Search */}
            <div className="relative group">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-base-content/30 text-xl group-focus-within:text-primary transition-colors">search</span>
               </div>
               <input
                 type="text"
                 placeholder="SCAN CONVERSATIONS..."
                 className="w-full bg-base-200 border-2 border-transparent focus:border-primary/20 focus:bg-base-100 rounded-2xl py-3.5 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-base-content placeholder:text-base-content/20 transition-all outline-none"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
               {['all', 'unread', 'job-related'].map((f) => (
                 <button
                   key={f}
                   onClick={() => setFilter(f)}
                   className={`shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                     filter === f ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-base-200 text-base-content/40 hover:bg-base-300'
                   }`}
                 >
                   {f.replace('-', ' ')}
                 </button>
               ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
            {loadingConversations ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                 <span className="loading loading-ring loading-lg text-primary mb-4"></span>
                 <p className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Synchronizing Decryptors...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-12 text-center">
                 <div className="w-16 h-16 bg-base-300/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-3xl text-base-content/20">chat_bubble</span>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-base-content/30 leading-relaxed">
                   {searchTerm || filter !== 'all' ? 'No intelligence found for query' : 'No active frequency detected'}
                 </p>
              </div>
            ) : (
              <div className="space-y-1 px-3">
                {filteredConversations.map((conv) => {
                  const profile = userProfiles[conv.clientId];
                  const jobDetail = jobDetails[conv.jobId];
                  const workerRequest = conv.conversationId ? workerJobRequests[conv.conversationId] : null;
                  const isSelected = conv.conversationId === conversationId;

                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => handleConversationClick(conv)}
                      className={`w-full group relative p-4 rounded-3xl text-left transition-all duration-300 ${
                        isSelected 
                          ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                          : 'hover:bg-base-300 text-base-content'
                      }`}
                    >
                      {conv.unreadCount > 0 && !isSelected && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm shadow-primary/40"></div>
                      )}
                      
                      <div className="flex items-start gap-4">
                        {/* Profile Picture */}
                        <div className="shrink-0">
                           <div className={`w-14 h-14 rounded-2xl overflow-hidden p-0.5 border ${isSelected ? 'border-white/20 bg-white/10' : 'border-base-300 bg-base-100'} shadow-sm`}>
                             {profile?.profileCover ? (
                               <img
                                 src={profile.profileCover}
                                 alt={conv.clientName}
                                 className="w-full h-full rounded-[0.9rem] object-cover"
                                 onError={(e) => {
                                   e.currentTarget.style.display = 'none';
                                   e.currentTarget.nextSibling.style.display = 'flex';
                                 }}
                               />
                             ) : null}
                             <div className={`w-full h-full rounded-[0.9rem] flex items-center justify-center ${profile?.profileCover ? 'hidden' : 'flex'} ${isSelected ? 'text-white' : 'text-primary'}`}>
                               <span className="text-xl font-heading font-black">{(conv.clientName || 'C')[0]}</span>
                             </div>
                           </div>
                        </div>

                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center justify-between mb-1">
                             <h3 className={`text-sm font-black uppercase tracking-tight truncate ${isSelected ? 'text-white' : 'text-base-content'}`}>
                               {conv.clientName || 'Unknown Entity'}
                             </h3>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-base-content/30'}`}>
                               {formatRelativeTime(conv.lastMessageCreatedAt)}
                             </span>
                          </div>
                          
                          <div className="space-y-2">
                             {/* Contextual Badges */}
                             <div className="flex flex-wrap gap-2">
                                {conv.jobId && (
                                   <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${isSelected ? 'bg-white/10 border-white/20' : 'bg-primary/5 border-primary/20 text-primary'}`}>
                                      JOB: {jobDetail?.title?.slice(0, 15)}...
                                   </span>
                                )}
                                {workerRequest && (
                                   <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${isSelected ? 'bg-white/10 border-white/20' : 'bg-info/10 border-info/20 text-info'}`}>
                                      PENDING OFFER
                                   </span>
                                )}
                             </div>

                             <p className={`text-[10px] font-medium leading-normal line-clamp-2 ${isSelected ? 'text-white/80' : 'text-base-content/50'}`}>
                               {conv.lastMessageText || 'Protocol initiated. Waiting for transmission...'}
                             </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Message View Area */}
        <div className={`${
          showMobileConversations ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col bg-base-100 overflow-hidden relative`}>
          {conversationId ? (
            <>
              {/* Desktop/Mobile Common Header */}
              <div className="p-6 border-b border-base-300 bg-base-100/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setShowMobileConversations(true);
                      navigate(`/${basePath}`);
                    }}
                    className="md:hidden btn btn-sm btn-ghost btn-circle"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl overflow-hidden p-0.5 border border-base-300 bg-base-200">
                        {selectedClientProfile?.profileCover ? (
                           <img src={selectedClientProfile.profileCover} alt={selectedConversation?.clientName} className="w-full h-full rounded-[0.9rem] object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center font-black text-primary text-xl">{(selectedConversation?.clientName || 'C')[0]}</div>
                        )}
                     </div>
                     <div>
                        <h3 className="text-lg font-heading font-black text-base-content leading-none mb-1">
                           {selectedConversation?.clientName || 'Authorized User'}
                        </h3>
                        <div className="flex items-center gap-2">
                           <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                           <span className="text-[10px] font-black uppercase tracking-widest text-base-content/40">Secure Connection</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   <button className="btn btn-ghost btn-circle hover:bg-base-200">
                      <span className="material-symbols-outlined text-base-content/60">shield_lock</span>
                   </button>
                   <button className="btn btn-ghost btn-circle hover:bg-base-200">
                      <span className="material-symbols-outlined text-base-content/60">more_vert</span>
                   </button>
                </div>
              </div>

              {/* Messages Component Injection */}
              <div className="flex-1 overflow-hidden bg-base-200/30">
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-base-200/20">
               <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                  <div className="w-24 h-24 bg-base-100 rounded-[2.5rem] border border-base-300 flex items-center justify-center relative z-10 shadow-xl">
                     <span className="material-symbols-outlined text-5xl text-primary">sensors</span>
                  </div>
               </div>
               <h2 className="text-3xl font-heading font-black text-base-content mb-4 tracking-tight">Intelligence Feed</h2>
               <p className="text-sm font-medium text-base-content/40 max-w-sm mb-10 leading-relaxed">
                  Select an encrypted frequency from the directory to establish a communication bridge.
               </p>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
