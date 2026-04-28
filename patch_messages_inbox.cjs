const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'MessagesInbox.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// The layout in MessagesInbox.jsx starts at line 241: return ( <div className="min-h-[100dvh] bg-base-100 ...
const returnBlockRegex = /return \(\s*<div className="min-h-\[100dvh\] bg-base-100 overflow-hidden">.*?(?=\s*\};\s*export default)/s;

const newReturnBlock = `return (
    <div className="min-h-[100dvh] bg-[#f9f9f7] overflow-hidden font-sans">
      <div className="flex h-[100dvh]">
        {/* Conversations Sidebar */}
        <div className={\`\${
          showMobileConversations ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-[400px] border-r border-gray-200 bg-white\`}>
          {/* Header */}
          <div className="p-6 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-6">
               <div className="space-y-1">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Messages</h1>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Inbox</p>
               </div>
               <Link
                 to="/browse-clients"
                 className="bg-brand hover:bg-brand-hover text-white rounded-xl px-4 py-2 font-bold text-xs shadow-sm transition-colors"
                 onClick={() => setShowMobileConversations(false)}
               >
                 New Chat
               </Link>
            </div>

            {/* Search */}
            <div className="relative group">
               <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-xl group-focus-within:text-brand transition-colors">search</span>
               </div>
               <input
                 type="text"
                 placeholder="Search messages..."
                 className="w-full bg-gray-50 border border-gray-200 focus:border-brand focus:bg-white rounded-xl py-3 pl-12 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all outline-none"
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
                   className={\`shrink-0 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all \${
                     filter === f ? 'bg-brand text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                   }\`}
                 >
                   {f.replace('-', ' ')}
                 </button>
               ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto scrollbar-hide py-2 bg-white">
            {loadingConversations ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                 <span className="loading loading-spinner loading-md text-brand mb-4"></span>
                 <p className="text-xs font-bold text-gray-500">Loading messages...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-12 text-center">
                 <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-3xl text-gray-400">chat_bubble</span>
                 </div>
                 <p className="text-sm font-medium text-gray-500 leading-relaxed">
                   {searchTerm || filter !== 'all' ? 'No messages found.' : 'No active conversations.'}
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
                      className={\`w-full group relative p-4 rounded-2xl text-left transition-all duration-200 \${
                        isSelected 
                          ? 'bg-brand-light/30 border border-brand-light' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }\`}
                    >
                      {conv.unreadCount > 0 && !isSelected && (
                        <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-brand rounded-full shadow-sm"></div>
                      )}
                      
                      <div className="flex items-start gap-4">
                        {/* Profile Picture */}
                        <div className="shrink-0">
                           <div className={\`w-12 h-12 rounded-full overflow-hidden border-2 \${isSelected ? 'border-brand' : 'border-gray-100'} bg-gray-100 shadow-sm\`}>
                             {profile?.profileCover ? (
                               <img
                                 src={profile.profileCover}
                                 alt={conv.clientName}
                                 className="w-full h-full object-cover"
                                 onError={(e) => {
                                   e.currentTarget.style.display = 'none';
                                   e.currentTarget.nextSibling.style.display = 'flex';
                                 }}
                               />
                             ) : null}
                             <div className={\`w-full h-full flex items-center justify-center \${profile?.profileCover ? 'hidden' : 'flex'} \${isSelected ? 'text-brand' : 'text-gray-500'}\`}>
                               <span className="text-xl font-black">{(conv.clientName || 'C')[0]}</span>
                             </div>
                           </div>
                        </div>

                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-center justify-between mb-1">
                             <h3 className={\`text-sm font-bold truncate \${isSelected ? 'text-brand-hover' : 'text-gray-900'}\`}>
                               {conv.clientName || 'Unknown User'}
                             </h3>
                             <span className={\`text-xs font-medium \${isSelected ? 'text-brand' : 'text-gray-400'}\`}>
                               {formatRelativeTime(conv.lastMessageCreatedAt)}
                             </span>
                          </div>
                          
                          <div className="space-y-1.5">
                             {/* Contextual Badges */}
                             <div className="flex flex-wrap gap-2">
                                {conv.jobId && (
                                   <span className={\`px-2 py-0.5 rounded-md text-[10px] font-bold border \${isSelected ? 'bg-white border-brand-light text-brand-hover' : 'bg-gray-50 border-gray-200 text-gray-600'}\`}>
                                      Job: {jobDetail?.title?.slice(0, 15)}...
                                   </span>
                                )}
                                {workerRequest && (
                                   <span className={\`px-2 py-0.5 rounded-md text-[10px] font-bold border \${isSelected ? 'bg-white border-brand-light text-brand-hover' : 'bg-amber-50 border-amber-200 text-amber-700'}\`}>
                                      Pending Offer
                                   </span>
                                )}
                             </div>

                             <p className={\`text-xs font-medium leading-normal line-clamp-1 \${isSelected ? 'text-brand-hover/80' : 'text-gray-500'}\`}>
                               {conv.lastMessageText || 'Start the conversation...'}
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
        <div className={\`\${
          showMobileConversations ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col bg-[#f9f9f7] overflow-hidden relative\`}>
          {conversationId ? (
            <>
              {/* Desktop/Mobile Common Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setShowMobileConversations(true);
                      navigate(\`/\${basePath}\`);
                    }}
                    className="md:hidden btn btn-sm btn-ghost btn-circle text-gray-600"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50">
                        {selectedClientProfile?.profileCover ? (
                           <img src={selectedClientProfile.profileCover} alt={selectedConversation?.clientName} className="w-full h-full object-cover" />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center font-black text-gray-400 text-xl">{(selectedConversation?.clientName || 'C')[0]}</div>
                        )}
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-gray-900 leading-none mb-1.5">
                           {selectedConversation?.clientName || 'Client'}
                        </h3>
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 bg-brand rounded-full"></span>
                           <span className="text-xs font-bold text-gray-500">Connected</span>
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <button className="p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
                      <span className="material-symbols-outlined">more_vert</span>
                   </button>
                </div>
              </div>

              {/* Messages Component Injection */}
              <div className="flex-1 overflow-hidden bg-[#f9f9f7]">
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
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#f9f9f7]">
               <div className="w-24 h-24 bg-white rounded-full border border-gray-100 flex items-center justify-center shadow-sm mb-6">
                  <span className="material-symbols-outlined text-5xl text-gray-300">forum</span>
               </div>
               <h2 className="text-2xl font-black text-gray-900 mb-2">Your Messages</h2>
               <p className="text-sm font-medium text-gray-500 max-w-sm mb-8">
                  Select a conversation from the sidebar or find a client to start chatting.
               </p>
               <Link to="/browse-clients" className="bg-brand hover:bg-brand-hover text-white rounded-xl px-8 py-3 font-bold text-sm shadow-sm transition-colors">
                  Find Clients
               </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );`;

content = content.replace(returnBlockRegex, newReturnBlock + '\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched MessagesInbox.jsx');
