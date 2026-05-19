
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
    <div className="h-[calc(100vh-10rem)] flex bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in duration-300">
      
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col ${activeSessionId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-200 bg-white">
           <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={24} /> ห้องสนทนา
              </h2>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                <Plus size={20} />
              </button>
           </div>
           
           <button 
             onClick={handleContactAdmin}
             className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-amber-200 shadow-sm"
           >
             <ShieldAlert size={16} /> แจ้งปัญหา / ติดต่อ Admin
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && sessions.length === 0 ? (
              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
          ) : sessions.length === 0 ? (
             <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto"><MessageSquare size={32} className="opacity-20"/></div>
                <p className="text-sm font-medium">ยังไม่มีการสนทนาในระบบ</p>
             </div>
          ) : (
             sessions.map(session => {
               const unread = session.unread_count?.[currentUser.id] || 0;
               const isActive = activeSessionId === session.id;
               
               return (
                <div 
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`relative p-4 border-b border-slate-100 cursor-pointer transition-all group flex items-center gap-3
                    ${isActive ? 'bg-white border-l-4 border-l-blue-600' : 'hover:bg-blue-50/50 border-l-4 border-l-transparent'}
                  `}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-sm ${session.type === 'support' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {getSessionAvatar(session)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                        <h4 className="font-bold text-sm truncate text-slate-700">
                        {getSessionName(session)}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                        {session.updated_at ? new Date(session.updated_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : ''}
                        </span>
                    </div>
                    <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                        {session.last_message || '...' }
                    </p>
                  </div>
                  
                  {unread > 0 && <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{unread}</div>}

                  <button 
                    onClick={(e) => openDeleteConfirm(session.id, e)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg md:opacity-0 group-hover:opacity-100 transition-all ml-1"
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
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveSessionId(null)} className="md:hidden p-2 text-slate-400 hover:text-slate-600"><ArrowLeft size={20}/></button>
              <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
                {getSessionAvatar(activeSession)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base leading-tight">
                  {getSessionName(activeSession)}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Now</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><Info size={18}/></button>
                <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg"><MoreVertical size={18}/></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar" ref={scrollRef}>
             {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser.id;
                const showName = idx === 0 || messages[idx-1].sender_id !== msg.sender_id;
                return (
                    <div key={msg.id} className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <div className={`max-w-[80%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            {showName && !isMe && (
                                <span className="text-[10px] text-slate-400 font-bold mb-1 ml-1 uppercase">{users.find(u => u.id === msg.sender_id)?.full_name}</span>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                                {msg.text}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 font-bold opacity-70">
                                {new Date(msg.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                );
             })}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="flex gap-2 items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200 focus-within:border-blue-400 transition-all">
                <input 
                  type="text" 
                  placeholder="พิมพ์ข้อความของคุณ..." 
                  className="flex-1 px-4 py-2.5 bg-transparent outline-none text-sm font-medium"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || sending}
                  className={`p-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center ${!newMessage.trim() ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {sending ? <Loader2 className="animate-spin" size={20}/> : <Send size={20} />}
                </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 p-10 text-center">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl mb-6 text-blue-100"><MessageSquare size={56} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">ยินดีต้อนรับสู่ระบบสนทนา</h3>
          <p className="max-w-xs text-sm">เลือกห้องแชทเพื่อเริ่มสื่อสาร</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">ยืนยันการลบ</h3>
              <p className="text-slate-500 text-sm mb-6">คุณต้องการลบห้องสนทนานี้และข้อความทั้งหมดใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModalOpen(false)} 
                  className="flex-1 px-4 py-3 text-slate-500 font-bold border rounded-xl hover:bg-slate-50 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95"
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">เริ่มการสนทนาใหม่</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400"><X size={20}/></button>
            </div>
            
            <div className="p-4 border-b border-slate-100 bg-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="ค้นหาตามชื่อ หรือ แผนก..." 
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-50 bg-slate-50 focus:bg-white transition-all"
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
               <div className="space-y-2">
                 {filteredUsers.map(u => (
                    <div 
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border transition-all ${selectedUsers.includes(u.id) ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                    >
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${selectedUsers.includes(u.id) ? 'bg-blue-600 border-blue-600 shadow-sm' : 'border-slate-300 bg-white'}`}>
                            {selectedUsers.includes(u.id) && <Check size={14} className="text-white" />}
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${selectedUsers.includes(u.id) ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            {u.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm">{u.full_name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{u.department_name || 'ไม่ระบุแผนก'}</p>
                        </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-5 py-3 text-slate-500 font-bold hover:bg-white rounded-xl transition-all">ยกเลิก</button>
              <button 
                onClick={handleCreateSession}
                disabled={selectedUsers.length === 0 || loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2"
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
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default ChatSystem;
