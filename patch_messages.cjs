const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'routes', 'Messages.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const returnBlockRegex = /return \(\s*<div className="flex flex-col h-full bg-base-200 rounded-lg border border-base-300">.*?(?=\s*\};\s*export default)/s;

const newReturnBlock = `return (
    <div className="flex flex-col h-full bg-[#f9f9f7] font-sans relative">
      {/* Header */}
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4 flex-1">
            {showUserInfo && clientProfile?.profileCover && (
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 bg-gray-50">
                  <img
                    src={clientProfile.profileCover}
                    alt={clientName || 'Client'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-gray-900 truncate">{clientName || 'Client'}</h3>
                {showUserInfo && clientProfile?.emailVerified && (
                  <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center text-white text-[8px]">
                    <i className="fas fa-check"></i>
                  </div>
                )}
              </div>
              {showUserInfo && clientProfile && (
                <div className="text-xs font-medium text-gray-500 mt-0.5 flex items-center gap-2">
                  <span>{[clientProfile.city, clientProfile.country].filter(Boolean).join(', ') || 'Location not set'}</span>
                  {clientProfile.stats?.totalJobsPosted > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span>{clientProfile.stats.totalJobsPosted} jobs</span>
                    </>
                  )}
                </div>
              )}
              {showUserInfo && jobDetail && jobDetail !== null && (
                <div className="mt-1">
                  <Link
                    to={\`/job/\${jobId}\`}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-brand-light/30 border border-brand-light text-[10px] font-bold text-brand-hover hover:bg-brand-light/50 transition-colors"
                  >
                    <i className="fas fa-briefcase"></i>
                    {jobDetail.title}
                  </Link>
                </div>
              )}
            </div>
          </div>
          {onClose && (
             <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors ml-4">
                <span className="material-symbols-outlined">close</span>
             </button>
          )}
        </div>
      )}

      {/* Action Cards Container */}
      <div className="flex-shrink-0 bg-[#f9f9f7]">
        {/* Job Offer Card */}
        {jobOffer && jobOfferStatus === 'pending' && (
          <div className="p-4">
            <JobOfferCard 
              job={jobOffer}
              workerId={user?.uid}
              onAccept={handleJobOfferAccepted}
              onReject={handleJobOfferRejected}
            />
          </div>
        )}

        {/* Job Details Card */}
        {jobDetail && !jobOffer && (
          <div className="p-4 pb-0">
            <JobDetailsCard job={jobDetail} compact={false} />
          </div>
        )}

        {/* Worker Job Request Card */}
        {workerJobRequest && (
          <div className="p-4 pb-0">
            <WorkerJobRequestCard 
              request={workerJobRequest}
              userRole="worker"
            />
          </div>
        )}

        {/* Action Bar - Application Status & Quick Actions */}
        <div className="p-4 pb-2 border-b border-gray-100">
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
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-brand-light/30 flex items-center justify-center text-brand">
                       <i className="fas fa-paper-plane"></i>
                    </div>
                    <p className="text-sm font-bold">Apply for this job to start working</p>
                  </div>
                  <button
                    onClick={() => setShowApplicationModal(true)}
                    className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm"
                  >
                    Apply Now
                  </button>
                </div>
              )}
            </>
          )}

          {/* General conversation: Show create job request button */}
          {!jobId && !workerJobRequest && !jobOffer && (
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3 text-gray-600">
                <div className="w-8 h-8 rounded-lg bg-brand-light/30 flex items-center justify-center text-brand">
                   <i className="fas fa-plus"></i>
                </div>
                <p className="text-sm font-bold">Propose your services</p>
              </div>
              <button
                onClick={() => setShowJobRequestModal(true)}
                className="bg-brand hover:bg-brand-hover text-white px-5 py-2 rounded-xl font-bold text-sm transition-colors shadow-sm"
              >
                Create Job Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f9f9f7]">
        {messagesWithSeparators.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
             <div className="w-16 h-16 bg-white rounded-2xl border border-gray-100 flex items-center justify-center shadow-sm mb-4">
                <i className="fas fa-comments text-2xl text-gray-300"></i>
             </div>
             <p className="text-sm font-bold text-gray-400">No messages yet. Say hello!</p>
          </div>
        ) : (
          messagesWithSeparators.map((item) => {
            if (item.type === 'separator') {
              return (
                <div key={item.key} className="flex items-center justify-center my-6">
                  <div className="flex-1 border-t border-gray-200"></div>
                  <span className="mx-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{item.date}</span>
                  <div className="flex-1 border-t border-gray-200"></div>
                </div>
              );
            }
            
            const msg = item;
            const isSender = msg.senderId === user?.uid;
            const isSystemMessage = msg.isSystemMessage === true;
            const showAvatar = !isSender && !isSystemMessage && showUserInfo && clientProfile?.profileCover;
            
            // Render system messages
            if (isSystemMessage) {
              return (
                <div key={item.key} className="flex items-center justify-center my-4">
                  <div className="bg-white border border-gray-200 shadow-sm rounded-xl px-5 py-3 w-[85%] text-center max-w-lg">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <i className="fas fa-info-circle text-brand text-sm"></i>
                      <p className="text-sm font-medium text-gray-600">
                        {msg.message}
                      </p>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            }
            
            return (
              <div
                key={item.key}
                className={\`flex items-end gap-3 \${isSender ? 'justify-end' : 'justify-start'}\`}
              >
                {!isSender && showAvatar && (
                  <div className="shrink-0 mb-1">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                      <img
                        src={clientProfile.profileCover}
                        alt={clientName || 'Client'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                {!showAvatar && !isSender && <div className="w-8 shrink-0"></div>}
                
                <div className={\`flex flex-col \${isSender ? 'items-end' : 'items-start'} max-w-[75%]\`}>
                   <div
                     className={\`rounded-2xl px-5 py-3 shadow-sm \${
                       isSender
                         ? 'bg-brand text-white rounded-br-sm'
                         : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
                     }\`}
                   >
                     <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                   </div>
                   
                   <div className="flex items-center gap-1.5 mt-1.5 px-1">
                     <p className="text-[10px] font-bold text-gray-400">
                       {formatMessageTime(msg.createdAt)}
                     </p>
                     {isSender && (
                       <span className={\`text-[10px] \${msg.read ? 'text-brand' : 'text-gray-300'}\`}>
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
          <div className="flex items-center gap-3">
            {showUserInfo && clientProfile?.profileCover && (
              <div className="shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                  <img
                    src={clientProfile.profileCover}
                    alt={clientName || 'Client'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
               <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (connected && clientId) {
                sendTyping(clientId, e.target.value.length > 0);
              }
            }}
            placeholder="Type your message..."
            className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-6 py-3.5 text-sm font-medium text-gray-900 focus:bg-white focus:border-brand outline-none transition-all placeholder:text-gray-400"
            disabled={sending}
          />
          <button
            type="submit"
            className={\`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all \${
              !newMessage.trim() || sending 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-brand text-white hover:bg-brand-hover shadow-md hover:shadow-lg hover:-translate-y-0.5'
            }\`}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <i className="fas fa-paper-plane"></i>
            )}
          </button>
        </form>
      </div>

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
  );`;

content = content.replace(returnBlockRegex, newReturnBlock + '\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched Messages.jsx');
