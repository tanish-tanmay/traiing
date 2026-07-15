import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { sessionService, registrationService } from '../lib/services';
import { Session, Registration } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import { 
  ArrowLeft, Users, ThumbsUp, Shield, MessageSquare, Play, Send, 
  Trash2, Edit2, Check, X, Copy, RefreshCw, Key, Ban, UserCheck, 
  Lock, Smartphone, AlertCircle, Eye, EyeOff, Sparkles, Volume2, 
  Tv, Sliders, CheckSquare, Square, Search, Activity, ExternalLink
} from 'lucide-react';

export default function AdminLiveMonitor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Live Chat and filters state
  const [chats, setChats] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatFilter, setChatFilter] = useState<'all' | 'real' | 'ai' | 'auto'>('all');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState('');
  const [visibleChatCount, setVisibleChatCount] = useState<number>(5);

  // Autopilot settings overrides state
  const [targetViewers, setTargetViewers] = useState<number>(100);
  const [targetLikes, setTargetLikes] = useState<number>(35);
  const [chatSpeed, setChatSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [chatSimulatorEnabled, setChatSimulatorEnabled] = useState(true);
  const [aiRepliesEnabled, setAiRepliesEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Hidden password map for registered students
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [replyToChat, setReplyToChat] = useState<any | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const lastScrollPosRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);
  const lastFilteredLengthRef = useRef<number>(0);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;

    const currentFilteredLength = chats.filter((msg) => {
      if (chatFilter === 'all') return true;
      return msg.type === chatFilter;
    }).length;

    // Load older messages if scrolled near the top of the chat area
    if (scrollTop < 15 && visibleChatCount < currentFilteredLength) {
      lastScrollPosRef.current = {
        scrollTop,
        scrollHeight
      };
      // Load 10 more messages
      setVisibleChatCount(prev => Math.min(currentFilteredLength, prev + 10));
    }

    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAtBottom(atBottom);
  };

  // Restore scroll offset smoothly to prevent jumping when prepending old messages
  useEffect(() => {
    if (chatContainerRef.current && lastScrollPosRef.current) {
      const { scrollTop, scrollHeight } = lastScrollPosRef.current;
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeight;
      chatContainerRef.current.scrollTop = scrollTop + heightDifference;
      lastScrollPosRef.current = null;
    }
  }, [visibleChatCount]);

  // Keep visibleChatCount expanding automatically as new live messages are added at the bottom
  useEffect(() => {
    const currentFilteredLength = chats.filter((msg) => {
      if (chatFilter === 'all') return true;
      return msg.type === chatFilter;
    }).length;

    if (currentFilteredLength > lastFilteredLengthRef.current) {
      const added = currentFilteredLength - lastFilteredLengthRef.current;
      if (isAtBottom) {
        setVisibleChatCount(prev => prev + added);
      }
    }
    lastFilteredLengthRef.current = currentFilteredLength;
  }, [chats, chatFilter, isAtBottom]);

  // Reset visible chats limit back to 5 when filter or session changes
  useEffect(() => {
    setVisibleChatCount(5);
  }, [chatFilter, sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    // 1. Subscribe to Live Session updates
    const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as Session;
        setSession(data);
        setTargetViewers(data.targetViewers || 100);
        setTargetLikes(data.targetLikes || 35);
        setChatSpeed(data.chatSpeed || 'medium');
        setChatSimulatorEnabled(data.autoChatEnabled ?? true);
        setAiRepliesEnabled(data.aiReplyEnabled ?? true);
        setLoading(false);
      } else {
        setError('Session does not exist or has been removed.');
        setLoading(false);
      }
    }, (err) => {
      console.error(err);
      setError('Failed to sync session data.');
      setLoading(false);
    });

    // 2. Subscribe to Registrations for this session
    const qRegs = query(collection(db, 'registrations'), where('sessionId', '==', sessionId));
    const unsubRegs = onSnapshot(qRegs, (snapshot) => {
      const list: Registration[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Registration);
      });
      // Sort alphabetically
      list.sort((a, b) => a.name.localeCompare(b.name));
      setRegistrations(list);
    }, (err) => {
      console.error("Registrations snapshot subscription error:", err);
    });

    // 3. Subscribe to Chat history
    const chatsColRef = collection(db, 'sessions', sessionId, 'chats');
    const qChats = query(chatsColRef);
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({ id: docSnap.id, ...d });
      });
      // Sort chronologically
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setChats(list);
    }, (err) => {
      console.error("Chats history snapshot subscription error:", err);
    });

    return () => {
      unsubSession();
      unsubRegs();
      unsubChats();
    };
  }, [sessionId]);

  // Scroll to new chat messages (internal only - never scrolls mother page)
  useEffect(() => {
    if (chatContainerRef.current && isAtBottom) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chats, chatFilter, isAtBottom, visibleChatCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070415] flex flex-col items-center justify-center text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-semibold">Loading Live Broadcast Workspace...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#070415] flex flex-col items-center justify-center text-slate-300 p-6">
        <AlertCircle className="w-14 h-14 text-red-500 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2 text-white">Initialization Error</h2>
        <p className="text-slate-400 mb-6 text-center max-w-sm">{error || 'Unable to connect to active session.'}</p>
        <button 
          onClick={() => navigate('/admin')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-95"
        >
          Return to Admin Dashboard
        </button>
      </div>
    );
  }

  // Handle Autopilot Simulation Updates
  const handleUpdateAutopilot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateDoc(doc(db, 'sessions', session.id), {
        targetViewers: Number(targetViewers),
        targetLikes: Number(targetLikes),
        chatSpeed: chatSpeed,
        autoChatEnabled: chatSimulatorEnabled,
        aiReplyEnabled: aiRepliesEnabled
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update live stream parameters.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Toggle quick bool values instantly
  const toggleAutopilotSetting = async (field: 'autoChatEnabled' | 'aiReplyEnabled', val: boolean) => {
    try {
      await updateDoc(doc(db, 'sessions', session.id), {
        [field]: val
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Admin Manual Chat post
  const handleAdminSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !session) return;

    try {
      const chatsRef = collection(db, 'sessions', session.id, 'chats');
      const payload: any = {
        name: "Trainer",
        text: chatInput.trim(),
        createdAt: Date.now(),
        type: 'admin',
        isAdmin: true,
        avatarColor: 'purple'
      };

      if (replyToChat) {
        payload.parentId = replyToChat.id;
        
        // Also update the parent document to flag admin response
        await updateDoc(doc(db, 'sessions', session.id, 'chats', replyToChat.id), {
          adminReplied: true
        });
      }

      await addDoc(chatsRef, payload);
      setChatInput('');
      setReplyToChat(null);
    } catch (err) {
      console.error(err);
      alert('Failed to broadcast your message.');
    }
  };

  // Moderation Edit Action
  const handleStartEdit = (chatId: string, currentText: string) => {
    setEditingChatId(chatId);
    setEditInputText(currentText);
  };

  const handleSaveEdit = async (chatId: string) => {
    if (!editInputText.trim()) return;
    try {
      await updateDoc(doc(db, 'sessions', session.id, 'chats', chatId), {
        text: editInputText.trim()
      });
      setEditingChatId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to edit comment.');
    }
  };

  // Moderation Delete Action
  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this comment? It will be removed for everyone instantly.')) return;
    try {
      await deleteDoc(doc(db, 'sessions', session.id, 'chats', chatId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete comment.');
    }
  };

  // Clear All Chats Action
  const handleClearAllChats = async () => {
    if (!confirm('Are you SUPER sure you want to clear ALL CHATS? This action cannot be reversed and will erase chat history for everyone.')) return;
    try {
      const qChats = query(collection(db, 'sessions', session.id, 'chats'));
      const snapshot = await getDocs(qChats);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'sessions', session.id, 'chats', docSnap.id)));
      await Promise.all(deletePromises);
    } catch (err) {
      console.error(err);
      alert('Failed to clear all chats.');
    }
  };

  // STUDENT MANAGEMENT OPERATIONS
  const handleCopyDetails = (student: Registration) => {
    const text = `STUDENT DETAILS:\nName: ${student.name}\nStudent ID: ${student.studentId}\nPassword: ${student.password}\nUnique URL: ${window.location.origin}/live/${student.joinToken}`;
    navigator.clipboard.writeText(text);
    alert(`Copied credentials for ${student.name} to clipboard!`);
  };

  const handleResetPassword = async (student: Registration) => {
    if (!confirm(`Are you sure you want to regenerate a new random password for ${student.name}?`)) return;
    try {
      await registrationService.resetPassword(student.id);
    } catch (err) {
      alert('Failed to reset student password.');
    }
  };

  const handleResetDevice = async (student: Registration) => {
    if (!confirm(`Are you sure you want to reset device access for ${student.name}? They will be allowed to log in from any brand new browser.`)) return;
    try {
      await registrationService.resetDevice(student.id);
    } catch (err) {
      alert('Device reset failed.');
    }
  };

  const handleToggleBlock = async (student: Registration) => {
    const nextStatus = student.status === 'blocked' ? 'active' : 'blocked';
    const msg = nextStatus === 'blocked' 
      ? `Block ${student.name}? They will be immediately disconnected and prevented from joining.`
      : `Unblock ${student.name}? They will be allowed to join again.`;
    
    if (!confirm(msg)) return;
    try {
      await registrationService.updateStatus(student.id, nextStatus);
    } catch (err) {
      alert('Failed to update student access status.');
    }
  };

  const handleKickStudent = async (student: Registration) => {
    if (!confirm(`KICK AND EVICT ${student.name}?\nThis will completely terminate their registration token, sign them out instantly, and erase their records.`)) return;
    try {
      await registrationService.deleteRegistration(student.id);
    } catch (err) {
      alert('Eviction failed.');
    }
  };

  const togglePasswordVisibility = (studentId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Helpers to check student online/offline state using 30s heartbeat delay fallback
  const getStudentStatus = (student: Registration) => {
    if (!student.joinTime) return { label: 'NEVER JOINED', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' };
    
    if (student.isOnline) {
      const lastActive = student.lastActiveAt ? new Date(student.lastActiveAt).getTime() : 0;
      const secondsSinceActive = (Date.now() - lastActive) / 1000;
      if (secondsSinceActive < 35) {
        return { label: 'ONLINE / ACTIVE', color: 'text-green-400 bg-green-500/10 border-green-500/25 font-black uppercase' };
      }
    }
    
    // Offline state if joined before but no recent ping
    let lastActiveStr = 'Offline';
    if (student.lastActiveAt) {
      try {
        lastActiveStr = `Offline since ${new Date(student.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (err) {}
    }
    return { label: lastActiveStr, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20 font-medium' };
  };

  // Format watch seconds into highly legible hours-mins format
  const formatWatchTime = (seconds?: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
  };

  // Auto detect URLs inside chat messages and render as clickable links safely
  const renderTextWithLinks = (text: string) => {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.toLowerCase().startsWith('http') ? part : `https://${part}`;
        return (
          <a 
            key={index} 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-[#6366f1] hover:text-[#818cf8] underline font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
            <ExternalLink className="w-3 h-3 inline shrink-0" />
          </a>
        );
      }
      return part;
    });
  };

  const filteredChats = chats.filter((msg) => {
    if (chatFilter === 'all') return true;
    return msg.type === chatFilter;
  });

  const slicedChats = filteredChats.slice(-visibleChatCount);

  const filteredStudents = registrations.filter((student) => {
    const q = searchTerm.toLowerCase();
    return (
      student.name.toLowerCase().includes(q) ||
      student.studentId.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.mobile.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#070412] text-slate-100 flex flex-col font-sans transition-all">
      {/* Head Navigation Control Room Bar */}
      <header className="h-16 px-4 sm:px-6 bg-[#0c081e]/80 border-b border-white/10 flex items-center justify-between shrink-0 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider">Live Training Monitor Room</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600/15 border border-red-500/30 rounded-full animate-pulse">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span className="text-[8px] font-extrabold tracking-widest text-red-500 uppercase">Live</span>
              </div>
            </div>
            <h1 className="text-sm sm:text-base font-black truncate max-w-[240px] sm:max-w-md text-white">{session.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-zinc-500 uppercase font-black font-sans">Current Viewers</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs sm:text-sm font-bold font-mono text-white/95">{(session.currentViewers || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[9px] text-zinc-500 uppercase font-black font-sans">Total Likes</span>
              <div className="flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-pink-400" />
                <span className="text-xs sm:text-sm font-bold font-mono text-white/95">{(session.currentLikes || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main 3-Column Studio Grid Environment */}
      <main className={`flex-1 overflow-hidden grid grid-cols-1 gap-5 ${isChatMinimized ? 'lg:grid-cols-2' : 'lg:grid-cols-12'}`}>
        
        {/* PANEL 1: Stream Previewer & Autopilot Parameters */}
        <section className={`${isChatMinimized ? '' : 'lg:col-span-4'} flex flex-col gap-5 overflow-y-auto`}>
          {/* Stream Preview Container */}
          <div className="bg-[#0b081c]/50 border border-white/10 rounded-2xl overflow-hidden p-4 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-indigo-400" />
                <span>Trainer Broadcaster Feed</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Stream View</span>
            </div>

            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-white/5 ring-1 ring-white/5">
              <VideoPlayer 
                url={session.playbackUrl}
                videoSourceType={session.videoSourceType || 'upload'}
                startTime={session.startTime}
                watermarkText="ADMIN PRESENCE"
              />
            </div>
            <div className="p-2 bg-white/[0.02] border border-white/5 rounded-lg text-[10px] text-zinc-400 flex items-center justify-between font-mono">
              <span>Source: <span className="text-zinc-200 capitalize">{session.videoSourceType || 'upload'}</span></span>
              <span>Status: <span className="text-green-400 font-bold uppercase animate-pulse">Broadcasting</span></span>
            </div>
          </div>

          {/* Autopilot Simulator Engagement Configurations */}
          <div className="bg-[#0b081c]/50 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-pink-400" />
                <span>Autopilot Parameters</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 bg-pink-500/15 border border-pink-500/30 rounded-full font-black text-pink-400 uppercase font-mono">Sim Controller</span>
            </div>

            <form onSubmit={handleUpdateAutopilot} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Target Viewers</label>
                  <input 
                    type="number"
                    value={targetViewers}
                    onChange={e => setTargetViewers(Number(e.target.value))}
                    className="px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-mono font-bold text-indigo-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Target Likes</label>
                  <input 
                    type="number"
                    value={targetLikes}
                    onChange={e => setTargetLikes(Number(e.target.value))}
                    className="px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-mono font-bold text-pink-200"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-sans">Chat Speed Frequency</label>
                <select 
                  value={chatSpeed}
                  onChange={e => setChatSpeed(e.target.value as any)}
                  className="px-3 py-2 bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500 text-xs font-semibold text-slate-200"
                >
                  <option value="slow">Slow Comments (20s - 35s Delay)</option>
                  <option value="medium">Medium Comments (8s - 15s Delay)</option>
                  <option value="fast">Fast Comments Loop (3s - 6s Delay)</option>
                </select>
              </div>

              {/* Engagement Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => toggleAutopilotSetting('autoChatEnabled', !chatSimulatorEnabled)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-white/[0.02] border border-white/5 rounded-xl transition cursor-pointer text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-100">Simulate Engagement Chatter</span>
                    <span className="text-[9px] text-zinc-500">Auto-inject realistic farming comments</span>
                  </div>
                  {chatSimulatorEnabled ? (
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[9px] font-extrabold text-green-400 uppercase font-mono">Enabled</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-500/10 border border-zinc-500/20 rounded text-[9px] font-extrabold text-zinc-500 uppercase font-mono">Disabled</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => toggleAutopilotSetting('aiReplyEnabled', !aiRepliesEnabled)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-white/[0.02] border border-white/5 rounded-xl transition cursor-pointer text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-100">AI Trainer Co-Pilot Replies</span>
                    <span className="text-[9px] text-zinc-500">Auto-respond to student queries in Hinglish</span>
                  </div>
                  {aiRepliesEnabled ? (
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] font-extrabold text-indigo-400 uppercase font-mono">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-zinc-500/10 border border-zinc-500/20 rounded text-[9px] font-extrabold text-zinc-500 uppercase font-mono">Muted</span>
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition active:scale-95 text-center flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {savingSettings ? 'Syncing Overrides...' : 'Update Autopilot Targets'}
              </button>
            </form>
          </div>
        </section>

        {/* PANEL 2: Live Chat Monitor & Moderation Queue */}
        {!isChatMinimized && (
          <section className="lg:col-span-4 bg-[#0a061b]/50 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
            
            {/* Chat Panel Header / Filter tabs */}
            <div className="p-4 border-b border-white/10 shrink-0 bg-white/[0.01]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Live Chat Moderation Room</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-green-500/10 border border-green-500/25 text-green-400 font-bold uppercase rounded-full tracking-wide">Synced</span>
                  <button
                    onClick={handleClearAllChats}
                    className="p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-lg transition"
                    title="Clear All Chats"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsChatMinimized(true)}
                    className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                    title="Minimize Chat Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Chat Segment Filters Grid */}
            <div className="grid grid-cols-4 gap-1 p-0.5 bg-black/40 rounded-xl border border-white/5 shrink-0 text-center text-[10px]">
              <button 
                onClick={() => setChatFilter('all')}
                className={`py-1.5 rounded-lg font-bold transition cursor-pointer truncate ${chatFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
              >
                All
              </button>
              <button 
                onClick={() => setChatFilter('real')}
                className={`py-1.5 rounded-lg font-bold transition cursor-pointer truncate ${chatFilter === 'real' ? 'bg-green-600 text-white' : 'text-zinc-500 hover:text-green-400/90 hover:bg-white/[0.02]'}`}
                title="Real Student Queries"
              >
                Students
              </button>
              <button 
                onClick={() => setChatFilter('ai')}
                className={`py-1.5 rounded-lg font-bold transition cursor-pointer truncate ${chatFilter === 'ai' ? 'bg-indigo-500/50 text-white' : 'text-zinc-500 hover:text-indigo-400/95 hover:bg-white/[0.02]'}`}
                title="AI Copilot Replies"
              >
                AI Co-Pilot
              </button>
              <button 
                onClick={() => setChatFilter('auto')}
                className={`py-1.5 rounded-lg font-bold transition cursor-pointer truncate ${chatFilter === 'auto' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'}`}
                title="Simulated engagement loop messages"
              >
                Auto Loop
              </button>
            </div>
          </div>

          {/* Chat list timeline */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/5 scroll-smooth"
            style={{ height: '360px', minHeight: '300px' }}
          >
            {filteredChats.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                <MessageSquare className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No matching comments</p>
                <p className="text-[10px] text-zinc-600 mt-1 max-w-xs leading-normal">Comments from students, trainers, or engagement loops will pop up in real-time.</p>
              </div>
            ) : (
              slicedChats.map((msg) => {
                const isEditing = editingChatId === msg.id;

                let tagLabel = 'Auto';
                let tagColor = 'text-zinc-500 bg-zinc-500/10 border-zinc-500/15';
                if (msg.type === 'real') {
                  tagLabel = 'Student';
                  tagColor = 'text-green-400 bg-green-500/10 border-green-500/20';
                } else if (msg.type === 'ai') {
                  tagLabel = 'Assistant AI';
                  tagColor = 'text-indigo-400 bg-indigo-500/15 border-indigo-500/20';
                } else if (msg.type === 'admin') {
                  tagLabel = 'Trainer Ma\'am';
                  tagColor = 'text-purple-400 bg-purple-500/15 border-purple-500/20 font-black';
                }

                return (
                  <div key={msg.id} className="group flex flex-col space-y-1.5 p-3.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition shadow-sm relative">
                    
                    {/* Message Meta Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-[8px] font-black tracking-widest uppercase border rounded font-mono ${tagColor}`}>
                          {tagLabel}
                        </span>
                        <span className="text-xs font-bold text-zinc-100 truncate max-w-[130px]">{msg.name}</span>
                        <span className="text-[9px] text-zinc-500 font-mono scale-[0.9]">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      {/* Moderation Actions Edit/Delete on Hover / Admin View */}
                      <div className="flex items-center gap-1.5 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        {msg.type === 'real' && (
                          <>
                            <button 
                              onClick={() => {
                                setReplyToChat(msg);
                                setChatInput(`@${msg.name} `);
                              }}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition shrink-0 cursor-pointer text-[10px] font-bold"
                              title="Reply to student comment"
                            >
                              Reply
                            </button>
                            {!msg.aiReplied && !msg.adminReplied && (
                              <button 
                                onClick={async () => {
                                  try {
                                    if (sessionId) {
                                      const chatRef = doc(db, 'sessions', sessionId, 'chats', msg.id);
                                      await updateDoc(chatRef, { triggerAiReply: true });
                                    }
                                  } catch (err) {
                                    console.error("Failed to trigger AI reply:", err);
                                  }
                                }}
                                className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-lg transition shrink-0 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                                title="Trigger AI to auto-reply to this question"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>AI Reply</span>
                              </button>
                            )}
                          </>
                        )}
                        {!isEditing && (
                          <button 
                            onClick={() => handleStartEdit(msg.id, msg.text)}
                            className="p-1 hover:bg-indigo-500/20 border border-white/5 text-zinc-400 hover:text-indigo-400 rounded-lg transition shrink-0 cursor-pointer"
                            title="Edit message text"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteChat(msg.id)}
                          className="p-1 hover:bg-rose-500/20 border border-white/5 text-zinc-400 hover:text-rose-400 rounded-lg transition shrink-0 cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Chat Bubble / Edit text body */}
                    {isEditing ? (
                      <div className="space-y-2 pt-1 font-sans">
                        <textarea
                          rows={2}
                          value={editInputText}
                          onChange={(e) => setEditInputText(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-black/45 border border-indigo-500/45 text-white text-xs font-medium rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button 
                            onClick={() => setEditingChatId(null)}
                            className="px-2.5 py-1 bg-zinc-800 border border-white/5 hover:bg-zinc-700 text-zinc-300 text-[10px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                          <button 
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-2.5 py-1 bg-green-600/30 border border-green-500/40 hover:bg-green-600 text-green-50 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save edits</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 mt-0.5 break-words">
                        {renderTextWithLinks(msg.text)}
                      </p>
                    )}

                    {/* Connected parent warning for thread accuracy */}
                    {msg.parentId && (
                      <div className="mt-1 text-[9px] text-indigo-400/80 font-semibold font-mono border-l-2 border-indigo-500/30 pl-1.5 bg-indigo-500/[0.02] py-0.5 rounded">
                        REPLYING DIRECT TO STUDENT QUESTION
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Direct Reply Status Header bar if replyToChat active */}
          {replyToChat && (
            <div className="mx-3 mt-1.5 p-2 bg-[#ad1457]/10 border border-[#ad1457]/25 rounded-xl flex items-center justify-between animate-fade-in shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-[#ff80ab] font-bold uppercase tracking-wider">Replying to {replyToChat.name}'s doubt:</span>
                <span className="text-[10px] text-zinc-300 truncate italic">{replyToChat.text}</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setReplyToChat(null);
                  setChatInput('');
                }}
                className="p-1 hover:bg-white/5 rounded text-[#ff80ab] hover:text-white transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Broadcast Output input block */}
          <form onSubmit={handleAdminSendChat} className="p-3 bg-[#0a061b] border-t border-white/10 shrink-0 flex items-center space-x-2">
            <input 
              type="text"
              required
              placeholder={replyToChat ? `Reply to ${replyToChat.name}...` : "Broadcast as Trainer..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 text-xs sm:text-sm text-white"
            />
            <button 
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-40 shrink-0"
              title="Broadcast message to chatroom"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </section>
        )}

        {/* PANEL 3: Registered Student Management Suite */}
        <section className={`${isChatMinimized ? '' : 'lg:col-span-4'} bg-[#0a061b]/50 border border-white/10 rounded-2xl flex flex-col overflow-hidden`}>
          
          <div className="p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white tracking-widest uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Attendees & Registered Cards</span>
              </span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-full">
                {filteredStudents.length} Students
              </span>
            </div>

            {/* Quick search panel */}
            <div className="relative bg-black/45 border border-white/5 rounded-xl flex items-center px-3">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input 
                type="text"
                placeholder="Search Student ID, name, email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent px-2.5 py-1.5 focus:outline-none text-xs text-white"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-zinc-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Attendees table scroll panel */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {filteredStudents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-zinc-600 mb-2" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">No attendees found</p>
                <p className="text-[10px] text-zinc-650 mt-1 max-w-xs">No registration conforms to search query filter.</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const status = getStudentStatus(student);
                const showPassword = visiblePasswords[student.studentId] || false;

                return (
                  <div 
                    key={student.id} 
                    className={`p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition flex flex-col gap-3 relative overflow-hidden ${
                      student.status === 'blocked' ? 'opacity-40 border-dashed border-red-500/20' : ''
                    }`}
                  >
                    
                    {/* Student Status & Head meta block */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-100 flex items-center justify-center font-bold text-xs shrink-0 select-none border border-white/10 uppercase">
                          {student.name.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white leading-tight tracking-wide">{student.name}</h4>
                          <span className="text-[9px] font-mono text-indigo-400 font-extrabold tracking-widest leading-none block mt-0.5">
                            ID: {student.studentId}
                          </span>
                        </div>
                      </div>

                      {/* Online/Offline blinking status dot */}
                      <span className={`px-2 py-0.5 text-[8px] font-bold border rounded-full tracking-wide shrink-0 ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Meta info details block */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 bg-black/35 p-2.5 rounded-xl border border-white/5 text-[10px] font-sans">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Accrued Watch duration</span>
                        <span className="text-zinc-200 font-extrabold font-mono flex items-center gap-1 mt-0.5">
                          <Activity className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{formatWatchTime(student.watchingTimeSeconds)}</span>
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Device Authorized status</span>
                        <span className="text-zinc-200 font-bold font-sans truncate tracking-wider flex items-center gap-1 mt-0.5" title={student.deviceId || 'No fingerprint registered yet'}>
                          <Smartphone className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-[85px]">
                            {student.deviceId ? student.deviceId.slice(0, 10) + '...' : 'Reset / Available'}
                          </span>
                        </span>
                      </div>

                      <div className="flex flex-col mt-1.5">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Mobile Contact</span>
                        <span className="text-zinc-300 font-mono font-medium truncate tracking-wide mt-0.5">{student.mobile || 'N/A'}</span>
                      </div>

                      <div className="flex flex-col mt-1.5 relative group">
                        <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Active Password</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[#6366f1] font-mono font-black tracking-widest">
                            {showPassword ? student.password : '••••••'}
                          </span>
                          <button 
                            onClick={() => togglePasswordVisibility(student.studentId)}
                            className="text-zinc-500 hover:text-white shrink-0 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Single device model tag / User agent extracted details */}
                    {student.deviceInfo && (
                      <p className="text-[9px] text-zinc-500 font-mono leading-relaxed px-1 border-l border-white/10 italic truncate" title={student.deviceInfo}>
                        Agent: {student.deviceInfo}
                      </p>
                    )}

                    {/* Command actions panel row */}
                    <div className="flex flex-wrap items-center gap-1 px-0.5 font-sans justify-between pt-1 border-t border-white/5 uppercase">
                      <div className="flex items-center gap-1.5">
                        <a 
                          href={`${window.location.origin}/live/${student.joinToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-800 border border-white/5 hover:text-white text-[#6366f1] hover:text-indigo-400 rounded-lg transition shrink-0 cursor-pointer flex items-center justify-center animate-pulse"
                          title="Open Session Link"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button 
                          onClick={() => handleResetPassword(student)}
                          className="p-2 hover:bg-slate-800 border border-white/5 hover:text-indigo-400 text-zinc-400 rounded-lg transition shrink-0 cursor-pointer"
                          title="Regenerate random password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleResetDevice(student)}
                          className="p-2 hover:bg-slate-800 border border-white/5 hover:text-pink-400 text-zinc-400 rounded-lg transition shrink-0 cursor-pointer"
                          title="Reset hardware device lock"
                        >
                          <Smartphone className="w-3.5 h-3.5 text-zinc-400 hover:text-pink-400" />
                        </button>
                        <button 
                          onClick={() => handleToggleBlock(student)}
                          className={`p-2 border border-white/5 rounded-lg transition shrink-0 cursor-pointer ${
                            student.status === 'blocked' 
                              ? 'bg-green-500/10 hover:bg-green-600 hover:text-white text-green-400' 
                              : 'hover:bg-rose-500/15 text-zinc-400 hover:text-rose-450'
                          }`}
                          title={student.status === 'blocked' ? 'Unblock access status' : 'Block Student'}
                        >
                          {student.status === 'blocked' ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <button 
                        onClick={() => handleKickStudent(student)}
                        className="px-2.5 py-1.5 border border-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg text-[9px] font-extrabold tracking-widest transition cursor-pointer"
                        title="Evict student registration token"
                      >
                        Kick Out
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </section>

      </main>

      {isChatMinimized && (
        <button
          onClick={() => setIsChatMinimized(false)}
          className="fixed right-6 bottom-6 z-[250] flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full font-bold shadow-2xl transition duration-200 transform hover:scale-105 active:scale-95 cursor-pointer text-xs uppercase tracking-wider border border-white/20"
        >
          <MessageSquare className="w-4 h-4 animate-pulse text-indigo-300" />
          <span>Open Chat Monitor</span>
        </button>
      )}
    </div>
  );
}
