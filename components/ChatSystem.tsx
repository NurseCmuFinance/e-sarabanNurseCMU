
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageSquare, Plus, Trash2, X, Check, Search, AlertCircle, ShieldAlert, Loader2, ArrowLeft, MoreVertical, Info, AlertTriangle } from 'lucide-react';
import { getUsers, getMySessions, getSessionMessages, sendMessage, createChatSession, deleteChatSession, markSessionAsRead } from '../services/mockService';
import { Profile, ChatMessage, ChatSession, UserRole } from '../types';

interface ChatSystemProps {
  user: Profile;
}

const ChatSystem: React.FC<ChatSystemProps> = ({ user: currentUser }) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // State สำหรับการลบ (Custom Confirm)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionIdToDelete, setSessionIdToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(refreshSessions, 3000); // Polling ทุก 3 วินาที
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
      markSessionAsRead(activeSessionId, currentUser.id);
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
        const [u, s] = await Promise.all([getUsers(), getMySessions(currentUser.id)]);
        setUsers(u);
        setSessions(s);
    } catch (e) {
        console.error("Error loading chat data", e);
    } finally {
        setLoading(false);
    }
  };

  const refreshSessions = async () => {
    try {
        const s = await getMySessions(currentUser.id);
        setSessions(s);
        
        if (activeSessionId) {
           const sessionExists = s.some(sess => sess.id === activeSessionId);
           if (!sessionExists) {
               setActiveSessionId(null);
               return;
           }

           const msgs = await getSessionMessages(activeSessionId);
           if (msgs.length !== messages.length || (msgs.length > 0 && msgs[msgs.length-1].id !== messages[messages.length-1]?.id)) {
                setMessages(msgs);
           }
        }
    } catch (e) {
        console.error("Polling error", e);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
        const msgs = await getSessionMessages(sessionId);
        setMessages(msgs);
    } catch (e) {
        console.error("Error loading messages", e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSessionId || sending) return;
    
    setSending(true);
    try {
        const textToSend = newMessage.trim();
        setNewMessage('');
        await sendMessage(activeSessionId, currentUser.id, textToSend);
        await loadMessages(activeSessionId);
        await refreshSessions();
    } catch (e) {
        console.error("Send failed", e);
    } finally {
        setSending(false);
    }
  };

  const handleCreateSession = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
        const newSession = await createChatSession(currentUser.id, selectedUsers, 'direct');
        setIsCreateModalOpen(false);
        setSelectedUsers([]);
        setActiveSessionId(newSession.id);
        await refreshSessions();
    } catch (e) {
        console.error("Create session failed", e);
    } finally {
        setLoading(false);
    }
  };

  const handleContactAdmin = async () => {
    const admins = users.filter(u => u.role === UserRole.ADMIN && u.id !== currentUser.id);
    if (admins.length === 0) return;
    
    setLoading(true);
    try {
        const adminIds = [admins[0].id];
        const newSession = await createChatSession(currentUser.id, adminIds, 'support');
        setActiveSessionId(newSession.id);
        await refreshSessions();
    } catch (e) {
        console.error("Support chat failed", e);
    } finally {
        setLoading(false);
    }
  };

  const openDeleteConfirm = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionIdToDelete(sessionId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!sessionIdToDelete) return;
    setLoading(true);
    try {
        await deleteChatSession(sessionIdToDelete);
        if (activeSessionId === sessionIdToDelete) setActiveSessionId(null);
        await refreshSessions();
        setDeleteModalOpen(false);
        setSessionIdToDelete(null);
    } catch (e) {
        console.error("Delete failed", e);
    } finally {
        setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getSessionName = (session: ChatSession | undefined) => {
    if (!session || !session.participants) return 'กำลังโหลด...';
    if (session.type === 'support') return 'แจ้งปัญหา (Support)';
    const otherParticipantIds = (session.participants || []).filter(id => id !== currentUser.id);
    if (otherParticipantIds.length === 0) return 'บันทึกช่วยจำ (ตัวเอง)';
    
    const names = otherParticipantIds.map(id => {
        const u = users.find(u => u.id === id);
        return u ? u.full_name : 'ผู้ใช้ทั่วไป';
    });
    return names.join(', ');
  };

  const getSessionAvatar = (session: ChatSession | undefined) => {
    if (!session || !session.participants) return '?';
    const otherParticipantIds = (session.participants || []).filter(id => id !== currentUser.id);
    if (otherParticipantIds.length === 0) return currentUser.full_name.charAt(0);
    const u = users.find(u => u.id === otherParticipantIds[0]);
    return u ? u.full_name.charAt(0) : '?';
  };

  const filteredUsers = users.filter(u => 
    u.id !== currentUser.id && 
    (u.full_name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
     u.department_name?.toLowerCase().includes(userSearchTerm.toLowerCase()))
  );

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="h-[calc(100vh-10rem)] flex glass-card border border-indigo-500/10 shadow-xl overflow-hidden animate-fade-in-scale">
      
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-indigo-500/10 bg-slate-950/20 backdrop-blur-md flex flex-col ${activeSessionId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-indigo-500/10 bg-slate-900/30">
           <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-white text-lg flex items-center gap-2">
                <MessageSquare className="text-indigo-400 animate-float" size={24} /> 
                <span className="gradient-text font-extrabold">ห้องสนทนา</span>
              </h2>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary btn-icon btn-sm shadow-indigo-500/25 active:scale-95"
                title="เริ่มสนทนาใหม่"
              >
                <Plus size={20} />
              </button>
           </div>
           
           <button 
             onClick={handleContactAdmin}
             className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-amber-500/20 shadow-lg shadow-amber-500/5 hover:scale-[1.02] active:scale-95"
           >
             <ShieldAlert size={16} className="text-amber-400" /> แจ้งปัญหา / ติดต่อ Admin
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/5">
          {loading && sessions.length === 0 ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                 <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto border border-slate-700/50"><MessageSquare size={32} className="opacity-40 text-slate-300"/></div>
                 <p className="text-sm font-semibold text-slate-300">ยังไม่มีการสนทนาในระบบ</p>
                 <p className="text-xs text-slate-500">คลิกที่ปุ่มบวกเพื่อเริ่มต้นห้องสนทนาใหม่</p>
              </div>
          ) : (
             sessions.map(session => {
               const unread = session.unread_count?.[currentUser.id] || 0;
               const isActive = activeSessionId === session.id;
               
               return (
                <div 
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`relative p-4 border-b border-indigo-500/5 cursor-pointer transition-all group flex items-center gap-3
                    ${isActive 
                      ? 'bg-indigo-600/15 border-l-4 border-l-indigo-500 backdrop-blur-sm' 
                      : 'hover:bg-slate-800/30 border-l-4 border-l-transparent'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-md transition-all ${
                    session.type === 'support' 
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/30' 
                      : 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                      {getSessionAvatar(session)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-bold text-sm truncate text-white/90">
                        {getSessionName(session)}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold">
                        {session.updated_at ? new Date(session.updated_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                    </div>
                    <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-white' : 'text-slate-400'}`}>
                        {session.last_message || '...' }
                    </p>
                  </div>
                  
                  {unread > 0 && <div className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-lg shadow-rose-500/30 animate-pulse">{unread}</div>}

                  <button 
                    onClick={(e) => openDeleteConfirm(session.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all ml-1 active:scale-95"
                    title="ลบห้องสนทนา"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
               );
             })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeSessionId && activeSession ? (
        <div className="flex-1 flex flex-col bg-slate-900/10 backdrop-blur-md">
          {/* Header */}
          <div className="p-4 border-b border-indigo-500/10 flex items-center justify-between bg-slate-900/60 backdrop-blur-lg z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveSessionId(null)} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"><ArrowLeft size={20}/></button>
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-xl flex items-center justify-center font-extrabold shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                {getSessionAvatar(activeSession)}
              </div>
              <div>
                <h3 className="font-bold text-white text-base leading-tight">
                  {getSessionName(activeSession)}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">เชื่อมต่อแล้ว</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><Info size={18}/></button>
                <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"><MoreVertical size={18}/></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/20 custom-scrollbar" ref={scrollRef}>
             {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser.id;
                const showName = idx === 0 || messages[idx-1].sender_id !== msg.sender_id;
                return (
                    <div key={msg.id} className={`flex gap-3 animate-fade-in-up ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className={`max-w-[80%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            {showName && !isMe && (
                                <span className="text-[10px] text-indigo-300 font-extrabold mb-1 ml-1 tracking-wide">
                                  {users.find(u => u.id === msg.sender_id)?.full_name}
                                </span>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-md leading-relaxed ${
                              isMe 
                                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none border border-indigo-400/20 shadow-indigo-500/10' 
                                : 'bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 text-white rounded-tl-none'
                            }`}>
                                {msg.text}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 font-semibold opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                );
             })}
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-950/40 border-t border-indigo-500/10">
            <form onSubmit={handleSend} className="flex gap-2 items-center bg-slate-900/80 p-1.5 rounded-2xl border border-indigo-500/20 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                <input 
                  type="text" 
                  placeholder="พิมพ์ข้อความของคุณ..." 
                  className="flex-1 px-4 py-2.5 bg-transparent border-0 outline-none text-sm text-white placeholder-slate-500 font-medium focus:ring-0 focus:outline-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  className={`p-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${
                    !newMessage.trim() 
                      ? 'bg-slate-800 text-slate-600' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
                  }`}
                >
                  {sending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-950/10 p-10 text-center">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 rounded-3xl flex items-center justify-center border border-indigo-500/20 shadow-xl mb-6 text-indigo-400 animate-float">
            <MessageSquare size={56} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">ยินดีต้อนรับสู่ระบบสนทนา</h3>
          <p className="max-w-xs text-sm text-slate-400">เลือกห้องแชทเพื่อเริ่มสื่อสาร หรือสร้างห้องสนทนาใหม่ได้ทันที</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="glass-modal border border-rose-500/35 w-full max-w-sm overflow-hidden animate-fade-in-scale">
            <div className="p-8 text-center bg-slate-900/90 text-white">
              <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">ยืนยันการลบ</h3>
              <p className="text-slate-400 text-sm mb-6">คุณต้องการลบห้องสนทนานี้และข้อความทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModalOpen(false)} 
                  className="flex-1 px-4 py-3 text-slate-300 font-bold border border-slate-700 rounded-xl hover:bg-slate-800 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  ยืนยันลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Chat Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="glass-modal border border-indigo-500/25 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-scale">
            <div className="p-6 border-b border-indigo-500/10 flex justify-between items-center bg-slate-900/60">
              <h3 className="font-extrabold text-lg text-white">เริ่มการสนทนาใหม่</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-4 border-b border-indigo-500/10 bg-slate-900/20">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="ค้นหาตามชื่อ หรือ แผนก..." 
                        className="w-full pl-10 pr-4 py-3 bg-slate-950/50 border border-indigo-500/20 text-white rounded-xl text-sm focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-slate-500"
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-950/20">
               <div className="space-y-2">
                 {filteredUsers.length === 0 ? (
                   <p className="text-center text-slate-500 py-8 text-sm">ไม่พบผู้ใช้งานที่ตรงกับการค้นหา</p>
                 ) : (
                   filteredUsers.map(u => (
                      <div 
                          key={u.id}
                          onClick={() => toggleUserSelection(u.id)}
                          className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border transition-all ${
                            selectedUsers.includes(u.id) 
                              ? 'border-indigo-500/60 bg-indigo-600/10 shadow-lg shadow-indigo-600/5' 
                              : 'border-slate-800 hover:border-indigo-500/30 hover:bg-slate-800/30'
                          }`}
                      >
                          <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                            selectedUsers.includes(u.id) 
                              ? 'bg-indigo-600 border-indigo-500 shadow-sm shadow-indigo-500/30' 
                              : 'border-slate-700 bg-slate-950/30'
                          }`}>
                              {selectedUsers.includes(u.id) && <Check size={14} className="text-white" />}
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-md ${
                            selectedUsers.includes(u.id) 
                              ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white' 
                              : 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20'
                          }`}>
                              {u.full_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-sm">{u.full_name}</p>
                              <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wider mt-0.5">{u.department_name || 'ไม่ระบุแผนก'}</p>
                          </div>
                      </div>
                    ))
                 )}
               </div>
            </div>

            <div className="p-6 border-t border-indigo-500/10 bg-slate-900/60 flex justify-end gap-3">
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="px-5 py-3 text-slate-300 font-bold hover:bg-white/5 rounded-xl transition-all"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleCreateSession}
                disabled={selectedUsers.length === 0 || loading}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl disabled:opacity-40 font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18}/> : <MessageSquare size={18}/>} เริ่มสนทนา ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
      `}</style>
    </div>
  );
};

export default ChatSystem;
